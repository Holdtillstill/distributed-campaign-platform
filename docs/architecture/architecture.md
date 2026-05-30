# Architecture

## Scope

This repository implements a local-first, Kubernetes-ready SMS campaign platform. It is designed to demonstrate SaaS product flows and platform engineering controls without using real SMS providers or cloud resources during local review.

See the local/Kubernetes Mermaid diagram in [architecture-diagram.mmd](architecture-diagram.mmd) and the AWS EKS Mermaid diagram in [aws-eks-architecture.mmd](aws-eks-architecture.mmd).

## Application Components

- Web UI: Vite/React app served by Nginx. It proxies `/api/*` to Campaign API and `/r/*` to public tracked-link redirects.
- Campaign API: FastAPI service for companies, access codes, memberships, subscribers, campaigns, media assets, tracked links, analytics, readiness, metrics, OpenAPI docs, and trace smoke checks.
- Inbound SMS webhook: public endpoint for carrier/provider MO callbacks. It handles keyword opt-ins, ZIP capture, terms confirmation, STOP/HELP, and unrecognized replies.
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

## AWS EKS Topology

The EKS dev environment is designed for a brand-new AWS account and builds the network from scratch:

- VPC CIDR `10.42.0.0/16`
- public subnets across Availability Zones for internet-facing ALBs and NAT gateways
- private subnets across Availability Zones for EKS managed nodes and pods
- dedicated small control-plane subnets for EKS cross-account ENIs
- one NAT gateway by default for cost-controlled dev demos, with a one-per-AZ switch for higher availability
- VPC endpoints for ECR, S3, STS, EC2, SQS, ELB, CloudWatch Logs, SSM, and Secrets Manager
- EKS API private endpoint access enabled, with public endpoint access restricted by operator CIDR
- public subnet tag `kubernetes.io/role/elb=1`
- private subnet tag `kubernetes.io/role/internal-elb=1`

The AWS architecture diagram is stored in [aws-eks-architecture.mmd](aws-eks-architecture.mmd).

For the job-landing AWS story, the intended managed-service evolution is:

- SQS Standard for massive broadcast shard queues, inbound MO events, and outbound MT jobs
- Redis/ElastiCache for hot-path idempotency and short-lived conversation locks
- RDS PostgreSQL as the durable source of truth for subscribers, consent, campaigns, billing, and analytics

The app now has an optional `QUEUE_PROVIDER=sqs` path for the Campaign API publisher and dispatcher worker. The default local and Helm path still uses NATS JetStream and in-cluster Redis/PostgreSQL so the full demo runs without AWS spend. See [implementation-status.md](implementation-status.md) for the exact implemented-vs-roadmap boundary.

## Inbound MO / MT Conversation Flow

1. A prospect sees an ad: `Text FSUMMER to 12345`.
2. Provider sends an MO webhook to `POST /public/sms/inbound`.
3. Campaign API records the inbound message and creates or updates a pending subscriber.
4. API records a conversation state of `awaiting_zip` and returns an MT reply asking for ZIP code.
5. Prospect replies with a ZIP code; API stores `postal_code`, derives `market_segment`, and asks for terms confirmation.
6. Prospect replies `Y` or `YES`; API records double opt-in consent, adds the subscriber to the keyword list, and returns a confirmation MT.
7. `STOP` opts out and writes the suppression list.
8. `HELP` and unrecognized messages return deterministic support/fallback replies.

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
