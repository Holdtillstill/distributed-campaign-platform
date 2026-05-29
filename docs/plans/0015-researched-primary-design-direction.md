# Researched Primary Design Direction

> Controller workflow: Hermes researches, delegates implementation to Codex, validates/deploys/browser-QAs, and commits only after verification.

## User request

Research how similar products design customer engagement/SMS campaign platforms, then do what seems best, while keeping other options available for review.

## Research signals collected

Tooling note: configured web search/extract services were partially unavailable, so research used direct lightweight HTTP fetches plus design-system references.

### Competitor/product patterns

From Braze product page text:

- Customer engagement platforms organize around: data activation, segmentation, orchestration, relevance, cross-channel messaging, AI/insights.
- Emphasis on dynamic audiences, customer insights, flexible segmentation, journeys, reporting/analytics, creative workflows.
- Strong positioning: one place for data, channels, journey orchestration, and performance insight.

From Klaviyo SMS marketing page text:

- SMS product is part of broader B2C CRM.
- Core surfaces: campaigns, AI SMS assistant, automation, personalization, segmentation, lists, templates, RCS/email/mobile-app channels, analytics/data platform.
- Marketing copy emphasizes omnichannel customer relationships and real-time data syncs.

From Twilio/Segment/Twilio SMS text:

- Product architecture: unify customer data, audiences, journeys, channels, messaging, reliable deliverability, privacy, analytics.
- SMS API/product emphasizes delivery monitoring, troubleshooting, engagement, real-time analytics.

### Design-system references

- Linear: best reference for everyday SaaS shell — precise, subdued, engineered, low-noise hierarchy.
- Sentry: best reference for live ops/monitoring surfaces — dark, data-dense, status/error/throughput first.
- Intercom: best reference for warm customer-facing support/KB/marketing materials — approachable and clear.

## Product decision

Do not choose one visual variant wholesale.

Use a composite:

1. **Primary customer app**: evolve toward `/app-designs/6` Minimal Enterprise Workspace.
   - Everyday customer SaaS should be calm, trustworthy, efficient, role/budget-aware.
   - Use clean sidebar, restrained cards, strong page headers, clear command surfaces.

2. **Broadcast monitor**: evolve toward `/app-designs/7` Realtime Broadcast War Room.
   - Monitoring is an operational exception surface; it can be darker, more urgent, throughput/status oriented.
   - Make queued/sent/failed/retry/dead-letter/ETA prominent.

3. **Internal admin**: evolve toward `/app-designs/10` Agency Multi-tenant Console.
   - Admin/operator mode should emphasize tenant switching, quotas, health, usage, access codes, and cross-tenant oversight.

4. **KB/marketing**: keep Intercom-like warm public surfaces but make sure nav connects to product proof.

5. **Options available for review**:
   - Preserve `/1`-`/5` marketing/design explorations.
   - Preserve `/app-designs/1`-`/10` full-app explorations.
   - Add a clear design review/index route if feasible, e.g. `/design-review`, listing recommended primary direction and all options.

## Implementation requirements

### A. Primary app design refinements

Improve the real `/app` surfaces using the researched composite, without breaking functionality:

- Add a calmer, more enterprise-grade shell/header inspired by `/app-designs/6`.
- Make Dashboard feel less like stacked demo cards and more like a command surface:
  - today's decisions
  - active campaign/broadcast state
  - budget/credit posture
  - audience/segment posture
  - analytics/reporting summary
  - next action cards
- Keep role/budget identity visible.
- Preserve invite/access-code auth framing.

### B. Broadcast monitor refinement

For real `/monitor` and Campaigns → Monitor:

- Use stronger `/app-designs/7` war-room cues inside the actual monitor section.
- Make live metrics more prominent: queued, sent, failed, retried, dead-lettered, throughput, ETA, percent complete.
- Add clearer status semantics and help text.
- Keep monitor guide/feature links.
- Do not fake real-time streaming; use current refresh API honestly.

### C. Internal admin refinement

For `/internal` after login:

- Borrow from `/app-designs/10` where practical:
  - tenant health overview
  - quota/credit posture
  - active access code handoff
  - tenant table scanability
  - operator identity
- Do not break existing admin pages.

### D. Design review route

If feasible, add `/design-review` or `/designs` as a lightweight index that explains:

- Recommended production composition:
  - customer app = /app-designs/6 direction
  - broadcast monitor = /app-designs/7 direction
  - internal admin = /app-designs/10 direction
  - KB/marketing = current /kb + /features
- Links to all options:
  - `/1`-`/5`
  - `/app-designs/1`-`/10`
  - `/app`, `/monitor`, `/internal`, `/kb`, `/features`

### E. Tests

Add/update tests for:

- design-review route if added
- `/app` dashboard command surface copy/links
- `/monitor` prominent metric/help sections
- `/internal` admin operator/tenant controls still render
- all existing routes continue to render

## Validation

```bash
cd apps/web-ui && npm test -- --run && npm run build
cd ../..
. .venv/bin/activate && ruff check . && python -m pytest -q
docker build -t web-ui:local -f apps/web-ui/Dockerfile .
```

## Browser QA

- `/app` owner login/dashboard
- `/monitor` with owner session
- `/internal` admin login
- `/design-review` if added
- `/kb`, `/features`
- `/app-designs/6`, `/app-designs/7`, `/app-designs/10`
