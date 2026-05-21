from __future__ import annotations

import importlib
import importlib.util
import sys
from contextlib import suppress
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
DISPATCHER_MAIN = REPO_ROOT / "apps" / "dispatcher" / "app" / "main.py"
CAMPAIGN_APP_DIR = REPO_ROOT / "apps" / "campaign-api" / "app"


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


@pytest.mark.parametrize(
    ("http_status", "accepted", "expected"),
    [
        (200, True, "sent"),
        (202, True, "sent"),
        (429, False, "retried"),
        (500, False, "failed"),
        (503, False, "failed"),
    ],
)
def test_status_from_provider_result_maps_provider_outcomes(
    dispatcher_module,
    http_status: int,
    accepted: bool,
    expected: str,
) -> None:
    result = dispatcher_module.ProviderResult(http_status=http_status, accepted=accepted)

    assert dispatcher_module.status_from_provider_result(result) == expected


@pytest.mark.asyncio()
async def test_dispatch_message_marks_sent_after_accepted_provider_response(
    dispatcher_module,
) -> None:
    job = dispatcher_module.MessageJob(
        message_id="message-1",
        campaign_id="campaign-1",
        recipient="+155****1001",
        body="hello",
        idempotency_key="idem-1",
        channel="sms",
    )
    sent_jobs: list[Any] = []
    updates: list[tuple[str, str]] = []

    async def send_to_provider(provider_job):
        sent_jobs.append(provider_job)
        return dispatcher_module.ProviderResult(http_status=200, accepted=True)

    async def update_status(message_id: str, status: str) -> None:
        updates.append((message_id, status))

    status = await dispatcher_module.dispatch_message(job, send_to_provider, update_status)

    assert status == "sent"
    assert sent_jobs == [job]
    assert updates == [("message-1", "sent")]


@pytest.mark.asyncio()
async def test_dispatch_message_marks_retried_after_rate_limit(dispatcher_module) -> None:
    job = dispatcher_module.MessageJob(
        message_id="message-2",
        campaign_id="campaign-1",
        recipient="+155****1002",
        body="hello",
        idempotency_key="idem-2",
        channel="sms",
    )
    updates: list[tuple[str, str]] = []

    async def send_to_provider(provider_job):
        assert provider_job == job
        return dispatcher_module.ProviderResult(http_status=429, accepted=False)

    async def update_status(message_id: str, status: str) -> None:
        updates.append((message_id, status))

    status = await dispatcher_module.dispatch_message(job, send_to_provider, update_status)

    assert status == "retried"
    assert updates == [("message-2", "retried")]


@pytest.mark.asyncio()
async def test_dispatch_message_marks_failed_after_server_error(dispatcher_module) -> None:
    job = dispatcher_module.MessageJob(
        message_id="message-3",
        campaign_id="campaign-1",
        recipient="+155****1003",
        body="hello",
        idempotency_key="idem-3",
        channel="sms",
    )
    updates: list[tuple[str, str]] = []

    async def send_to_provider(provider_job):
        assert provider_job == job
        return dispatcher_module.ProviderResult(http_status=500, accepted=False)

    async def update_status(message_id: str, status: str) -> None:
        updates.append((message_id, status))

    status = await dispatcher_module.dispatch_message(job, send_to_provider, update_status)

    assert status == "failed"
    assert updates == [("message-3", "failed")]


@pytest.mark.asyncio()
async def test_dispatch_message_marks_failed_after_unexpected_exception(dispatcher_module) -> None:
    job = dispatcher_module.MessageJob(
        message_id="message-4",
        campaign_id="campaign-1",
        recipient="+155****1004",
        body="hello",
        idempotency_key="idem-4",
        channel="sms",
    )
    updates: list[tuple[str, str]] = []

    async def send_to_provider(provider_job):
        assert provider_job == job
        raise RuntimeError("provider unavailable")

    async def update_status(message_id: str, status: str) -> None:
        updates.append((message_id, status))

    status = await dispatcher_module.dispatch_message(job, send_to_provider, update_status)

    assert status == "failed"
    assert updates == [("message-4", "failed")]


def test_campaign_message_job_payload_from_row_defaults_to_sms(campaign_module) -> None:
    row = campaign_module.MessageRow(
        message_id="message-1",
        campaign_id="campaign-1",
        recipient="+155****1001",
        body="hello",
        status="queued",
        idempotency_key="idem-1",
    )

    payload = campaign_module.message_job_from_row(row)

    assert payload == {
        "message_id": "message-1",
        "campaign_id": "campaign-1",
        "recipient": "+155****1001",
        "body": "hello",
        "idempotency_key": "idem-1",
        "channel": "sms",
    }
