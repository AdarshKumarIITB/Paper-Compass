from dataclasses import dataclass, field

from lxml import etree

NS = {"tei": "http://www.tei-c.org/ns/1.0"}


@dataclass
class ParsedSection:
    title: str
    text: str
    order: int


@dataclass
class ParsedPaper:
    title: str = ""
    authors: list[str] = field(default_factory=list)
    abstract: str = ""
    year: int = 0
    sections: list[ParsedSection] = field(default_factory=list)


def _text_content(el) -> str:
    """Recursively extract all text from an element, stripping tags."""
    return "".join(el.itertext()).strip()


def _extract_title(root) -> str:
    # Prefer the title with type="main" (GROBID convention)
    el = root.find(".//tei:teiHeader//tei:titleStmt/tei:title[@type='main']", NS)
    if el is not None:
        return _text_content(el)
    # Fallback: first title in the analytic section of the bib header
    el = root.find(".//tei:teiHeader//tei:sourceDesc//tei:biblStruct//tei:title[@type='main']", NS)
    if el is not None:
        return _text_content(el)
    # Last resort: any title in titleStmt
    el = root.find(".//tei:teiHeader//tei:titleStmt/tei:title", NS)
    return _text_content(el) if el is not None else ""


def _extract_authors(root) -> list[str]:
    authors = []
    for author_el in root.findall(
        ".//tei:teiHeader//tei:sourceDesc//tei:author", NS
    ):
        persname = author_el.find("tei:persName", NS)
        if persname is not None:
            parts = []
            for tag in ("tei:forename", "tei:surname"):
                for el in persname.findall(tag, NS):
                    if el.text:
                        parts.append(el.text.strip())
            if parts:
                authors.append(" ".join(parts))
    return authors


def _extract_abstract(root) -> str:
    abstract_el = root.find(".//tei:teiHeader//tei:profileDesc/tei:abstract", NS)
    if abstract_el is None:
        return ""
    paragraphs = abstract_el.findall(".//tei:p", NS)
    if paragraphs:
        return "\n\n".join(_text_content(p) for p in paragraphs)
    return _text_content(abstract_el)


def _extract_year(root) -> int:
    date_el = root.find(
        ".//tei:teiHeader//tei:sourceDesc//tei:biblStruct//tei:date[@type='published']", NS
    )
    if date_el is not None:
        when = date_el.get("when", "")
        if when and len(when) >= 4:
            try:
                return int(when[:4])
            except ValueError:
                pass
    return 0


def _extract_sections(root) -> list[ParsedSection]:
    body = root.find(".//tei:text/tei:body", NS)
    if body is None:
        return []

    sections: list[ParsedSection] = []
    order = 0

    def _process_div(div_el, parent_title: str = ""):
        nonlocal order
        head = div_el.find("tei:head", NS)
        if head is not None:
            n = head.get("n", "")
            title = f"{n} {_text_content(head)}".strip() if n else _text_content(head)
        else:
            title = ""

        if parent_title and title:
            full_title = f"{parent_title} — {title}"
        elif title:
            full_title = title
        else:
            full_title = parent_title

        # Collect paragraph text at this div level
        paragraphs = []
        for child in div_el:
            if child.tag == f"{{{NS['tei']}}}p":
                text = _text_content(child)
                if text:
                    paragraphs.append(text)

        # Check for nested divs
        sub_divs = div_el.findall("tei:div", NS)
        if sub_divs:
            # If there's text before the sub-divs, add it as a section
            if paragraphs:
                order += 1
                sections.append(ParsedSection(
                    title=full_title or f"Section {order}",
                    text="\n\n".join(paragraphs),
                    order=order,
                ))
            for sub_div in sub_divs:
                _process_div(sub_div, full_title)
        else:
            if paragraphs:
                order += 1
                sections.append(ParsedSection(
                    title=full_title or f"Section {order}",
                    text="\n\n".join(paragraphs),
                    order=order,
                ))

    for div in body.findall("tei:div", NS):
        _process_div(div)

    return sections


def parse_tei_xml(xml_string: str) -> ParsedPaper:
    root = etree.fromstring(xml_string.encode("utf-8"))
    return ParsedPaper(
        title=_extract_title(root),
        authors=_extract_authors(root),
        abstract=_extract_abstract(root),
        year=_extract_year(root),
        sections=_extract_sections(root),
    )
