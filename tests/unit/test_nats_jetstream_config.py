from __future__ import annotations

import importlib
import importlib.util
import sys
from contextlib import suppress
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
CAMPAIGN_APP_DIR = REPO_ROOT / "apps" / "campaign-api" / "app"
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


def test_campaign_publisher_defaults_to_jetstream_with_durable_stream(campaign_module) -> None:
    publisher = campaign_module.NatsMessagePublisher("nats://localhost:4222")

    assert publisher.config.stream == "CAMPAIGN_MESSAGES"
    assert publisher.config.subject == "messages.dispatch"
    assert publisher.config.use_jetstream is True


def test_campaign_publisher_can_opt_out_of_jetstream_for_legacy_local_mode(campaign_module) -> None:
    publisher = campaign_module.NatsMessagePublisher(
        "nats://localhost:4222",
        use_jetstream=False,
    )

    assert publisher.config.use_jetstream is False


def test_campaign_queue_provider_can_select_sqs(campaign_module) -> None:
    publisher = campaign_module.publisher_from_env(
        {
            "QUEUE_PROVIDER": "sqs",
            "SQS_BROADCAST_QUEUE_URL": "https://sqs.us-west-2.amazonaws.com/123/queue",
            "AWS_REGION": "us-west-2",
        }
    )

    assert isinstance(publisher, campaign_module.SqsMessagePublisher)
    assert publisher.config.queue_url.endswith("/queue")
    assert publisher.config.region_name == "us-west-2"


@pytest.mark.asyncio
async def test_sqs_publisher_batches_message_jobs(campaign_module) -> None:
    class FakeSqsClient:
        def __init__(self) -> None:
            self.batches = []

        def send_message_batch(self, **kwargs):
            self.batches.append(kwargs)
            return {"Successful": [{"Id": entry["Id"]} for entry in kwargs["Entries"]]}

    client = FakeSqsClient()
    rows = campaign_module.build_message_rows(
        "campaign-1",
        [f"+1555000{index:03d}" for index in range(12)],
        "hello",
    )

    await campaign_module.publish_message_jobs_to_sqs(
        "https://sqs.us-west-2.amazonaws.com/123/queue",
        rows,
        client=client,
    )

    assert [len(batch["Entries"]) for batch in client.batches] == [10, 2]
    assert client.batches[0]["QueueUrl"].endswith("/queue")


def test_dispatcher_consumer_defaults_to_jetstream_durable_consumer(dispatcher_module) -> None:
    config = dispatcher_module.nats_consumer_config_from_env({})

    assert config.stream == "CAMPAIGN_MESSAGES"
    assert config.subject == "messages.dispatch"
    assert config.durable == "dispatcher"
    assert config.use_jetstream is True


def test_dispatcher_queue_provider_can_select_sqs(dispatcher_module) -> None:
    config = dispatcher_module.sqs_consumer_config_from_env(
        {
            "QUEUE_PROVIDER": "sqs",
            "SQS_BROADCAST_QUEUE_URL": "https://sqs.us-west-2.amazonaws.com/123/main",
            "SQS_RETRY_QUEUE_URL": "https://sqs.us-west-2.amazonaws.com/123/retry",
            "SQS_DEAD_LETTER_QUEUE_URL": "https://sqs.us-west-2.amazonaws.com/123/dlq",
            "AWS_REGION": "us-west-2",
        }
    )

    assert dispatcher_module.queue_provider_from_env({"QUEUE_PROVIDER": "sqs"}) == "sqs"
    assert config.queue_url.endswith("/main")
    assert config.retry_queue_url.endswith("/retry")
    assert config.dead_letter_queue_url.endswith("/dlq")
    assert config.region_name == "us-west-2"
