# Implementation Status

This project is a portfolio platform demo. It is intentionally local-first, with an AWS EKS path that demonstrates credible cloud design without pretending every production managed-service migration is complete.

## Current Versus Target

| Area | Implemented now | Demo-only choice | Production evolution |
|---|---|---|---|
| Broadcast API | Campaign API creates campaign and message rows, charges credits, and publishes dispatch jobs. | Message fan-out still happens in the HTTP request path. This is fine for small demos and local smoke tests. | Move large audience expansion to a scheduler/fan-out worker that pages subscribers, batches inserts, and publishes queue chunks outside the request lifecycle. |
| Dispatch queue | Local and kind default to NATS JetStream with retry and dead-letter subjects. | NATS is kept because it is lightweight and runs fully local without AWS spend. | EKS can select `QUEUE_PROVIDER=sqs`; SQS Standard queues and DLQs are provisioned by Terraform. Use SQS for broadcast shards, inbound MO work, and outbound MT work when running AWS-native demos. |
| SQS app wiring | Campaign API has an optional SQS batch publisher and dispatcher has an optional SQS polling worker behind `QUEUE_PROVIDER=sqs`. | Helm still defaults to `QUEUE_PROVIDER=nats` so the default EKS demo can run with in-cluster NATS. | Make SQS the primary EKS mode once the ALB smoke test has been run against AWS and queue depth dashboards are added. |
| Deduplication | PostgreSQL unique keys and status updates provide durable idempotency. | Redis is deployed locally/in Helm but not yet on the hot dedupe path. | Add Redis/ElastiCache for fast short-lived provider webhook dedupe, message locks, and rate-limit counters before hitting PostgreSQL. |
| Database | PostgreSQL schema covers tenants, subscribers, consent, campaigns, messages, links, reminders, and SMS conversations. | Local/kind/EKS demo chart runs a single in-cluster PostgreSQL StatefulSet. | Use RDS PostgreSQL for automated backup, Multi-AZ failover, patching, and durable production operations. |
| Inbound SMS | `POST /public/sms/inbound` handles keyword, ZIP, Y/N, STOP, HELP, and unknown replies. | Provider simulator is not a real carrier integration. | Add provider signature validation, provider-specific payload adapters, webhook replay protection, and async inbound queueing. |
| AWS network | Terraform creates VPC, public/private/control-plane subnets, EKS, ECR, SQS, VPC endpoints, NAT, and IRSA roles. | Dev defaults optimize cost with one NAT gateway while retaining multi-AZ subnets. | For higher availability, set `single_nat_gateway=false` and `one_nat_gateway_per_az=true`; add RDS and ElastiCache subnets/security groups. |
| Observability | OpenTelemetry, trace/log correlation, Prometheus ServiceMonitors, RED metrics, workflow counters, NATS JetStream exporter metrics, Grafana/Loki/Tempo values, app dashboards, PrometheusRule alerts, and runbooks are present. | The default demo observes the in-cluster NATS path directly and the optional SQS path through app-level counters. | Add AWS SQS queue age/depth alerts, Redis hit-rate metrics, RDS metrics, and DLQ redrive runbooks before calling it production coverage. |

## Deployment Claims

| Claim | Status |
|---|---|
| Ready for portfolio review | Yes. The local app, tests, docs, and architecture story are strong enough for a technical walkthrough. |
| Ready for local demo | Yes. `uv run pytest` and `scripts/local/e2e-smoke-test.sh` validate the core app path. |
| Ready for EKS demo | Almost. Terraform and Helm are credible, but the final validation is `terraform apply`, Helm install, ALB smoke test, and teardown in the new AWS account. |
| Production ready | No. Large fan-out, managed data services, hot dedupe, provider auth, DR, and operational runbooks need more work. |

## Queue Provider Modes

Default local mode:

```bash
QUEUE_PROVIDER=nats
```

AWS-native queue mode:

```bash
QUEUE_PROVIDER=sqs
SQS_BROADCAST_QUEUE_URL=<terraform output sqs_queue_urls.broadcast_shards>
SQS_RETRY_QUEUE_URL=<optional retry queue URL>
SQS_DEAD_LETTER_QUEUE_URL=<terraform output sqs_dead_letter_queue_urls.broadcast_shards>
AWS_REGION=us-west-2
```

Use NATS when reviewing the project without AWS. Use SQS when proving the managed AWS queue path.
