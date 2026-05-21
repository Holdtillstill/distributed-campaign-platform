from __future__ import annotations

import hashlib


def generate_idempotency_key(*parts: object) -> str:
    """Return a deterministic SHA-256 idempotency key for the supplied parts.

    Parts are converted to strings and encoded as a length-prefixed canonical
    representation before hashing. Length prefixes avoid collisions from values
    that themselves contain delimiter characters.
    """

    if not parts:
        raise ValueError("generate_idempotency_key requires at least one part")

    canonical = "|".join(_canonicalize_part(part) for part in parts)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _canonicalize_part(part: object) -> str:
    value = str(part)
    return f"{len(value)}:{value}"
