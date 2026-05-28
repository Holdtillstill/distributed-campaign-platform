from __future__ import annotations

import importlib.util
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SEED_SCRIPT = REPO_ROOT / "scripts" / "local" / "seed-demo-data.py"


def load_seed_module():
    spec = importlib.util.spec_from_file_location("seed_demo_data", SEED_SCRIPT)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    try:
        spec.loader.exec_module(module)
    finally:
        sys.modules.pop(spec.name, None)
    return module


def test_demo_retail_seed_defines_large_diverse_subscriber_base() -> None:
    seed = load_seed_module()
    subscribers = seed.build_demo_subscribers()
    list_counts = Counter(subscriber.list_name for subscriber in subscribers)

    assert seed.COMPANY_ID == "52570648-211f-4cbf-8920-2157ad3953f1"
    assert len(subscribers) == 1100
    assert len(list_counts) == 7
    assert min(list_counts.values()) >= 110
    assert {
        "Portland Weekend Shoppers",
        "Seattle VIP Customers",
        "Lapsed Loyalty Members",
        "Online Cart Abandoners",
        "New Opt-ins",
        "High Value Repeat Buyers",
        "Holiday Promo Audience",
    }.issubset(list_counts)
    assert len({subscriber.phone_number for subscriber in subscribers}) == len(subscribers)
    assert all(subscriber.phone_number.startswith("+1") for subscriber in subscribers)
    assert len({subscriber.source for subscriber in subscribers}) >= 20
    assert any(subscriber.consent_status == "double_opt_in_confirmed" for subscriber in subscribers)


def test_demo_retail_seed_campaigns_create_meaningful_scheduled_reach() -> None:
    seed = load_seed_module()
    counts = seed.expected_seed_counts()

    assert counts["subscriber_count"] == 1100
    assert counts["campaign_count"] == 6
    assert counts["message_count"] == 950
    assert counts["scheduled_reach"] == 560
    assert counts["credit_cost"] == 1440
