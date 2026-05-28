# Full-App Design Systems and Functional QA Plan

> **For Hermes:** Use Codex/controller workflow. Codex implements; Hermes validates, deploys, browser-QAs, and commits only after verification.

## User request

- Design the frontend for **all pages**, not just landing pages.
- Create **5-10 different full-app design directions**.
- Test all elements/functions of the app.
- Make the real-time broadcast monitor easy to find.
- Clarify admin login.

## Current known credentials / routes

- Customer app: `http://127.0.0.1:18080/app`
- Customer owner email: `owner@demo-retail.test`
- Customer invite/access code: `DEMORETA-E568C9`
- Internal admin: `http://127.0.0.1:18080/internal`
- Internal admin email: `ops@example.test`
- Current broadcast monitor location: `/app` → sign in → `Campaigns` → `Monitor` tab.

## Product decisions for this slice

1. Keep `/1`-`/5` as portfolio landing/design explorations.
2. Add **full-app theme/design previews** for actual authenticated screens, not only landing pages.
3. Prefer 5 full-app design directions first; support up to 10 via routes if time permits.
4. The real app at `/app` should remain stable and usable.
5. Add a clear route/CTA for broadcast monitoring:
   - either `/monitor` deep link, `/app/monitor`, or route-state support that lands directly on Campaigns → Monitor.
   - Update demo credentials/docs to mention it.
6. Add stronger frontend functional tests for the actual app flows.

## Desired design variant routes

Add routes such as:

```text
/app-designs/1
/app-designs/2
/app-designs/3
/app-designs/4
/app-designs/5
```

Optional if feasible:

```text
/app-designs/6 ... /app-designs/10
```

Each route should show a coherent **full authenticated SaaS shell** including:

- sidebar/top nav
- dashboard
- campaigns/broadcast monitor surface
- subscribers/segments
- analytics
- settings/team/budget card
- role/budget identity treatment

The variants should differ in information architecture, density, typography, color, and interaction metaphors. Avoid five recolors of the same grid.

## Suggested full-app design directions

1. **Operator Console** — dark SRE/control-room app for live broadcast operations.
2. **Executive SaaS** — bright premium admin/customer SaaS with refined cards and dashboards.
3. **Campaign Studio** — creative marketing workflow with content/template focus.
4. **Data Command Center** — dense analytics/monitoring, tables, heatmaps, throughput.
5. **Retail Ops Workspace** — practical day-to-day manager UI with segments, budgets, approvals.
6. Optional: **Minimal Enterprise** — quiet, Notion/Linear-like role workspace.
7. Optional: **Realtime War Room** — broadcast monitor as primary product surface.
8. Optional: **Mobile-first Field Manager** — responsive compact operational view.
9. Optional: **Compliance-first** — consent, audit, role, risk, approvals front and center.
10. Optional: **Agency Multi-tenant** — internal/operator plus customer tenant switching.

## Functional/element test scope

Add/expand Vitest coverage for:

- `/app` signed-out access page renders demo helper and both flows.
- owner email lookup renders membership card with role/budget and opens workspace.
- internal admin login with `ops@example.test` opens internal shell.
- dashboard quick actions navigate correctly and respect read-only restrictions.
- campaigns filters work: search, status, date, clear.
- campaign builder shows audience/budget estimate and disables restricted roles.
- broadcast monitor tab fetches monitor endpoint, shows throughput/progress/ETA, refreshes, and handles empty/error states.
- settings invite flow creates access code with role/budget.
- settings read-only user sees restricted controls and no invite/edit buttons.
- subscribers search/list filters render and pagination/sample text works.
- `/1`-`/5` still render.
- new `/app-designs/1`-`/app-designs/5` render unique full-app designs.

## Dogfood/browser QA checklist after implementation

- Verify current frontend bundle is deployed.
- Visit `/app`, `/internal`, `/1`-`/5`, and new app-design routes.
- Sign in owner; open Campaigns → Monitor and verify live monitor contents.
- Use direct monitor route/deep link if added.
- Simulate viewer role and verify disabled controls.
- Login internal admin and verify admin dashboard/companies/usage remain usable.
- Check console after each navigation and interaction.

## Validation commands

```bash
cd apps/web-ui && npm test -- --run && npm run build
cd ../..
. .venv/bin/activate && ruff check . && python -m pytest -q
docker build -t web-ui:local -f apps/web-ui/Dockerfile .
```
