from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import Any

import pytest
from prometheus_client import generate_latest

REPO_ROOT = Path(__file__).resolve().parents[2]
DISPATCHER_MAIN = REPO_ROOT / "apps" / "dispatcher" / "app" / "main.py"


@pytest.fixture()
def dispatcher_module():
    spec = importlib.util.spec_from_file_location("dispatcher_app_main_retry", DISPATCHER_MAIN)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["dispatcher_app_main_retry"] = module
    try:
        spec.loader.exec_module(module)
        yield module
    finally:
        sys.modules.pop("dispatcher_app_main_retry", None)


def test_transient_provider_errors_are_retried_before_max_attempts(dispatcher_module) -> None:
    result = dispatcher_module.ProviderResult(http_status=429, accepted=False)

    outcome = dispatcher_module.dispatch_outcome_from_provider_result(
        result,
        retry_count=0,
        max_attempts=3,
    )

    assert outcome.status == "retried"
    assert outcome.should_retry is True
    assert outcome.retry_count == 1
    assert outcome.should_dead_letter is False


def test_transient_provider_errors_are_dead_lettered_after_max_attempts(dispatcher_module) -> None:
    result = dispatcher_module.ProviderResult(http_status=503, accepted=False)

    outcome = dispatcher_module.dispatch_outcome_from_provider_result(
        result,
        retry_count=2,
        max_attempts=3,
    )

    assert outcome.status == "dead_lettered"
    assert outcome.should_retry is False
    assert outcome.retry_count == 3
    assert outcome.should_dead_letter is True


def test_retry_job_payload_increments_retry_count(dispatcher_module) -> None:
    job = dispatcher_module.MessageJob(
        message_id="message-1",
        campaign_id="campaign-1",
        recipient="+155****1001",
        body="hello",
        idempotency_key="idem-1",
        channel="sms",
        retry_count=1,
    )

    payload = dispatcher_module.retry_job_payload(job, retry_count=2)

    assert payload == {
        "message_id": "message-1",
        "campaign_id": "campaign-1",
        "recipient": "+155****1001",
        "body": "hello",
        "idempotency_key": "idem-1",
        "channel": "sms",
        "retry_count": 2,
    }


@pytest.mark.asyncio()
async def test_dispatch_message_publishes_retry_job_for_transient_failure(
    dispatcher_module,
) -> None:
    job = dispatcher_module.MessageJob(
        message_id="message-retry",
        campaign_id="campaign-1",
        recipient="+155****1001",
        body="hello",
        idempotency_key="idem-retry",
        channel="sms",
        retry_count=0,
    )
    updates: list[tuple[str, str]] = []
    retry_jobs: list[dict[str, Any]] = []
    dead_letters: list[dict[str, Any]] = []

    async def send_to_provider(provider_job):
        assert provider_job == job
        return dispatcher_module.ProviderResult(http_status=429, accepted=False)

    async def update_status(message_id: str, status: str) -> None:
        updates.append((message_id, status))

    async def publish_retry(payload: dict[str, Any]) -> None:
        retry_jobs.append(payload)

    async def publish_dead_letter(payload: dict[str, Any]) -> None:
        dead_letters.append(payload)

    status = await dispatcher_module.dispatch_message(
        job,
        send_to_provider,
        update_status,
        max_attempts=3,
        publish_retry=publish_retry,
        publish_dead_letter=publish_dead_letter,
    )

    assert status == "retried"
    assert updates == [("message-retry", "retried")]
    assert retry_jobs == [dispatcher_module.retry_job_payload(job, retry_count=1)]
    assert dead_letters == []
    metrics = generate_latest(dispatcher_module.metrics.registry).decode()
    assert "dispatcher_dispatcher_message_duration_seconds_bucket" in metrics
    assert 'status="retried"' in metrics


@pytest.mark.asyncio()
async def test_dispatch_message_publishes_dead_letter_after_retry_budget(dispatcher_module) -> None:
    job = dispatcher_module.MessageJob(
        message_id="message-dead-letter",
        campaign_id="campaign-1",
        recipient="+155****1001",
        body="hello",
        idempotency_key="idem-dead",
        channel="sms",
        retry_count=2,
    )
    updates: list[tuple[str, str]] = []
    retry_jobs: list[dict[str, Any]] = []
    dead_letters: list[dict[str, Any]] = []

    async def send_to_provider(provider_job):
        assert provider_job == job
        return dispatcher_module.ProviderResult(http_status=500, accepted=False)

    async def update_status(message_id: str, status: str) -> None:
        updates.append((message_id, status))

    async def publish_retry(payload: dict[str, Any]) -> None:
        retry_jobs.append(payload)

    async def publish_dead_letter(payload: dict[str, Any]) -> None:
        dead_letters.append(payload)

    status = await dispatcher_module.dispatch_message(
        job,
        send_to_provider,
        update_status,
        max_attempts=3,
        publish_retry=publish_retry,
        publish_dead_letter=publish_dead_letter,
    )

    assert status == "dead_lettered"
    assert updates == [("message-dead-letter", "dead_lettered")]
    assert retry_jobs == []
    assert dead_letters == [dispatcher_module.retry_job_payload(job, retry_count=3)]
