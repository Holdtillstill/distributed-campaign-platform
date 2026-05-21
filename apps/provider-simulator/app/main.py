from __future__ import annotations

import asyncio
import os
import random
from collections.abc import Mapping
from dataclasses import dataclass
from uuid import uuid4

from campaign_common.logging import configure_logging, get_logger
from fastapi import FastAPI
from pydantic import BaseModel, Field
from starlette.responses import JSONResponse

VALID_PROVIDER_MODES = {"success", "rate_limit", "server_error", "flaky"}

configure_logging("provider-simulator")
logger = get_logger(__name__)


class SendRequest(BaseModel):
    message_id: str = Field(min_length=1)
    recipient: str = Field(min_length=1)
    body: str = Field(min_length=1)
    channel: str = "sms"


class SendResponse(BaseModel):
    provider_message_id: str | None
    message_id: str
    status: str
    reason: str | None = None


@dataclass(frozen=True)
class ProviderSettings:
    mode: str = "success"
    latency_ms: int = 0
    failure_rate: float = 0.0

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> ProviderSettings:
        source = os.environ if env is None else env
        mode = source.get("PROVIDER_MODE", "success").strip().lower()
        if mode not in VALID_PROVIDER_MODES:
            allowed = ", ".join(sorted(VALID_PROVIDER_MODES))
            raise ValueError(f"PROVIDER_MODE must be one of: {allowed}")

        latency_ms = _parse_non_negative_int(
            source.get("PROVIDER_LATENCY_MS", "0"),
            "PROVIDER_LATENCY_MS",
        )
        failure_rate = _parse_failure_rate(source.get("PROVIDER_FAILURE_RATE", "0.0"))
        return cls(mode=mode, latency_ms=latency_ms, failure_rate=failure_rate)


@dataclass(frozen=True)
class SimulatedProviderResult:
    http_status: int
    body: SendResponse


app = FastAPI(title="Provider Simulator", version="0.1.0")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "provider-simulator"}


@app.post("/send")
async def send_message(request: SendRequest) -> JSONResponse:
    settings = ProviderSettings.from_env()
    if settings.latency_ms > 0:
        await asyncio.sleep(settings.latency_ms / 1000)

    result = simulate_provider_response(request, settings)
    logger.info(
        "provider_send_simulated",
        message_id=request.message_id,
        channel=request.channel,
        provider_status=result.body.status,
        http_status=result.http_status,
    )
    return JSONResponse(
        status_code=result.http_status,
        content=result.body.model_dump(exclude_none=result.body.reason is None),
    )


def simulate_provider_response(
    request: SendRequest,
    settings: ProviderSettings,
    rng_value: float | None = None,
) -> SimulatedProviderResult:
    if settings.mode == "rate_limit":
        return _failure_result(request.message_id, 429, "rate_limited")

    if settings.mode == "server_error":
        return _failure_result(request.message_id, 500, "provider_error")

    if settings.mode == "flaky":
        value = random.random() if rng_value is None else rng_value
        if value < settings.failure_rate:
            return _failure_result(request.message_id, 500, "provider_error")

    return SimulatedProviderResult(
        http_status=200,
        body=SendResponse(
            provider_message_id=f"prov_{request.message_id}_{uuid4().hex}",
            message_id=request.message_id,
            status="accepted",
        ),
    )


def _failure_result(message_id: str, http_status: int, reason: str) -> SimulatedProviderResult:
    return SimulatedProviderResult(
        http_status=http_status,
        body=SendResponse(
            provider_message_id=None,
            message_id=message_id,
            status=reason,
            reason=reason,
        ),
    )


def _parse_non_negative_int(raw_value: str, name: str) -> int:
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise ValueError(f"{name} must be a non-negative integer") from exc
    if value < 0:
        raise ValueError(f"{name} must be a non-negative integer")
    return value


def _parse_failure_rate(raw_value: str) -> float:
    try:
        value = float(raw_value)
    except ValueError as exc:
        raise ValueError("PROVIDER_FAILURE_RATE must be between 0 and 1") from exc
    if not 0.0 <= value <= 1.0:
        raise ValueError("PROVIDER_FAILURE_RATE must be between 0 and 1")
    return value
