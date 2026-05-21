# ADR 0002: Initial Technology Choices

## Status

Accepted

## Decision

Use the following initial technologies:

- Python 3.12 and FastAPI for app services
- PostgreSQL for durable relational state
- Redis for rate limiting, idempotency, and cache-like state
- NATS JetStream for Kubernetes-native event streaming
- Docker Compose for local app development
- Helm for Kubernetes packaging
- kind for local Kubernetes validation
- Terraform for AWS infrastructure
- Argo CD for GitOps deployment
- OpenTelemetry, Prometheus, Grafana, Loki, Tempo, and Alertmanager for observability

## Rationale

Python/FastAPI keeps application development fast and readable. NATS JetStream gives the app a real distributed messaging backbone without the operational overhead of Kafka. Local-first development avoids unnecessary AWS cost. Helm and Argo CD match common EKS platform engineering expectations. The Grafana OSS stack fills the open-source observability gap that Datadog-heavy experience may not cover.

## Alternatives considered

- **Go instead of Python**: strong for cloud-native services, but slower to build for this portfolio goal.
- **Kafka instead of NATS**: more recognizable, but heavier and easier to turn into a Kafka operations project.
- **SQS instead of NATS**: AWS-realistic, but less Kubernetes-native and harder to run fully local.
- **Flux instead of Argo CD**: valid, but Argo CD is more visual for portfolio screenshots.
