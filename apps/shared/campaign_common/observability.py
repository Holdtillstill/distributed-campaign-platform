from __future__ import annotations

import inspect
from collections.abc import Awaitable, Callable

from fastapi import HTTPException
from opentelemetry import trace
from prometheus_client import CollectorRegistry, Info, generate_latest
from prometheus_client.exposition import CONTENT_TYPE_LATEST
from starlette.responses import Response

ReadinessCheck = Callable[[], bool | Awaitable[bool]]


def metric_prefix_for_service(service_name: str) -> str:
    return service_name.replace("-", "_")


def add_platform_endpoints(
    app,
    *,
    service_name: str,
    readiness_check: ReadinessCheck | None = None,
) -> None:
    """Add Kubernetes readiness and Prometheus scrape endpoints to a FastAPI app."""
    metric_prefix = metric_prefix_for_service(service_name)
    registry = CollectorRegistry()
    service_info = Info(
        f"{metric_prefix}_service",
        "Static service metadata for the distributed campaign platform.",
        registry=registry,
    )
    service_info.info({"service": metric_prefix})

    @app.get("/readyz")
    async def readyz() -> dict[str, str]:
        if readiness_check is not None:
            try:
                result = readiness_check()
                if inspect.isawaitable(result):
                    result = await result
            except Exception as exc:
                raise HTTPException(
                    status_code=503,
                    detail={"status": "not_ready", "service": service_name},
                ) from exc
            if not result:
                raise HTTPException(
                    status_code=503,
                    detail={"status": "not_ready", "service": service_name},
                )
        return {"status": "ready", "service": service_name}

    @app.get("/metrics")
    def metrics() -> Response:
        return Response(generate_latest(registry), media_type=CONTENT_TYPE_LATEST)

    @app.get("/observability/trace-smoke")
    def trace_smoke() -> dict[str, bool | str | None]:
        tracer = trace.get_tracer(f"{service_name}.observability")
        with tracer.start_as_current_span("observability.trace_smoke") as span:
            context = span.get_span_context()
            return {
                "status": "ok",
                "service": service_name,
                "trace_id": f"{context.trace_id:032x}" if context.is_valid else None,
                "span_id": f"{context.span_id:016x}" if context.is_valid else None,
                "sampled": bool(context.trace_flags & trace.TraceFlags.SAMPLED),
            }
