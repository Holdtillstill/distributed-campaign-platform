from __future__ import annotations

import importlib
import sys
from contextlib import suppress
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

PROVIDER_APP_DIR = Path(__file__).resolve().parents[2] / "apps" / "provider-simulator" / "app"


@pytest.fixture()
def provider_module(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("PROVIDER_MODE", raising=False)
    monkeypatch.delenv("PROVIDER_LATENCY_MS", raising=False)
    monkeypatch.delenv("PROVIDER_FAILURE_RATE", raising=False)
    sys.path.insert(0, str(PROVIDER_APP_DIR))
    sys.modules.pop("main", None)
    try:
        yield importlib.import_module("main")
    finally:
        sys.modules.pop("main", None)
        with suppress(ValueError):
            sys.path.remove(str(PROVIDER_APP_DIR))


@pytest.fixture()
def payload() -> dict[str, str]:
    return {
        "message_id": "msg-123",
        "recipient": "+15555550100",
        "body": "hello from test",
    }


def test_healthz_returns_ok(provider_module) -> None:
    client = TestClient(provider_module.app)

    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "provider-simulator"}


def test_send_success_accepts_message(provider_module, payload: dict[str, str]) -> None:
    client = TestClient(provider_module.app)

    response = client.post("/send", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["message_id"] == payload["message_id"]
    assert body["status"] == "accepted"
    assert body["provider_message_id"].startswith("prov_msg-123_")
    assert "reason" not in body or body["reason"] is None


def test_send_rate_limit_mode_returns_429(
    provider_module,
    monkeypatch: pytest.MonkeyPatch,
    payload: dict[str, str],
) -> None:
    monkeypatch.setenv("PROVIDER_MODE", "rate_limit")
    client = TestClient(provider_module.app)

    response = client.post("/send", json=payload)

    assert response.status_code == 429
    assert response.json() == {
        "message_id": "msg-123",
        "provider_message_id": None,
        "status": "rate_limited",
        "reason": "rate_limited",
    }


def test_send_server_error_mode_returns_500(
    provider_module,
    monkeypatch: pytest.MonkeyPatch,
    payload: dict[str, str],
) -> None:
    monkeypatch.setenv("PROVIDER_MODE", "server_error")
    client = TestClient(provider_module.app)

    response = client.post("/send", json=payload)

    assert response.status_code == 500
    assert response.json() == {
        "message_id": "msg-123",
        "provider_message_id": None,
        "status": "provider_error",
        "reason": "provider_error",
    }


def test_flaky_mode_is_deterministic_through_pure_simulation(
    provider_module,
    payload: dict[str, str],
) -> None:
    request = provider_module.SendRequest(**payload)
    settings = provider_module.ProviderSettings(mode="flaky", failure_rate=0.25)

    accepted = provider_module.simulate_provider_response(request, settings, rng_value=0.25)
    failed = provider_module.simulate_provider_response(request, settings, rng_value=0.24)

    assert accepted.http_status == 200
    assert accepted.body.status == "accepted"
    assert failed.http_status == 500
    assert failed.body.status == "provider_error"
    assert failed.body.reason == "provider_error"


def test_settings_parse_latency_and_failure_rate(provider_module) -> None:
    settings = provider_module.ProviderSettings.from_env(
        {
            "PROVIDER_MODE": "flaky",
            "PROVIDER_LATENCY_MS": "125",
            "PROVIDER_FAILURE_RATE": "0.75",
        }
    )

    assert settings.mode == "flaky"
    assert settings.latency_ms == 125
    assert settings.failure_rate == 0.75


def test_invalid_provider_mode_fails_fast(provider_module) -> None:
    with pytest.raises(ValueError, match="PROVIDER_MODE"):
        provider_module.ProviderSettings.from_env({"PROVIDER_MODE": "not-real"})
