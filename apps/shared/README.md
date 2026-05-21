# Shared Python package

`campaign_common` contains lightweight utilities shared by the Distributed Campaign Delivery Platform services.

The repository pytest configuration adds `apps/shared` to `PYTHONPATH`, so tests and services can import shared code with:

```python
from campaign_common.idempotency import generate_idempotency_key
```

Keep this package dependency-light and import-safe for use across service startup paths.
