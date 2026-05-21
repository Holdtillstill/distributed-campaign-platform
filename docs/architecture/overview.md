# Architecture Overview

## Intent

This project demonstrates how to design and operate a production-style AWS EKS platform by running a realistic event-driven campaign delivery simulator.

The application domain is intentionally adjacent to high-throughput messaging systems: campaigns are accepted, segmented, scheduled, dispatched through rate-limited providers, and updated through asynchronous delivery callbacks.

## Logical architecture

```text
┌──────────────┐      ┌────────────────┐      ┌────────────┐
│ Campaign API │─────▶│ Segment Worker │─────▶│ Scheduler  │
└──────┬───────┘      └────────────────┘      └─────┬──────┘
       │                                             │
       ▼                                             ▼
┌──────────────┐      ┌───────┐              ┌───────────────┐
│ PostgreSQL   │◀────▶│ Redis │              │ NATS JetStream│
└──────────────┘      └───────┘              └───────┬───────┘
                                                      │
                                                      ▼
                                             ┌────────────────┐
                                             │ Dispatchers    │
                                             └───────┬────────┘
                                                     │
                                                     ▼
                                             ┌────────────────┐
                                             │ Provider Sim   │
                                             └───────┬────────┘
                                                     │ webhooks
                                                     ▼
                                             ┌────────────────┐
                                             │ Webhook Receiver│
                                             └───────┬────────┘
                                                     ▼
                                             ┌────────────────┐
                                             │ Status API      │
                                             └────────────────┘
```

## Platform architecture

The same application should run in three modes:

1. Docker Compose for fast local application development.
2. kind + Helm for Kubernetes validation without AWS cost.
3. AWS EKS for final cloud integration, observability demos, and portfolio screenshots.

## Observability architecture

Every service should emit:

- structured JSON logs with correlation IDs
- Prometheus metrics for RED and business metrics
- OpenTelemetry traces through service boundaries
- health and readiness endpoints

Platform observability stack:

- OpenTelemetry Collector
- Prometheus
- Alertmanager
- Grafana
- Loki
- Tempo
- kube-state-metrics
- node-exporter

## Reliability themes

- idempotent message dispatch
- duplicate/out-of-order webhook handling
- retry with jitter for transient provider errors
- DLQ for permanent failures
- provider-specific rate limiting
- scheduler backpressure based on queue depth and provider health
- incident runbooks for backlog growth, provider outage, webhook storm, and database saturation
