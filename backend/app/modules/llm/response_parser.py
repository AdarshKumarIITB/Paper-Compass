import json
import re


def parse_json_response(raw: str) -> dict:
    """Parse a JSON object from an LLM response, handling common formatting issues."""
    # Strip markdown code fences
    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", raw.strip())
    cleaned = re.sub(r"\n?```\s*$", "", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try to extract JSON object from the response
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Fallback: return raw text as explanation
    return {
        "explanationText": raw,
        "glossary": [],
        "unfamiliarTerms": [],
        "visualCaption": None,
    }
