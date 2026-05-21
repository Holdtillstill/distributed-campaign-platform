from __future__ import annotations

from enum import StrEnum


class MessageStatus(StrEnum):
    """Lifecycle states for campaign delivery messages."""

    QUEUED = "queued"
    SENT = "sent"
    FAILED = "failed"
    RETRIED = "retried"
    DEAD_LETTERED = "dead_lettered"
