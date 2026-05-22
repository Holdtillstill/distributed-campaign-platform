# Overnight SaaS depth run

## Goal

Use an unattended Codex implementation pass plus controller validation to push the distributed campaign platform closer to a credible senior platform/product portfolio project.

## Priorities

1. Internal admin company detail/workspace
   - Tenant health table should support drilling into one company.
   - Company detail should show subscribers, campaigns, scheduled reach next 30 days, credits/quota, access code, recent campaigns, and risk notes.
   - Add revoke/regenerate/copy affordance only if backed by safe API behavior; otherwise add tested read-only detail first.

2. Template-to-campaign workflow
   - Content Library template cards should have clear actions.
   - “Use template” should prefill campaign builder copy/message type/media where feasible.
   - Campaign Builder should feel like a workflow: audience, message/content, schedule/review.

3. Analytics polish
   - Company analytics should show meaningful campaign reach, sends, clicks, redemptions, opt-outs/proxy metrics from existing API data.
   - Internal usage/analytics should summarize top tenants and scheduled reach.

4. UX polish from latest QA
   - Format scheduled dates in human-readable local date/time.
   - Reduce UUID prominence in user-facing campaign cards.
   - Move manual tracking link creation behind an Advanced section or otherwise de-emphasize it.
   - Add useful empty states and success/error feedback.

5. Platform/portfolio credibility
   - Keep local-first and kind workflow intact.
   - Update README/demo docs with the richer flows.
   - Add tests for changed behavior.

## Safety boundaries

- Do not deploy to AWS or create cloud resources.
- Do not use real secrets, real phone numbers, or paid APIs.
- Do not commit; controller will review, validate, deploy, QA, and commit.
- Preserve existing API base behavior: `window.__APP_CONFIG__?.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL ?? "/api"`.
- Keep the role-based SaaS UI direction; no giant stacked prototype page.

## Controller validation plan

After Codex completion:

```bash
git status --short
git diff --stat
cd apps/web-ui && npm test -- --run && npm run build
cd ../..
. .venv/bin/activate && ruff check . && python -m pytest -q
docker build -t campaign-api:local -f apps/campaign-api/Dockerfile .
docker build -t web-ui:local -f apps/web-ui/Dockerfile .
```

Then deploy to kind, verify `/api/healthz`, seed demo data if needed, visually QA admin/company flows, fix deterministic issues, and commit only when verified.

## Implemented in this slice

- Internal admin Companies now has a Review drilldown that opens a read-only company workspace from real company-health and campaign-list API data.
- Company detail shows company name/id, subscribers, campaign count, scheduled reach for the next 30 days, credits, monthly send limit, quota usage, active access code, campaign history, and empty states for missing operator risk notes.
- Content Library templates now expose Use template, Copy copy, and Create campaign actions. Template use moves into Campaign Builder with message copy, campaign name, message type, and matching image media when available.
- Campaign Builder is organized into Audience, Message & media, Schedule, and Review/estimate sections while preserving campaign creation headers (`X-Company-Id`, `X-User-Email`).
- Company Analytics now summarizes scheduled reach, campaign counts, message volume, subscriber/list counts, clicks/redemptions, quota usage, and campaign rows from existing loaded data.
- Internal Usage now surfaces top tenant by message volume, scheduled reach, highest quota usage, and marketable subscriber rollups above the detailed tables.
- Campaign dates in cards/tables use local human-readable date/time, user-facing campaign UUIDs are de-emphasized, and manual tracking-link creation is behind an Advanced / Developer tools disclosure.
- README demo steps were updated for the admin review, template-to-campaign, and analytics flows.

## Targeted tests added

- Admin Review opens Demo Retail Co detail and renders health fields plus campaign history.
- Content Library Use template moves to Campaign Builder and preloads Weekend Flash Sale MMS copy, Smart SMS type, and media.
- Company Analytics renders scheduled reach, subscriber-list, message-volume, and campaign-summary data.
- Internal Usage renders top tenant, scheduled reach, and quota health summaries.
