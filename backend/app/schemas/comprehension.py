from app.schemas.paper import CamelModel


class ComprehensionStateResponse(CamelModel):
    global_depth: str
    per_section_depth: dict[str, str]
    sections_viewed: list[str]
    active_section_id: str | None = None
    comprehension_progress: int


class CalibrateRequest(CamelModel):
    default_depth: str
