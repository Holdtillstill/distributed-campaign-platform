from __future__ import annotations

import re
from uuid import UUID

import pytest
from campaign_common.idempotency import generate_idempotency_key

_SHA256_HEX_RE = re.compile(r"^[a-f0-9]{64}$")


def test_generate_idempotency_key_is_deterministic_for_same_parts() -> None:
    parts = ("campaign", UUID("12345678-1234-5678-1234-567812345678"), 42)

    first = generate_idempotency_key(*parts)
    second = generate_idempotency_key(*parts)

    assert first == second
    assert _SHA256_HEX_RE.fullmatch(first)


@pytest.mark.parametrize(
    ("left", "right"),
    [
        (("campaign", "recipient", 1), ("recipient", "campaign", 1)),
        (("campaign", "recipient", 1), ("campaign", "recipient", 2)),
        (("campaign", "recipient"), ("campaign", "recipient", "attempt")),
    ],
)
def test_generate_idempotency_key_changes_when_order_or_values_change(
    left: tuple[object, ...], right: tuple[object, ...]
) -> None:
    assert generate_idempotency_key(*left) != generate_idempotency_key(*right)


def test_generate_idempotency_key_accepts_uuid_string_and_int_parts() -> None:
    key = generate_idempotency_key(
        UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        "delivery",
        7,
    )

    assert _SHA256_HEX_RE.fullmatch(key)


def test_generate_idempotency_key_rejects_empty_parts() -> None:
    with pytest.raises(ValueError, match="at least one"):
        generate_idempotency_key()
