# Million-Scale Audience, Live Broadcast Monitoring, and Backlog Completion Plan

> **For Hermes:** Use Codex/controller workflow to implement this plan slice-by-slice with validation after each slice.

**Goal:** Evolve the local SMS SaaS portfolio app from a credible small demo into a scale-oriented SaaS demo that can present million-subscriber tenants, show real-time broadcast throughput, and progressively complete the product backlog.

**Architecture:** Do not insert millions of physical subscriber rows into local Postgres as the first step. Keep a searchable/paginated real subscriber sample for interaction, then add scale-profile/audience-size metadata that models million-scale lists and broadcasts. Broadcast monitoring should combine persisted campaign/message counts with live dispatcher/provider status metrics and simulated/projected throughput where full fan-out is intentionally capped for local kind.

**Tech Stack:** FastAPI, asyncpg/Postgres, NATS/dispatcher/provider simulator, React/Vite, Vitest, pytest, Helm/kind, Prometheus/Tempo/Grafana.

---

## Phase 1 — Scale foundation and live broadcast monitor

**Status:** Implemented for the local app. Demo Retail Co now keeps 1,100 physical subscriber sample rows, models 2,650,000 audience members across seven lists, stores modeled campaign audience counts, exposes paginated subscriber search, and includes a live Campaigns -> Monitor UI backed by `GET /campaigns/{campaign_id}/broadcast-monitor`.

**Deferred to later phases:** physical million-row load testing, scheduler/releaser worker, cancel/reschedule APIs, richer campaign detail waterfalls, provider/webhook-backed throughput metrics beyond persisted message status rows, CSV validation preview, and operator risk alerts.

### Task 1: Add scale-aware subscriber/list model

**Objective:** Demo Retail Co should present million-scale audience counts without requiring millions of DB rows locally.

**Files:**
- Modify: `apps/campaign-api/app/schema.sql`
- Modify: `apps/campaign-api/app/db.py`
- Modify: `apps/campaign-api/app/main.py`
- Modify: `scripts/local/seed-demo-data.py`
- Test: `tests/unit/test_demo_seed_data.py`
- Test: existing API/planning tests

**Requirements:**
- Done: Added `subscriber_lists.estimated_subscriber_count`.
- Done: Kept actual sample subscribers at 1,100 for fast UI/search.
- Done: API list responses expose `subscriber_count`, `sample_subscriber_count`, and `estimated_subscriber_count`.
- Done: Seed deterministic list sizes total 2,650,000 subscribers.
- Done: Seed upserts modeled list/campaign metadata idempotently.

### Task 2: Add subscriber search/pagination API

**Objective:** The app must not fetch/render all subscribers at scale.

**Files:**
- Modify: `apps/campaign-api/app/db.py`
- Modify: `apps/campaign-api/app/main.py`
- Modify: `apps/web-ui/src/pages/app/CompanyWorkspace.tsx`
- Modify: `apps/web-ui/src/types.ts`
- Test: backend tests and Vitest

**Requirements:**
- Done: Added `/companies/{company_id}/subscribers/search` with `q`, `list_id`, `consent_status`, `limit`, and `offset`.
- Done: Response includes `rows`, `total`, `limit`, and `offset`.
- Done: Company UI shows paginated/searchable directory, consent filter, list filters, loaded sample counts, and modeled audience counts.
- Done: Builder direct subscriber selection uses subscriber search results instead of an all-subscriber array.

### Task 3: Add broadcast monitor domain/API

**Objective:** Campaigns should expose live throughput and delivery progress.

**Files:**
- Modify: `apps/campaign-api/app/schema.sql`
- Modify: `apps/campaign-api/app/db.py`
- Modify: `apps/campaign-api/app/main.py`
- Test: backend tests

**Requirements:**
- Done: Added `GET /campaigns/{campaign_id}/broadcast-monitor`.
- Done: Returns status counts, total/modeled audience, sample message count, percent complete, throughput, ETA, projected completion, started time, and last updated time.
- Done: Uses real `messages` table counts for queued/sent/failed/retried/dead-lettered rows.
- Done: Returns `mode: projected/sample` when modeled audience exceeds local sample rows.

### Task 4: Add live broadcast monitor UI

**Objective:** Customer campaign page should show a monitor panel for active/recent broadcasts.

**Files:**
- Modify: `apps/web-ui/src/pages/app/CompanyWorkspace.tsx`
- Modify: `apps/web-ui/src/styles.css`
- Test: `apps/web-ui/src/App.test.tsx`

**Requirements:**
- Done: Added Campaigns -> Monitor with throughput, progress bar, actual counts, ETA, last updated, modeled audience, and sample message count.
- Done: Polls every five seconds only while the Monitor tab has a selected campaign.
- Done: Includes accessible region, empty state, loading text, and error text.

### Task 5: Update docs/backlog

**Objective:** Document scale-mode semantics and next backlog phases.

**Files:**
- Modify: `docs/product/page-by-page-improvement-backlog.md`
- Create/modify: `docs/runbooks/local-demo.md`
- Create/modify: `docs/product/sms-saas-product-doc.md`

**Requirements:**
- Done: Updated product backlog, local demo runbook, product doc, and this plan with sample-vs-modeled semantics, monitor instructions, current completion status, and deferred phases.

---

## Phase 2 — Campaign lifecycle

- Scheduler/releaser worker for scheduled campaigns.
- `PATCH /campaigns/{id}` cancel/reschedule.
- Campaign detail page with status waterfall, links, follow-ups, and monitor.

## Phase 3 — Admin/operator scale features

- Company filters/search/quota-risk.
- Admin dashboard date window and last refresh.
- Usage CSV export and date validation.
- Tenant risk alerts: low credits, no access code, failed/dead-lettered sends.

## Phase 4 — Analytics and dashboards

- Real daily activity buckets.
- CTR/redemption/failure rates.
- Analytics date/campaign filters.
- Subscriber growth/consent mix.

## Phase 5 — Access/settings/content polish

- Signup validation and membership cards.
- Settings auto-load team, numeric validation, audit trail.
- Media validation and advanced tool role gating.
- Landing page live demo summary.

## Validation contract for every phase

```bash
cd apps/web-ui && npm test -- --run && npm run build
cd ../..
. .venv/bin/activate && ruff check . && python -m pytest -q
docker build -t campaign-api:local -f apps/campaign-api/Dockerfile .
docker build -t web-ui:local -f apps/web-ui/Dockerfile .
```

Then deploy to kind, reseed if needed, and browser-QA live workflows before committing.
