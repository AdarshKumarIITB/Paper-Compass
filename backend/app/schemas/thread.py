from typing import Literal

from app.schemas.paper import CamelModel


class ThreadMessageSchema(CamelModel):
    """Matches frontend ThreadMessage interface exactly."""

    id: str
    role: Literal["system", "user"]
    content: str
    created_at: str


class ThreadResponse(CamelModel):
    """Matches frontend Thread interface."""

    id: str
    thread_type: Literal["term", "paper"]
    term: str | None = None
    selected_text: str | None = None
    section_id: str | None = None
    messages: list[ThreadMessageSchema]
    depth_level: Literal["conceptual", "technical", "formal"]


class ThreadCreateRequest(CamelModel):
    """Term-thread create. selected_text is the literal user-highlighted substring; term
    is an optional short label (frontend may pass a truncation of selected_text)."""

    section_id: str
    selected_text: str
    term: str | None = None
    depth_level: Literal["conceptual", "technical", "formal"]


class CopilotCreateRequest(CamelModel):
    depth_level: Literal["conceptual", "technical", "formal"] = "technical"


class ThreadMessageCreateRequest(CamelModel):
    content: str
    intent: Literal["recommend"] | None = None
