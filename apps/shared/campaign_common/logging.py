from __future__ import annotations

import logging
import sys
from typing import Any

import structlog


def configure_logging(service_name: str) -> None:
    """Configure JSON-ish structured logging for a service.

    The function is intentionally small and safe to call during service startup.
    """

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
        force=True,
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(service=service_name)


def get_logger(name: str | None = None, **context: Any) -> structlog.BoundLogger:
    """Return a structlog logger with optional bound context."""

    logger = structlog.get_logger(name)
    if context:
        return logger.bind(**context)
    return logger
