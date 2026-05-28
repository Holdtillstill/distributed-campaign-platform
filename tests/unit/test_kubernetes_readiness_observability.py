from __future__ import annotations

import importlib
import importlib.util
import sys
from contextlib import suppress
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[2]
CAMPAIGN_APP_DIR = REPO_ROOT / "apps" / "campaign-api" / "app"
PROVIDER_APP_DIR = REPO_ROOT / "apps" / "provider-simulator" / "app"
DISPATCHER_MAIN = REPO_ROOT / "apps" / "dispatcher" / "app" / "main.py"


@pytest.fixture()
def campaign_module():
    sys.path.insert(0, str(CAMPAIGN_APP_DIR))
    sys.modules.pop("main", None)
    sys.modules.pop("db", None)
    try:
        yield importlib.import_module("main")
    finally:
        sys.modules.pop("main", None)
        sys.modules.pop("db", None)
        with suppress(ValueError):
            sys.path.remove(str(CAMPAIGN_APP_DIR))


@pytest.fixture()
def provider_module():
    sys.path.insert(0, str(PROVIDER_APP_DIR))
    sys.modules.pop("main", None)
    try:
        yield importlib.import_module("main")
    finally:
        sys.modules.pop("main", None)
        with suppress(ValueError):
            sys.path.remove(str(PROVIDER_APP_DIR))


@pytest.fixture()
def dispatcher_module():
    spec = importlib.util.spec_from_file_location("dispatcher_app_main", DISPATCHER_MAIN)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["dispatcher_app_main"] = module
    try:
        spec.loader.exec_module(module)
        yield module
    finally:
        sys.modules.pop("dispatcher_app_main", None)


@pytest.mark.parametrize(
    "module_fixture,service_name",
    [
        ("campaign_module", "campaign-api"),
        ("provider_module", "provider-simulator"),
        ("dispatcher_module", "dispatcher"),
    ],
)
def test_services_expose_kubernetes_readyz(request, module_fixture: str, service_name: str) -> None:
    module = request.getfixturevalue(module_fixture)
    client = TestClient(module.app)

    response = client.get("/readyz")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "service": service_name}


@pytest.mark.parametrize(
    "module_fixture,service_name",
    [
        ("campaign_module", "campaign_api"),
        ("provider_module", "provider_simulator"),
        ("dispatcher_module", "dispatcher"),
    ],
)
def test_services_expose_prometheus_metrics(
    request,
    module_fixture: str,
    service_name: str,
) -> None:
    module = request.getfixturevalue(module_fixture)
    client = TestClient(module.app)

    response = client.get("/metrics")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert f'{service_name}_service_info{{service="{service_name}"}} 1.0' in response.text


@pytest.mark.parametrize(
    "module_fixture,service_name",
    [
        ("campaign_module", "campaign-api"),
        ("provider_module", "provider-simulator"),
        ("dispatcher_module", "dispatcher"),
    ],
)
def test_services_expose_trace_smoke_endpoint(
    request,
    module_fixture: str,
    service_name: str,
) -> None:
    module = request.getfixturevalue(module_fixture)
    client = TestClient(module.app)

    response = client.get("/observability/trace-smoke")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == service_name
    assert "trace_id" in body
    assert "span_id" in body
    assert isinstance(body["sampled"], bool)
