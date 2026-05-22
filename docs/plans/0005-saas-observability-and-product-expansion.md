# SaaS Campaign Platform + Observability Expansion Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Evolve the local distributed campaign simulator into a credible multi-tenant SaaS campaign platform with real tracing/logging collection and a product model suitable for SMS campaign creation, media landing pages, subscriber opt-in, click/redeem tracking, reminders, and internal admin volume reporting.

**Architecture:** Keep the current event-driven core, but add tenant-aware domain boundaries. Add OpenTelemetry tracing across API -> NATS -> dispatcher -> provider simulator, and Kubernetes log collection into Loki. Then add SaaS primitives incrementally: companies, users, subscribers, consent, media assets, landing pages, click events, redemption events, and reporting.

**Tech Stack:** FastAPI, Postgres, NATS JetStream, Redis, React/Vite, Helm, kind/EKS, Prometheus, Grafana, Loki, Tempo, OpenTelemetry Collector, Grafana Alloy or Promtail for pod logs.

---

## Current state discovered

- Structured JSON logging already exists via `apps/shared/campaign_common/logging.py`.
- Python OpenTelemetry dependencies already exist in `pyproject.toml`.
- OpenTelemetry Collector is installed and configured for OTLP traces/metrics/logs.
- Tempo and Loki are installed locally.
- The app does **not yet** initialize OTel SDK instrumentation or export spans/logs to the Collector.
- Kubernetes stdout/stderr pod log collection into Loki is **not yet** installed; Loki exists, but no cluster log shipper is tailing app pods.

## Target SaaS workflow

1. Internal admin creates a customer company/tenant.
2. Internal admin invites or provisions first customer admin.
3. Customer employees sign up/log in under that company.
4. Customer imports/provides subscribers with consent state.
5. Subscribers can also opt in via public forms using double opt-in.
6. Customer uploads campaign media images into a media library.
7. Customer creates campaign content:
   - plain text SMS, or
   - SMS with unique short URL to a static campaign landing page.
8. Campaign is scheduled.
9. Dispatcher sends messages through provider integration.
10. Recipient click hits redirect/landing endpoint; app records click, device/IP/user-agent metadata, and attribution.
11. Landing page can show media, offer details, and `Redeem` action.
12. Customer sees campaign delivery/click/redeem performance.
13. Customer can schedule reminder messages to subscribers who have not clicked/redeemed.
14. Internal admin can see tenant volumes, throughput, failures, cost proxies, and usage over a timeframe.

---

## Phase A: Real tracing and log collection

### Task A1: Add app OTel configuration helper

**Objective:** Centralize tracing setup for all FastAPI services.

**Files:**
- Create: `apps/shared/campaign_common/tracing.py`
- Modify: `apps/campaign-api/app/main.py`
- Modify: `apps/dispatcher/app/main.py`
- Modify: `apps/provider-simulator/app/main.py`
- Test: `tests/unit/test_tracing_configuration.py`

**Implementation notes:**
- Use `opentelemetry.sdk.resources.Resource` with `service.name`.
- Use `OTEL_EXPORTER_OTLP_ENDPOINT` env var.
- Instrument FastAPI with `FastAPIInstrumentor.instrument_app(app)`.
- Instrument outbound HTTP with `HTTPXClientInstrumentor` if dependency is added.
- For NATS boundaries, add manual spans around publish/consume until a library integration is available.

### Task A2: Add trace context to NATS message payloads

**Objective:** Preserve trace correlation across async message dispatch.

**Files:**
- Modify: `apps/campaign-api/app/main.py`
- Modify: `apps/dispatcher/app/main.py`
- Test: `tests/unit/test_trace_context_propagation.py`

**Implementation notes:**
- Inject W3C trace context into message payload metadata before publishing.
- Extract context when dispatcher consumes a message.
- Create spans:
  - `campaign.create`
  - `nats.publish messages.dispatch`
  - `message.consume`
  - `provider.send`
  - `message.status.update`

### Task A3: Add Kubernetes OTel env vars

**Objective:** Route app traces to the local Collector.

**Files:**
- Modify: `deploy/helm/campaign-platform/values.yaml`
- Modify: `deploy/helm/campaign-platform/templates/apps.yaml`
- Test: `tests/unit/test_observability_runtime_config.py`

**Environment:**

```text
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector-opentelemetry-collector.observability.svc.cluster.local:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=none
OTEL_LOGS_EXPORTER=none
```

### Task A4: Add pod log collection into Loki

**Objective:** Ship Kubernetes stdout/stderr logs to Loki so Grafana Explore can query app logs.

**Recommended approach:** Grafana Alloy DaemonSet, because it is current Grafana ecosystem direction and replaces Promtail long-term.

**Files:**
- Create: `platform/observability/alloy-values.yaml`
- Modify: `platform/observability/README.md`
- Test: `tests/unit/test_observability_log_collection.py`

**Log labels:**
- `namespace`
- `pod`
- `container`
- `app_kubernetes_io_component`
- `app_kubernetes_io_instance`

### Task A5: Add Grafana data sources and dashboard panels

**Objective:** Make traces/logs visible from Grafana.

**Files:**
- Modify: `platform/observability/kube-prometheus-stack-values.yaml`
- Modify: `platform/observability/dashboards/campaign-platform-essential-overview.json`

**Data sources:**
- Prometheus
- Loki
- Tempo

**Panels/links:**
- Recent app logs by namespace/component
- Error logs count by component
- Trace search link for `service.name=campaign-api`
- Campaign create-to-dispatch latency panel once spans exist

---

## Phase B: Multi-tenant SaaS foundation

### Task B1: Add tenant and user domain tables

**Objective:** Represent customer companies and employees.

**Tables:**
- `companies`
- `users`
- `company_memberships`
- `roles`
- `audit_events`

**Key design:** All customer-owned objects carry `company_id`. Internal admins can query across companies; customer users are scoped to one or more companies.

### Task B2: Add auth/RBAC model

**Objective:** Separate internal admin, customer admin, marketer, analyst, and viewer.

**Roles:**
- `internal_admin`
- `customer_admin`
- `campaign_manager`
- `analyst`
- `viewer`

**Portfolio-friendly approach:** Start with email/password or magic-link local auth, then document how production would use Cognito/Auth0/OIDC.

### Task B3: Add subscriber and consent model

**Objective:** Track imported subscribers, opt-in source, opt-in timestamps, and opt-out state.

**Tables:**
- `subscriber_lists`
- `subscribers`
- `subscriber_list_memberships`
- `consent_events`
- `suppression_list`

**Double opt-in flow:**
1. Subscriber submits phone number.
2. App sends confirmation SMS with unique confirmation link/code.
3. Subscriber confirms.
4. `consent_events` records `double_opt_in_confirmed` with timestamp/source/IP/user-agent.
5. Only confirmed subscribers are eligible for marketing campaigns.

### Task B4: Add compliance primitives

**Objective:** Make the SMS SaaS story credible.

**Features:**
- STOP/HELP keyword handling.
- Quiet hours/timezone enforcement.
- Frequency caps.
- Per-company sending limits.
- Message template review status.
- Consent audit trail.
- Data retention policy.

---

## Phase C: Campaign media, landing pages, clicks, and redemption

### Task C1: Add media content library

**Objective:** Let customers upload/manage campaign images.

**Tables:**
- `media_assets`
- `media_asset_versions`

**Storage:**
- Local dev: MinIO or filesystem.
- AWS: S3 with pre-signed upload URLs, SSE, bucket lifecycle policies, CloudFront.

### Task C2: Add static campaign landing pages

**Objective:** Support SMS messages with unique URLs that show media and campaign details.

**Tables:**
- `landing_pages`
- `campaign_links`

**Pattern:**
- SMS contains `https://<domain>/r/{token}`.
- `/r/{token}` records click and redirects/renders landing page.
- Token maps to company/campaign/subscriber/message.

### Task C3: Add click tracking

**Objective:** Attribute clicks to campaign/message/subscriber.

**Tables:**
- `click_events`

**Fields:**
- `company_id`
- `campaign_id`
- `message_id`
- `subscriber_id`
- `token_id`
- `clicked_at`
- `ip_hash`
- `user_agent`
- `referer`
- `device_family`
- `geo_coarse`

**Privacy:** Hash or truncate IP; do not collect unnecessary PII.

### Task C4: Add redemption flow

**Objective:** Model SmartSMS-style `Redeem` interaction.

**Tables:**
- `offers`
- `redemption_events`

**MVP:** Recipient clicks `Redeem`, page shows a confirmation/success code for store staff.

**Later:** Add store staff scan/code validation:
- Unique redemption code or QR.
- One-time-use enforcement.
- Store/location attribution.
- Fraud checks for duplicate redemption.

### Task C5: Add reminder campaigns

**Objective:** Let customers message subscribers who have not clicked/redeemed.

**Implementation:**
- Segment builder supports `not clicked campaign X after N hours`.
- Scheduler creates reminder job.
- Frequency cap and quiet-hour checks run before send.

---

## Phase D: Reporting and internal admin

### Task D1: Customer campaign performance dashboard

**Metrics:**
- Sent
- Failed
- Retried/dead-lettered
- Clicks
- Unique clicks
- Click-through rate
- Redemptions
- Redemption rate
- Opt-outs
- Revenue/conversion placeholder if configured

### Task D2: Internal admin usage dashboard

**Metrics by company/timeframe:**
- Message volume
- Active campaigns
- Subscriber count
- Delivery failures
- Click volume
- Redemption volume
- Estimated provider cost
- Error budget/SLO view

### Task D3: Audit and compliance dashboard

**Features:**
- Consent event lookup.
- Suppression list lookup.
- Campaign send history by subscriber.
- User/admin activity audit events.

---

## Other features that make sense

- Template library with approval workflow.
- Segmentation rules: tags, list membership, location, behavior, last click, last purchase placeholder.
- A/B testing for message copy and landing page images.
- Send-time optimization by subscriber timezone/history.
- Brand/domain management for short links.
- Webhooks for click/redeem/delivery events.
- CSV import with validation, dedupe, and consent-source capture.
- Deliverability/compliance guardrails: opt-out rate alerts, failed delivery alerts, unusual volume alerts.
- Billing/usage metering: messages sent, media storage, tracked clicks, active subscribers.
- API keys for customers and scoped service accounts.
- Tenant-scoped observability: internal-only technical telemetry, customer-facing business analytics.

## Recommended next implementation slice

Build Phase A first:

1. Real OTel traces from app services to Tempo.
2. Kubernetes log collection into Loki.
3. Grafana panels linking campaign metrics, logs, and traces.

Then build the SaaS foundation in this order:

1. Companies/users/RBAC.
2. Subscribers/consent/double opt-in.
3. Media library + unique campaign links.
4. Click/redeem tracking.
5. Reminder segments and internal admin volume reporting.
