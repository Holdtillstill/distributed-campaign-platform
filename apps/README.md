# Apps

Application services and shared libraries for the distributed campaign demo.

- `campaign-api`: FastAPI service for tenants, subscribers, campaign planning, dispatch publishing, inbound SMS, engagement links, usage, and observability endpoints.
- `dispatcher`: worker service that consumes dispatch jobs, retries transient provider failures, and sends exhausted messages to a dead-letter path.
- `provider-simulator`: local SMS provider simulator for deterministic success, rate-limit, failure, and callback scenarios.
- `shared`: reusable observability, tracing, logging, idempotency, and model helpers.
- `web-ui`: React portfolio/demo UI for public feature pages, customer workspace flows, internal operator views, and API-backed campaign workflows.
