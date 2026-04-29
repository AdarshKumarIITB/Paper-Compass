from app.schemas.paper import CamelModel, AuthorSchema


class CitedPaperResponse(CamelModel):
    """Matches frontend CitedPaper interface exactly."""

    id: str
    title: str
    authors: list[AuthorSchema]
    year: int
    micro_evaluation: str
