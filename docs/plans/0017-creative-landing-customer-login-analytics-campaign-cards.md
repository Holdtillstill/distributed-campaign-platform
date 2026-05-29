# Creative Landing, Customer Login Naming, Analytics Data, and Campaign Card Readability

## User feedback

- "Landing page too simple. I'd like a creative/tasteful design"
- "Customer app should be called customer login instead?"
- "Analytics charts have no data btw."
- "Campaign li design too simple. Make it prettier with better readability."

## Current findings

- Landing page (`MarketingPage.tsx`) is clean but generic: simple nav, basic hero, product summary card, repeated bordered cards. It needs a memorable, tasteful CampaignOS visual concept.
- Top nav already says `Customer login`, but other links/CTAs still say `Customer app`, `Open customer app`, etc. Public-facing CTAs should use `Customer login` where they open `/app` sign-in/access surface. Inside authenticated app, `Customer workspace` is still acceptable.
- Analytics page currently shows generic mini chart bars and says `No data yet` when `performance` is absent, even though tenant has campaign, scheduled reach, credits, subscribers, and modeled audience data. The user is right: charts feel fake/empty.
- Campaign lists are rendered in `CampaignColumn` as plain `<li>` rows with many spans. Readability is weak.

## Design references

Use the existing CampaignOS brand and recent polish, but increase taste/creativity.

- Stripe-like premium hero: layered depth, gradient atmosphere, lightweight typography, rich product visual.
- Intercom-like warmth for helpful copy and strong conversational landing sections.
- Keep the product credible for a senior AWS/Kubernetes/platform portfolio — not goofy or toy-like.

## Scope

Focused frontend slice only. No backend/schema changes expected.

Routes to keep stable:

- `/`
- `/app`
- `/monitor`
- `/app/monitor`
- `/internal`
- `/kb`
- `/features`
- `/features/*`
- `/design-review`, `/designs`
- `/1`-`/5`
- `/app-designs/1`-`/app-designs/10`

Do not touch unrelated untracked files:

- `docs/one-week-senior-platform-crash-course.md`
- `docs/study-guide.md`

Do not commit.

## Requirements

### 1. Creative/tasteful landing page

Redesign the real `/` landing page, not just exploration routes.

Make it feel like a polished, memorable product page for a multi-tenant SMS campaign platform:

- Stronger value-prop headline, not just `CampaignOS` as the h1. Keep product name visible.
- Tasteful hero concept: layered product UI cards, SMS message bubbles, routing lines, tenant/workspace chips, broadcast status, credit meter, or similar.
- More atmospheric background: controlled gradient, subtle grid, radial glow, campaign-flow line art. Avoid noisy/AI slop.
- Better CTA hierarchy: primary `Customer login`, secondary `Feature tour`, smaller links for KB/API if needed.
- Replace/rework repetitive card rows with more visual storytelling:
  - workflow/timeline: tenant setup -> customer workspace -> credit-aware sending -> live monitor/reporting
  - proof/status strip: 2.65M modeled subscribers, live monitor, role budgets, TCPA-aware readiness, observability.
- Keep public links to `/features`, `/kb`, `/monitor`, `/internal`, API docs.
- Add/adjust tests for new landing headline/CTA text.

### 2. Customer app naming

Use `Customer login` for public-facing route links that take unauthenticated users to `/app`.

Examples:

- Marketing nav/button: `Customer login`.
- `/features` nav or hero link currently `Customer app` / `Open customer app` should become `Customer login` or `Open customer login` where appropriate.
- `/kb` quick CTA `Open customer app` should likely become `Customer login`.
- `/design-review` can say `Customer login / workspace` or clarify recommendation.
- Inside authenticated app shell, `Customer workspace` / `Company workspace` remains fine.

Update tests accordingly, but avoid breaking expectations around authenticated app labels.

### 3. Analytics charts should have data

Fix analytics so charts are not meaningless empty bars.

Use available frontend data to create truthful chart series even when no backend performance object exists:

- Campaign message counts by campaign/status/date.
- Scheduled reach / modeled audience by campaign.
- Credit costs by campaign.
- Follow-up/reminder counts.
- Click/redemption can show empty/zero state if actually zero, but should not make all charts appear dead.

Improve chart cards:

- include actual values/labels from loaded campaigns where possible.
- distinguish `Projected from campaign schedule` vs `Tracked performance after sends`.
- if data truly absent, show an intentional empty state with explanation and next action.
- Do not fabricate tracked clicks/redemptions as real; use projections/sample/scheduled data honestly.
- Add tests that analytics chart cards show non-empty values/labels when campaigns exist.

### 4. Prettier, more readable campaign list design

Replace the plain compact `<li>` campaign rows with richer campaign cards.

Each card should improve readability with:

- clear campaign title and status badge
- scheduled/created dates grouped
- message body preview readable but not overwhelming
- modeled audience, sample messages, credits, follow-ups as compact stats
- visual hierarchy between upcoming/past/status
- CTA/action area (`Modify campaign`) not buried
- possibly progress/credit/reach visual indicator
- better empty states

Use tasteful styling consistent with the stronger app polish. Add tests that key labels/content still render.

## Validation

Run before stopping:

```bash
cd apps/web-ui && npm test -- --run && npm run build
cd ../..
. .venv/bin/activate && ruff check . && python -m pytest -q
docker build -t web-ui:local -f apps/web-ui/Dockerfile .
```

If backend is unchanged, say so explicitly.

## Controller browser QA

After deployment, verify:

- `/` landing page visually: creative/tasteful, not too simple, CTA hierarchy good.
- `/features` and `/kb`: public `/app` links now say customer login where appropriate.
- `/app` authenticated -> Analytics: charts show scheduled/campaign data instead of dead empty bars.
- `/app` authenticated -> Campaigns overview/scheduled/past: campaign cards are readable and prettier.
- `/design-review` still works.
