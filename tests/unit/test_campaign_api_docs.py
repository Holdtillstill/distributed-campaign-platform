from __future__ import annotations

import importlib
import sys
from contextlib import suppress
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[2]
CAMPAIGN_APP_DIR = REPO_ROOT / "apps" / "campaign-api" / "app"


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


def test_direct_swagger_docs_reference_direct_openapi_schema(campaign_module) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/docs")

    assert response.status_code == 200
    assert "url: '/openapi.json'" in response.text
    assert "url: '/api/openapi.json'" not in response.text


def test_proxied_swagger_docs_reference_prefixed_openapi_schema(campaign_module) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/docs", headers={"X-Forwarded-Prefix": "/api"})

    assert response.status_code == 200
    assert "url: '/api/openapi.json'" in response.text


def test_root_path_swagger_docs_reference_prefixed_openapi_schema(campaign_module) -> None:
    client = TestClient(campaign_module.app, root_path="/api")

    response = client.get("/docs")

    assert response.status_code == 200
    assert "url: '/api/openapi.json'" in response.text


def test_openapi_schema_exposes_valid_version_metadata(campaign_module) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/openapi.json")

    assert response.status_code == 200
    body = response.json()
    assert body["openapi"].startswith("3.")
    assert body["info"]["title"] == "Campaign API"
    assert body["info"]["version"] == "0.1.0"
