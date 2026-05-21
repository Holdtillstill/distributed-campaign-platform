# Distributed Campaign Delivery Platform on AWS EKS

A production-style Kubernetes platform running an event-driven campaign delivery simulator with GitOps, autoscaling, distributed tracing, open-source observability, SLOs, and incident runbooks.

> Status: Phase 0 planning and repository skeleton.

## Goals

This project demonstrates senior DevOps / platform engineering skills with a domain-relevant distributed system:

- AWS EKS platform design and operation
- Terraform-managed AWS infrastructure
- Kubernetes workloads, Helm packaging, and GitOps delivery
- Open-source observability with OpenTelemetry, Prometheus, Grafana, Loki, Tempo, and Alertmanager
- Autoscaling, backpressure, SLOs, incident scenarios, and runbooks
- Kubernetes and AWS security controls such as IRSA, RBAC, NetworkPolicies, and policy-as-code
- Cost-aware cloud design with local-first development and ephemeral EKS environments

## Application concept

The application simulates a distributed campaign delivery platform:

```text
Campaign API → Segment Worker → Scheduler → Dispatch Queue → Dispatchers → Provider Simulator
                                      ↓                                ↓
                                PostgreSQL/Redis ← Webhook Receiver ← Provider callbacks
                                      ↓
                                  Status API
```

Core distributed-systems behaviors:

- campaign fan-out into recipient/message jobs
- asynchronous queue/stream processing
- provider rate limits and partial failures
- retries, jitter, and dead-letter handling
- idempotency for dispatch and webhook callbacks
- backpressure from queue depth and provider quotas
- structured logs, metrics, traces, and correlation IDs

## Planned stack

| Layer | Tools |
|---|---|
| Cloud | AWS EKS, ECR, VPC, IAM, ALB, S3, optional Route 53/ACM |
| IaC | Terraform |
| Kubernetes | Helm, Argo CD, HPA, PDBs, NetworkPolicies, Karpenter later |
| App | Python 3.12, FastAPI, async workers |
| Data | PostgreSQL, Redis, NATS JetStream |
| Observability | OpenTelemetry Collector, Prometheus, Grafana, Loki, Tempo, Alertmanager |
| Security | IRSA, RBAC, External Secrets later, Kyverno later, Trivy/Checkov/tflint |
| Testing | pytest, k6, Helm lint, Terraform validation |

## Repository layout

```text
apps/                  Application services and shared libraries
deploy/helm/           Helm charts for app/platform deployment
docs/                  Architecture, decisions, runbooks, cost, security, plans
infra/terraform/       AWS infrastructure modules and environments
platform/              Argo CD apps, observability values, policies, secrets integration
tests/load/            k6 load tests and incident simulations
scripts/               Bootstrap, local dev, validation, teardown helpers
```

## Development modes

1. **Local app mode**: Docker Compose for PostgreSQL, Redis, NATS, and services.
2. **Local Kubernetes mode**: kind + Helm to validate Kubernetes manifests without AWS cost.
3. **Ephemeral EKS mode**: Terraform creates EKS only for integration tests and screenshots, then destroys it.

## Current next step

See [`docs/plans/0000-phase-0-repo-foundation.md`](docs/plans/0000-phase-0-repo-foundation.md) and [`docs/setup.md`](docs/setup.md).
