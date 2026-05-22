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


def test_dispatcher_consumer_defaults_to_jetstream_durable_consumer(dispatcher_module) -> None:
    config = dispatcher_module.nats_consumer_config_from_env({})

    assert config.stream == "CAMPAIGN_MESSAGES"
    assert config.subject == "messages.dispatch"
    assert config.durable == "dispatcher"
    assert config.use_jetstream is True
