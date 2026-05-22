from __future__ import annotations

import os
from collections.abc import Mapping
from typing import Any

from opentelemetry import propagate, trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import Tracer

_TRACE_CONFIGURED = False
_HTTPX_INSTRUMENTED = False


def otel_endpoint_from_env(env: Mapping[str, str] | None = None) -> str | None:
    source = os.environ if env is None else env
    endpoint = source.get("OTEL_EXPORTER_OTLP_ENDPOINT")
    return endpoint.strip() if endpoint and endpoint.strip() else None


def configure_tracing(service_name: str, env: Mapping[str, str] | None = None) -> None:
    """Configure OTLP tracing when an exporter endpoint is provided."""

    global _TRACE_CONFIGURED, _HTTPX_INSTRUMENTED
    endpoint = otel_endpoint_from_env(env)
    if not endpoint or _TRACE_CONFIGURED:
        return

    provider = TracerProvider(resource=Resource.create({"service.name": service_name}))
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint)))
    trace.set_tracer_provider(provider)
    _TRACE_CONFIGURED = True

    if not _HTTPX_INSTRUMENTED:
        try:
            from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        except ModuleNotFoundError:
            return
        HTTPXClientInstrumentor().instrument()
        _HTTPX_INSTRUMENTED = True


def instrument_fastapi_app(app: Any, service_name: str) -> None:
    configure_tracing(service_name)
    FastAPIInstrumentor.instrument_app(app, excluded_urls="/healthz,/readyz,/metrics")


def get_tracer(name: str) -> Tracer:
    return trace.get_tracer(name)


def inject_trace_context(
    payload: Mapping[str, Any],
    traceparent: str | None = None,
) -> dict[str, Any]:
    """Return a copy of payload with W3C trace context metadata attached."""

    carrier: dict[str, str] = {}
    if traceparent:
        carrier["traceparent"] = traceparent
    else:
        propagate.inject(carrier)
    copied = dict(payload)
    if carrier:
        copied["trace_context"] = carrier
    return copied


def extract_trace_context(payload: Mapping[str, Any]) -> dict[str, str]:
    raw_context = payload.get("trace_context")
    if not isinstance(raw_context, Mapping):
        return {}
    return {str(key): str(value) for key, value in raw_context.items()}


def context_from_payload(payload: Mapping[str, Any]) -> Any:
    return propagate.extract(extract_trace_context(payload))
