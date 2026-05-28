# Architecture

## Scope

This repository implements a local-first, Kubernetes-ready SMS campaign platform. It is designed to demonstrate SaaS product flows and platform engineering controls without using real SMS providers or cloud resources during local review.

See the Mermaid diagram in [architecture-diagram.mmd](architecture-diagram.mmd).

## Application Components

- Web UI: Vite/React app served by Nginx. It proxies `/api/*` to Campaign API and `/r/*` to public tracked-link redirects.
- Campaign API: FastAPI service for companies, access codes, memberships, subscribers, campaigns, media assets, tracked links, analytics, readiness, metrics, OpenAPI docs, and trace smoke checks.
- Dispatcher: async worker that consumes NATS messages, calls the provider simulator, updates PostgreSQL message status, and publishes retry or dead-letter jobs.
- Provider Simulator: FastAPI service that simulates SMS provider success, rate limiting, server errors, latency, and flaky failure modes.
- PostgreSQL: tenant, campaign, subscriber, media, link, usage, and status data store.
- Redis: included for platform parity and future scheduling/cache workflows.
- NATS JetStream: dispatch queue with retry and dead-letter subjects.

## Local And kind Topology

Local Docker Compose runs all services on loopback ports. The web UI listens on `127.0.0.1:8080`; the Campaign API listens on `127.0.0.1:8081`.

The kind path builds local images and installs the Helm chart into the `campaign-platform` namespace. Reviewers normally port-forward the web UI:

```bash
kubectl -n campaign-platform port-forward svc/campaign-platform-web-ui 18080:80
```

Then open <http://127.0.0.1:18080>. Through this proxy:

- Web app routes are served by Nginx.
- API requests use `/api`.
- API docs are available at `/api/docs`.
- OpenAPI JSON is available at `/api/openapi.json`.
- Public tracked links are available under `/r/{token}`.

## Observability Topology

The observability stack runs in the `observability` namespace:

- Prometheus scrapes app `/metrics` endpoints through ServiceMonitor resources.
- Grafana provides dashboards and Explore.
- Loki stores Kubernetes pod logs collected by Alloy.
- Tempo stores traces.
- OpenTelemetry Collector receives OTLP traces from Python services and exports them to Tempo.

The app Helm chart sets `OTEL_EXPORTER_OTLP_ENDPOINT` for Campaign API, Dispatcher, and Provider Simulator. The default NetworkPolicy allows those services to reach the collector on OTLP gRPC/HTTP and allows Prometheus in the observability namespace to scrape app metrics.

## Request And Trace Flow

1. Browser calls the Web UI on `/api/...`.
2. Nginx forwards to Campaign API and sets `X-Forwarded-Prefix: /api`.
3. FastAPI instrumentation creates request spans for API endpoints except liveness/readiness/metrics.
4. Campaign creation writes rows and injects W3C trace context into NATS payloads.
5. Dispatcher extracts trace context, creates a `message.consume` span, and creates `provider.send` spans for provider calls.
6. OpenTelemetry exporters send spans to the collector.
7. Collector exports traces to Tempo.
8. Grafana Explore queries Tempo by service name or trace id.

## Security Boundaries

- Tenant operations are scoped by `X-Company-Id` or stored session company id in the frontend.
- Internal admin API operations require `X-Internal-Admin: true` in this demo implementation.
- Helm NetworkPolicies restrict app ingress/egress to declared dependencies and observability paths.
- No real SMS provider credentials, paid cloud APIs, or external secrets are required for local review.
