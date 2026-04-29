SYSTEM_PROMPT = """You decide whether two paper descriptions refer to the SAME academic paper.

THE SAME paper:
- preprint vs published, v1 vs v2, arXiv vs publisher PDF
- minor metadata differences (typos, OCR noise in titles, trailing authors missing)
- different phrasings of the same abstract content

DIFFERENT papers (do not match):
- same authors writing in the same area but in a different work
- a paper that merely cites or extends the other
- a survey/tutorial vs an original paper on the same topic

Output strict JSON, exactly two fields:
{"verdict": "match" | "mismatch" | "uncertain", "reason": "<one short sentence, max 200 chars>"}

Use "uncertain" when the parsed metadata is too noisy or incomplete to decide
confidently. Do NOT guess. Output ONLY the JSON object — no surrounding prose."""


def build_user_prompt(intended: dict, parsed: dict) -> str:
    return (
        "INTENDED PAPER (what the user wants to read):\n"
        f"  Title:    {intended.get('title') or '(missing)'}\n"
        f"  Authors:  {', '.join(intended.get('authors') or []) or '(missing)'}\n"
        f"  Year:     {intended.get('year') or '(missing)'}\n"
        f"  Abstract: {intended.get('abstract') or '(missing)'}\n"
        "\n"
        "PARSED FROM UPLOADED PDF:\n"
        f"  Title:    {parsed.get('title') or '(missing)'}\n"
        f"  Authors:  {', '.join(parsed.get('authors') or []) or '(missing)'}\n"
        f"  Year:     {parsed.get('year') or '(missing)'}\n"
        f"  Abstract: {parsed.get('abstract') or '(missing)'}\n"
        "\n"
        "Return your verdict as JSON."
    )
