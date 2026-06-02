# Tests

Automated validation for the distributed campaign demo.

- `unit/`: Python unit and integration-style tests for API behavior, dispatch reliability, SaaS tenancy, observability, Kubernetes manifests, and web UI scaffolding.
- `load/`: k6 load and threshold scripts for campaign fan-out and incident-style scenarios.

Primary command:

```bash
uv run pytest
```
