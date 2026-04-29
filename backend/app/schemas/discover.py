from app.schemas.paper import CamelModel, PaperResponse


class DiscoverResponse(CamelModel):
    papers: list[PaperResponse]
