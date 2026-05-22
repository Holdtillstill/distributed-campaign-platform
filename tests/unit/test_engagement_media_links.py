from __future__ import annotations

import importlib
import sys
from contextlib import suppress
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

CAMPAIGN_APP_DIR = Path(__file__).resolve().parents[2] / "apps" / "campaign-api" / "app"
SCHEMA_PATH = CAMPAIGN_APP_DIR / "schema.sql"


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


class FakeEngagementRepository:
    def __init__(self) -> None:
        self.media_assets = [
            {
                "id": "media-1",
                "company_id": "company-1",
                "filename": "hero.png",
                "content_type": "image/png",
                "url": "https://cdn.example/hero.png",
                "created_at": "2026-05-21T00:00:00Z",
            }
        ]
        self.links = [
            {
                "id": "link-1",
                "token": "spring-token",
                "company_id": "company-1",
                "campaign_id": "campaign-1",
                "subscriber_id": "subscriber-1",
                "media_asset_id": "media-1",
                "destination_url": "https://example.com/spring",
                "public_url": "/r/spring-token",
                "click_count": 0,
                "redeemed_count": 0,
                "created_at": "2026-05-21T00:00:00Z",
            }
        ]
        self.created_media: dict[str, object] | None = None
        self.created_link: dict[str, object] | None = None
        self.click_event: dict[str, object] | None = None

    async def create_media_asset(
        self,
        *,
        company_id: str,
        filename: str,
        content_type: str,
        url: str,
    ) -> dict[str, object]:
        self.created_media = {
            "company_id": company_id,
            "filename": filename,
            "content_type": content_type,
            "url": url,
        }
        return {**self.media_assets[0], **self.created_media}

    async def list_media_assets(self, *, company_id: str) -> list[dict[str, object]]:
        return [asset for asset in self.media_assets if asset["company_id"] == company_id]

    async def create_campaign_link(
        self,
        *,
        company_id: str,
        campaign_id: str,
        subscriber_id: str | None,
        media_asset_id: str | None,
        destination_url: str | None,
    ) -> dict[str, object]:
        self.created_link = {
            "company_id": company_id,
            "campaign_id": campaign_id,
            "subscriber_id": subscriber_id,
            "media_asset_id": media_asset_id,
            "destination_url": destination_url,
        }
        return {**self.links[0], **self.created_link}

    async def list_campaign_links(self, *, company_id: str) -> list[dict[str, object]]:
        return [link for link in self.links if link["company_id"] == company_id]

    async def register_click(
        self,
        *,
        token: str,
        ip_address: str | None,
        user_agent: str | None,
    ) -> dict[str, object] | None:
        self.click_event = {"token": token, "ip_address": ip_address, "user_agent": user_agent}
        if token != "spring-token":
            return None
        return {
            "token": token,
            "destination_url": "https://example.com/spring",
            "click_count": 1,
            "campaign_name": "Spring Launch",
            "message_body": "Show this offer at checkout",
            "media_asset": self.media_assets[0],
        }

    async def redeem_link(self, *, token: str) -> dict[str, object] | None:
        if token != "spring-token":
            return None
        return {"token": token, "status": "redeemed", "redeemed_count": 1}

    async def get_campaign_performance(self, *, company_id: str) -> dict[str, int]:
        return {
            "media_asset_count": 1,
            "tracked_link_count": 1,
            "click_count": 3,
            "redemption_count": 2,
        }


@pytest.fixture()
def fake_repo(campaign_module):
    repo = FakeEngagementRepository()
    campaign_module.app.dependency_overrides[campaign_module.get_repository] = lambda: repo
    try:
        yield repo
    finally:
        campaign_module.app.dependency_overrides.clear()


def test_schema_defines_media_links_clicks_redemptions_and_indexes() -> None:
    schema = SCHEMA_PATH.read_text()

    for table in ["media_assets", "campaign_links", "click_events", "redemption_events"]:
        assert f"CREATE TABLE IF NOT EXISTS {table}" in schema

    assert "click_count INTEGER NOT NULL DEFAULT 0" in schema
    assert "redeemed_count INTEGER NOT NULL DEFAULT 0" in schema
    assert "idx_campaign_links_company_id" in schema
    assert "idx_click_events_link_created" in schema
    assert "idx_redemption_events_link_created" in schema


def test_customer_can_create_and_list_media_assets(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    create_response = client.post(
        "/companies/company-1/media-assets",
        json={
            "filename": "hero.png",
            "content_type": "image/png",
            "url": "https://cdn.example/hero.png",
        },
    )
    list_response = client.get("/companies/company-1/media-assets")

    assert create_response.status_code == 201
    assert create_response.json()["id"] == "media-1"
    assert create_response.json()["url"] == "https://cdn.example/hero.png"
    assert list_response.status_code == 200
    assert list_response.json()[0]["filename"] == "hero.png"
    assert fake_repo.created_media == {
        "company_id": "company-1",
        "filename": "hero.png",
        "content_type": "image/png",
        "url": "https://cdn.example/hero.png",
    }


def test_customer_can_create_and_list_tracked_campaign_links(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    create_response = client.post(
        "/companies/company-1/campaign-links",
        json={
            "campaign_id": "campaign-1",
            "subscriber_id": "subscriber-1",
            "media_asset_id": "media-1",
            "destination_url": "https://example.com/spring",
        },
    )
    list_response = client.get("/companies/company-1/campaign-links")

    assert create_response.status_code == 201
    assert create_response.json()["token"] == "spring-token"
    assert create_response.json()["public_url"] == "/r/spring-token"
    assert list_response.status_code == 200
    assert list_response.json()[0]["click_count"] == 0
    assert list_response.json()[0]["redeemed_count"] == 0
    assert fake_repo.created_link == {
        "company_id": "company-1",
        "campaign_id": "campaign-1",
        "subscriber_id": "subscriber-1",
        "media_asset_id": "media-1",
        "destination_url": "https://example.com/spring",
    }


def test_public_redirect_token_registers_click_and_returns_landing_payload(
    campaign_module,
    fake_repo,
) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/r/spring-token", headers={"User-Agent": "pytest-browser"})

    assert response.status_code == 200
    assert response.json() == {
        "token": "spring-token",
        "destination_url": "https://example.com/spring",
        "click_count": 1,
        "campaign_name": "Spring Launch",
        "message_body": "Show this offer at checkout",
        "media_asset": {
            "id": "media-1",
            "company_id": "company-1",
            "filename": "hero.png",
            "content_type": "image/png",
            "url": "https://cdn.example/hero.png",
            "created_at": "2026-05-21T00:00:00Z",
        },
    }
    assert fake_repo.click_event["token"] == "spring-token"
    assert fake_repo.click_event["user_agent"] == "pytest-browser"


def test_unknown_redirect_token_returns_404(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/r/unknown")

    assert response.status_code == 404
    assert response.json() == {"detail": "campaign link not found"}


def test_public_redeem_records_redemption_event(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post("/r/spring-token/redeem")

    assert response.status_code == 200
    assert response.json() == {"token": "spring-token", "status": "redeemed", "redeemed_count": 1}


def test_company_campaign_performance_returns_engagement_totals(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/companies/company-1/campaign-performance")

    assert response.status_code == 200
    assert response.json() == {
        "media_asset_count": 1,
        "tracked_link_count": 1,
        "click_count": 3,
        "redemption_count": 2,
    }
