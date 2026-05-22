# UI + Engagement Feature Roadmap

Goal: every SaaS capability should be usable from the web UI, not just curl/API.

## Scope

### Existing APIs that need UI now
- Internal admin company creation: `POST /admin/companies`
- Current user memberships: `GET /me/memberships`
- Company-scoped campaign creation: `POST /campaigns` with `X-Company-Id`
- Subscriber list creation: `POST /companies/{company_id}/subscriber-lists`
- Company-provided subscriber import: `POST /companies/{company_id}/subscribers`
- Public double opt-in request: `POST /public/opt-ins`
- Double opt-in confirmation: `POST /public/opt-ins/{token}/confirm`

### Upcoming APIs/features that need both API and UI
- Media content library: upload/register campaign images and list assets.
- Tracked campaign URLs: create unique subscriber/campaign links and record clicks.
- Landing page rendering: display campaign media/message for tracked URL.
- Redeem flow: subscriber clicks redeem; customer sees redemption counts.
- Reminder campaigns: send follow-up to subscribers who have not clicked/redeemed.
- Internal admin volume dashboard: customer message/click/redeem volumes by timeframe.

## Implementation order

1. Web UI foundation for existing tenant/subscriber/consent APIs.
2. API + UI for media library and tracked campaign links.
3. API + UI for click/redeem analytics.
4. API + UI for reminder audience builder.
5. API + UI for internal admin usage dashboard.

## Quality gates

- Use TDD for each slice: failing tests first, then implementation.
- Web UI tests with Vitest + React Testing Library.
- API unit tests with pytest.
- Run: `npm test -- --run`, `npm run build`, `ruff check .`, `python -m pytest -q`.
- Commit each coherent slice separately.
