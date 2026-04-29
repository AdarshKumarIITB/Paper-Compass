"""SVG sanitization + render to PNG via cairosvg.

Sanitization is the actual security boundary — prompt instructions to "not
include script tags" are not enough. We strip dangerous nodes/attributes
before the SVG ever touches the renderer or the browser.
"""
from __future__ import annotations

import re
from io import BytesIO

import cairosvg
from lxml import etree

SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"

_FORBIDDEN_TAGS = {"script", "foreignObject", "iframe", "object", "embed"}
_FORBIDDEN_ATTR_PREFIXES = ("on",)  # onclick, onload, etc.


class SvgRenderError(Exception):
    pass


_SVG_BLOCK = re.compile(r"<svg[\s>].*?</svg>", re.DOTALL | re.IGNORECASE)


def _extract_svg(text: str) -> str | None:
    """Tolerate prose around the SVG. Generators sometimes wrap output despite instructions."""
    if not text:
        return None
    m = _SVG_BLOCK.search(text)
    return m.group(0) if m else None


def sanitize_svg(svg: str) -> str:
    """Parse, drop dangerous elements/attributes, and serialize back."""
    try:
        # XML parser with no entity resolution — also kills XXE.
        parser = etree.XMLParser(resolve_entities=False, no_network=True)
        root = etree.fromstring(svg.encode("utf-8"), parser=parser)
    except etree.XMLSyntaxError as e:
        raise SvgRenderError(f"SVG is not well-formed XML: {e}")

    # Remove forbidden tags
    for el in list(root.iter()):
        if not isinstance(el.tag, str):
            continue  # comments / processing instructions
        local = etree.QName(el.tag).localname
        if local in _FORBIDDEN_TAGS:
            parent = el.getparent()
            if parent is not None:
                parent.remove(el)
            continue
        # Remove forbidden attributes
        for attr_name in list(el.attrib):
            local_attr = etree.QName(attr_name).localname.lower()
            if local_attr.startswith(_FORBIDDEN_ATTR_PREFIXES):
                del el.attrib[attr_name]
                continue
            # Block external href on <image> elements
            if local == "image" and local_attr == "href":
                value = el.attrib.get(attr_name, "")
                if value.startswith("http://") or value.startswith("https://"):
                    del el.attrib[attr_name]

    return etree.tostring(root, encoding="unicode")


def svg_to_png(svg: str, *, output_width: int = 800) -> bytes:
    """Render sanitized SVG to PNG bytes. Raises SvgRenderError on failure."""
    cleaned = _extract_svg(svg)
    if cleaned is None:
        raise SvgRenderError("No <svg> element found in generator output.")
    safe = sanitize_svg(cleaned)

    buf = BytesIO()
    try:
        cairosvg.svg2png(
            bytestring=safe.encode("utf-8"),
            write_to=buf,
            output_width=output_width,
        )
    except Exception as e:
        raise SvgRenderError(f"cairosvg failed to render: {e}")
    return buf.getvalue()


def safe_extract_and_sanitize(raw_generator_output: str) -> str | None:
    """Return cleaned SVG markup, or None if extraction/sanitize fails entirely."""
    extracted = _extract_svg(raw_generator_output)
    if extracted is None:
        return None
    try:
        return sanitize_svg(extracted)
    except SvgRenderError:
        return None
