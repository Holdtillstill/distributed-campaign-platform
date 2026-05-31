from __future__ import annotations

import logging
import sys
from typing import Any

import structlog
from opentelemetry import trace


def add_trace_context(_, __, event_dict: dict[str, Any]) -> dict[str, Any]:
    span = trace.get_current_span()
    context = span.get_span_context()
    if context.is_valid:
        event_dict["trace_id"] = f"{context.trace_id:032x}"
        event_dict["span_id"] = f"{context.span_id:016x}"
    return event_dict


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
            add_trace_context,
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
