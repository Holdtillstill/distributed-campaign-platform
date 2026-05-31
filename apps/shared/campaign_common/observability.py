from __future__ import annotations

import inspect
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from fastapi import HTTPException
from opentelemetry import trace
from prometheus_client import CollectorRegistry, Counter, Gauge, Histogram, Info, generate_latest
from prometheus_client.exposition import CONTENT_TYPE_LATEST
from starlette.responses import Response

ReadinessCheck = Callable[[], bool | Awaitable[bool]]
_METRICS: dict[str, PlatformMetrics] = {}


def metric_prefix_for_service(service_name: str) -> str:
    return service_name.replace("-", "_")


@dataclass(frozen=True)
class PlatformMetrics:
    registry: CollectorRegistry
    service_info: Info
    http_requests_total: Counter
    http_request_duration_seconds: Histogram
    http_requests_in_flight: Gauge
    campaigns_created_total: Counter
    campaign_messages_total: Counter
    dispatcher_messages_total: Counter
    provider_requests_total: Counter
    workflow_exceptions_total: Counter


def get_platform_metrics(service_name: str) -> PlatformMetrics:
    metric_prefix = metric_prefix_for_service(service_name)
    if metric_prefix in _METRICS:
        return _METRICS[metric_prefix]

    registry = CollectorRegistry()
    service_info = Info(
        f"{metric_prefix}_service",
        "Static service metadata for the distributed campaign platform.",
        registry=registry,
    )
    service_info.info({"service": metric_prefix})

    metrics = PlatformMetrics(
        registry=registry,
        service_info=service_info,
        http_requests_total=Counter(
            f"{metric_prefix}_http_requests_total",
            "HTTP requests handled by the service.",
            ["method", "route", "status_code"],
            registry=registry,
        ),
        http_request_duration_seconds=Histogram(
            f"{metric_prefix}_http_request_duration_seconds",
            "HTTP request duration in seconds.",
            ["method", "route", "status_code"],
            buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
            registry=registry,
        ),
        http_requests_in_flight=Gauge(
            f"{metric_prefix}_http_requests_in_flight",
            "HTTP requests currently in flight.",
            ["method"],
            registry=registry,
        ),
        campaigns_created_total=Counter(
            f"{metric_prefix}_campaigns_created_total",
            "Campaigns created by status, message type, and audience mode.",
            ["status", "message_type", "audience_mode"],
            registry=registry,
        ),
        campaign_messages_total=Counter(
            f"{metric_prefix}_campaign_messages_total",
            "Campaign messages created or queued by status and message type.",
            ["status", "message_type"],
            registry=registry,
        ),
        dispatcher_messages_total=Counter(
            f"{metric_prefix}_dispatcher_messages_total",
            "Dispatcher outcomes by terminal or retry status.",
            ["status", "retry", "dead_letter"],
            registry=registry,
        ),
        provider_requests_total=Counter(
            f"{metric_prefix}_provider_requests_total",
            "Provider calls by HTTP status and provider/application status.",
            ["http_status", "provider_status"],
            registry=registry,
        ),
        workflow_exceptions_total=Counter(
            f"{metric_prefix}_workflow_exceptions_total",
            "Workflow exceptions by operation.",
            ["operation"],
            registry=registry,
        ),
    )
    _METRICS[metric_prefix] = metrics
    return metrics


def route_label(scope: dict) -> str:
    route = scope.get("route")
    path = getattr(route, "path", None)
    if isinstance(path, str) and path:
        return path
    return "unmatched"


def add_platform_endpoints(
    app,
    *,
    service_name: str,
    readiness_check: ReadinessCheck | None = None,
) -> None:
    """Add Kubernetes readiness and Prometheus scrape endpoints to a FastAPI app."""
    platform_metrics = get_platform_metrics(service_name)

    @app.middleware("http")
    async def prometheus_http_metrics(request, call_next):
        if request.url.path == "/metrics":
            return await call_next(request)

        method = request.method
        start = time.perf_counter()
        platform_metrics.http_requests_in_flight.labels(method=method).inc()
        status_code = "500"
        try:
            response = await call_next(request)
            status_code = str(response.status_code)
            return response
        except Exception:
            platform_metrics.workflow_exceptions_total.labels(operation="http.request").inc()
            raise
        finally:
            duration = time.perf_counter() - start
            route = route_label(request.scope)
            platform_metrics.http_requests_total.labels(
                method=method,
                route=route,
                status_code=status_code,
            ).inc()
            platform_metrics.http_request_duration_seconds.labels(
                method=method,
                route=route,
                status_code=status_code,
            ).observe(duration)
            platform_metrics.http_requests_in_flight.labels(method=method).dec()

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
        return Response(generate_latest(platform_metrics.registry), media_type=CONTENT_TYPE_LATEST)

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
