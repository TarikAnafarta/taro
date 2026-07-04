"""Structured logging setup for all Taro services.

Uses `structlog` with JSON rendering so logs are easily consumed by
log aggregation systems (ELK, Loki, etc.).
"""

from __future__ import annotations

import logging
import sys
import uuid
from contextvars import ContextVar
from typing import Any

import structlog

# Context variable holding the current correlation ID for request tracing.
_correlation_id: ContextVar[str] = ContextVar("correlation_id", default="")


def set_correlation_id(cid: str | None = None) -> str:
    """Set (or generate) a correlation ID for the current async context.

    Returns the correlation ID that was set.
    """
    value = cid or str(uuid.uuid4())
    _correlation_id.set(value)
    return value


def get_correlation_id() -> str:
    """Retrieve the correlation ID for the current async context."""
    return _correlation_id.get()


def _add_correlation_id(
    logger: Any, method_name: str, event_dict: dict[str, Any]
) -> dict[str, Any]:
    """Structlog processor that injects the correlation ID into every log line."""
    cid = _correlation_id.get()
    if cid:
        event_dict["correlation_id"] = cid
    return event_dict


def _add_service_name(service_name: str):
    """Return a structlog processor that stamps every log with the service name."""

    def processor(
        logger: Any, method_name: str, event_dict: dict[str, Any]
    ) -> dict[str, Any]:
        event_dict["service"] = service_name
        return event_dict

    return processor


def setup_logging(service_name: str = "taro", log_level: str = "info") -> None:
    """Configure structlog and stdlib logging for a Taro service.

    Call once at service startup::

        setup_logging("ai-gateway", settings.LOG_LEVEL)

    Args:
        service_name: Identifier stamped on every log line.
        log_level: Python log level name (``debug``, ``info``, …).
    """
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    # Configure stdlib root logger so libraries emit via structlog too.
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=numeric_level,
        force=True,
    )

    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        _add_service_name(service_name),
        _add_correlation_id,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Also set a formatter on the root handler so stdlib loggers render JSON.
    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.JSONRenderer(),
        ],
    )
    for handler in logging.root.handlers:
        handler.setFormatter(formatter)


def get_logger(name: str = __name__) -> structlog.stdlib.BoundLogger:
    """Return a bound structlog logger.

    Args:
        name: Logger name (usually ``__name__``).
    """
    return structlog.get_logger(name)
