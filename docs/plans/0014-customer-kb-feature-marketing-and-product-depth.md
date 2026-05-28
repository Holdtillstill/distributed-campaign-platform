# Customer Knowledge Base, Feature Marketing, and Product-Depth Plan

> **For Hermes:** Implement after validating/committing the full-app design systems slice. Use Codex for implementation, then controller validates/deploys/browser-QAs/commits.

## User request

- Let the user know when design/test work is done.
- Implement all practical features that make sense for the portfolio SaaS.
- Add a customer knowledge base.
- Add marketing pages that advertise real product features.

## Product priorities

1. Keep `/app` and `/internal` stable.
2. Keep `/1`-`/5` and `/app-designs/*` design explorations available.
3. Add real product-facing documentation/help surfaces.
4. Add feature marketing routes that advertise implemented capabilities.
5. Add tests for routes, CTAs, search/filter, and key app functions.

## Customer knowledge base

Add a route such as:

```text
/kb
/help
```

Preferred: `/kb` with optional article anchors or simple article route-state.

Content should be useful and specific, not lorem ipsum. Include categories/articles for:

- Getting started with Demo Retail Co
- Invite/access-code sign-in
- Roles and permissions
- Inviting teammates
- Budgets and credits
- Creating and scheduling campaigns
- Live broadcast monitor and throughput
- Subscriber segments and modeled audience counts
- Analytics and reporting
- Consent/compliance basics
- Internal admin / tenant operations overview
- Troubleshooting common issues

Nice-to-have frontend features:

- category filters
- search field
- featured articles
- article cards
- CTA back to `/app`, `/app/monitor`, `/features`, `/internal`
- “demo credentials” helper panel

## Feature marketing pages

Add one or more routes:

```text
/features
/features/broadcast-monitor
/features/audience-segments
/features/role-based-access
/features/analytics
/features/compliance
```

If time is limited, a rich `/features` page with anchor sections is acceptable.

Advertise real implemented capabilities:

- 2.65M modeled subscribers with representative sample rows
- live broadcast monitor with throughput/progress/ETA
- campaign builder and scheduling
- campaign filters and monitor tab
- role-based invites, permissions, and budget allocation
- customer settings/team controls
- internal admin tenant management
- analytics/reporting
- consent/compliance positioning
- Grafana/Tempo observability for platform operators

## Product-depth features to add if feasible

Prioritize small, testable frontend improvements:

- direct “Open broadcast monitor” CTA from dashboard and marketing/features pages
- route `/app/monitor` and/or `/monitor` that lands on Campaigns → Monitor
- KB links inside the app shell/header/settings
- feature links from marketing home to `/features` and `/kb`
- settings helpful empty/pending invite state
- monitor empty/error state polish
- campaign builder help callouts that link to KB articles

Avoid large backend schema changes unless absolutely necessary.

## Tests

Add/expand Vitest coverage:

- `/kb` renders categories, search/filter, key article titles, CTAs
- `/features` renders major features and CTAs to app/monitor/kb/internal
- `/features/broadcast-monitor` if added
- `/app/monitor` or `/monitor` direct route works
- KB search/filter works
- marketing nav links expose features/KB
- existing `/app`, `/internal`, `/1`-`/5`, `/app-designs/1`-`/app-designs/5` still render

## Validation

```bash
cd apps/web-ui && npm test -- --run && npm run build
cd ../..
. .venv/bin/activate && ruff check . && python -m pytest -q
docker build -t web-ui:local -f apps/web-ui/Dockerfile .
```

## Browser QA

- `/features`
- `/features/broadcast-monitor` if added
- `/kb`
- `/app/monitor` or `/monitor`
- `/app` owner login, dashboard, settings, campaigns monitor
- `/internal` admin login
- `/1`-`/5`
- `/app-designs/1`-`/app-designs/5`
