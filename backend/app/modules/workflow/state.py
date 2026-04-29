"""Single source of truth for paper workflow status."""
from enum import StrEnum


class PaperStatus(StrEnum):
    DISCOVERED = "discovered"
    FETCHING_PDF = "fetching_pdf"
    AWAITING_UPLOAD = "awaiting_upload"
    PARSING = "parsing"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    SUMMARIZING = "summarizing"
    READY = "ready"
    FAILED = "failed"


IN_FLIGHT = {PaperStatus.FETCHING_PDF, PaperStatus.PARSING, PaperStatus.SUMMARIZING}
TERMINAL = {
    PaperStatus.READY,
    PaperStatus.AWAITING_UPLOAD,
    PaperStatus.AWAITING_CONFIRMATION,
    PaperStatus.FAILED,
}


def is_in_flight(status: str) -> bool:
    return status in IN_FLIGHT


def is_terminal(status: str) -> bool:
    return status in TERMINAL
