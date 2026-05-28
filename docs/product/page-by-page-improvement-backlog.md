# Page-by-page improvement backlog

## Priority legend

- P0: Required for a credible SMS SaaS demo or clear operational correctness.
- P1: Important polish that improves repeated customer or operator workflows.
- P2: Useful depth once the core workflows are stable.

## Current-slice completions

- P0 Done: Demo Retail Co seed now targets 1,100 deterministic subscribers across 7 realistic lists, 6 seeded campaigns, 950 campaign messages, and 560 scheduled reach. Acceptance: `tests/unit/test_demo_seed_data.py` validates scale, list diversity, current company ID, unique phone numbers, source diversity, and message/reach counts.
- P0 Done: Customer campaign workspace now has search, status, scheduled/created date-time filters, clear filters, and visible result counts. Acceptance: Vitest covers search by body, status filtering, date filtering, and reset.

## Marketing landing

Current strengths:
- Clear product positioning around multi-tenant SMS, credits, tracked links, reminders, and reporting.
- Product metric preview makes the portfolio app feel like a contracted SaaS product rather than a toy.

Gaps/friction:
- Product proof is static; it does not connect to live Demo Retail Co data or current tenant health.
- Pricing copy explains credits, but not compliance guardrails, consent, or throughput reliability.

Recommended improvements:
- P1: Replace the static product-shot metrics with a read-only live demo summary when the API is available, falling back to static values.
- P1: Add concise proof points for consent, suppression, delivery resilience, and auditability.
- P2: Add a short "operator to customer handoff" flow preview anchored to the internal/admin and customer workspaces.

Suggested implementation slices:
- Add `/public/demo-summary` or reuse safe dashboard summary data for Demo Retail Co.
- Add visual state for API unavailable so the landing still renders cleanly.

Acceptance criteria / tests:
- Marketing page renders live subscriber, campaign, and credit values when the API responds.
- Marketing page still passes when the API is unavailable.
- Test that public landing does not expose internal admin controls to anonymous users.

## Customer access/signup

Current strengths:
- Separates new-user access code signup from existing-user membership lookup.
- Membership results support opening the right company workspace.

Gaps/friction:
- Signup and lookup forms have no field-level validation state beyond a global message.
- Access code handoff lacks context such as role, credit limit, or expiration/revocation state before opening the workspace.

Recommended improvements:
- P1: Add inline validation for missing email/name/code and normalize email casing.
- P1: Show membership role, credit limit, and credits used in the membership picker.
- P2: Add "last opened company" convenience for users with multiple memberships.

Suggested implementation slices:
- Add local form validation before API calls.
- Extend membership cards with existing `role`, `credit_limit`, and `credits_used`.

Acceptance criteria / tests:
- Invalid signup inputs do not call the API and show field-specific messages.
- Membership lookup cards include role and budget fields.
- Opening a membership persists the selected company session.

## Internal login

Current strengths:
- Keeps internal console entry separate from customer access.
- Simple email-only flow is fast for a local portfolio demo.

Gaps/friction:
- No authorization proof beyond client-side session shape.
- No environment banner or reminder that this is local/demo authentication.

Recommended improvements:
- P0: Gate internal API calls consistently on backend authorization before this becomes more than a local demo.
- P1: Add visible role/session context after login in the shell, not on the login form.
- P2: Add audit event creation for internal login and company review actions.

Suggested implementation slices:
- Add a backend dependency for internal admin authorization and update tests around `X-Internal-Admin`.
- Add audit events for admin workspace actions.

Acceptance criteria / tests:
- Internal endpoints reject missing or invalid internal authorization.
- Admin dashboard tests verify authorized and unauthorized responses.
- Audit events are written for login and tenant review.

## Internal admin dashboard

Current strengths:
- Cross-tenant metrics cover active companies, subscribers, messages, scheduled reach, credits, and access codes.
- System status links make platform/SRE concerns visible.

Gaps/friction:
- Health date window is hard-coded in the admin workspace.
- Quota risk is based on total credits, not tenant-specific risk thresholds or delivery errors.
- System checks show only raw response state and do not retain last checked time.

Recommended improvements:
- P1: Add operator-controlled health window and last refreshed timestamp.
- P1: Surface tenant-level risk: quota pressure, failed/dead-lettered sends, no active access code, and low credits.
- P2: Add links from risk rows to the company review workspace.

Suggested implementation slices:
- Thread date inputs through `AdminDashboard` similar to Usage.
- Extend company health API with failed message counts and low-credit flags.

Acceptance criteria / tests:
- Changing health dates changes the API query string.
- Dashboard highlights at-risk tenants with deterministic test fixtures.
- System checks show last refresh time and preserve accessible labels.

## Internal companies/review workspace

Current strengths:
- Company creation, access code handoff, company health table, and review workspace are in one operator flow.
- Review workspace exposes subscriber count, campaign count, scheduled reach, credits, quota, access code, and campaign history.

Gaps/friction:
- Company table has no search/filtering, which will become noisy with more tenants.
- Review workspace does not include notes, owner contact, support state, or change history.
- Campaign history cannot be filtered in the internal review workspace.

Recommended improvements:
- P1: Add company search/status/quota-risk filters.
- P1: Add operator notes and handoff metadata for each tenant.
- P2: Reuse campaign filter controls in the review workspace.

Suggested implementation slices:
- Add client-side company filters first, then backend query params if tenant count grows.
- Add `operator_notes` or an `audit_events` view for tenant review.

Acceptance criteria / tests:
- Company search hides/shows tenants by name, access code, and ID.
- Review workspace loads notes/history and handles empty states.
- Internal campaign review supports date/status filtering.

## Internal usage

Current strengths:
- Usage page supports date ranges and shows tenant message, media, link, click, redemption, and reminder volume.
- Summary cards identify top tenant, scheduled reach, quota usage, and marketable subscribers.

Gaps/friction:
- Usage export is missing, which limits operator reconciliation.
- Date range has no validation for inverted or very large ranges.
- Usage rows do not expose credit cost or cost per tenant.

Recommended improvements:
- P1: Add CSV export for current usage rows.
- P1: Validate from/to dates before loading.
- P2: Add credit consumption and estimated cost fields.

Suggested implementation slices:
- Client-side CSV download from loaded usage rows.
- Add backend credit/cost rollups to `/admin/usage`.

Acceptance criteria / tests:
- Inverted date range does not call the API.
- Exported CSV includes all visible usage columns.
- Usage API and UI include credit consumption.

## Company dashboard

Current strengths:
- Tenant dashboard shows subscribers, campaigns, messages, credits, clicks, redemptions, quota, and quick actions.
- Quick actions route to the core workspace sections.

Gaps/friction:
- Recent activity chart is placeholder-only.
- Alerts empty state does not yet show quota risk, failed messages, import errors, or follow-up opportunities.
- Dashboard does not show list growth or consent health.

Recommended improvements:
- P1: Replace placeholder chart with real campaign/message activity from the API.
- P1: Add alert cards for low credits, quota pressure, dead-lettered messages, and unconfirmed opt-ins.
- P2: Add subscriber growth and consent mix metrics.

Suggested implementation slices:
- Add a small dashboard activity endpoint with daily buckets.
- Add derived alert components using existing dashboard/campaign/list data.

Acceptance criteria / tests:
- Dashboard chart renders API buckets and an empty state for no activity.
- Low-credit and failed-send fixtures render specific alert cards.
- Quick actions continue to route correctly.

## Campaigns/builder/follow-ups

Current strengths:
- Campaign workspace separates overview, scheduled, past, builder, and follow-ups.
- Builder supports segments, direct subscribers, SMS type, Smart SMS media, scheduled send time, cost estimate, and follow-up creation.
- Current slice adds search, status, date filters, body previews, result counts, and reset.

Gaps/friction:
- Builder still lists only a capped direct subscriber picklist at scale; there is no subscriber search in the builder.
- No edit/reschedule/cancel workflow despite "Modify campaign" actions.
- Follow-ups reference source campaign IDs rather than campaign names in the table.
- No delivery status breakdown in campaign history cards.

Recommended improvements:
- P0 Done: Add campaign filters and body/date visibility.
- P1: Add audience search in the builder for direct subscriber selection.
- P1: Implement cancel/reschedule for scheduled campaigns.
- P1: Show delivery counts by queued/sent/failed/dead-lettered per campaign.
- P2: Follow-up table should resolve source campaign names and show estimated lift.

Suggested implementation slices:
- Add campaign detail/status endpoint to list rows or batch status summary.
- Add `PATCH /campaigns/{id}` for reschedule/cancel with tenant authorization.
- Add direct subscriber search query param to `/companies/{id}/subscribers`.

Acceptance criteria / tests:
- Builder can find a direct subscriber by phone/source without rendering every subscriber.
- Scheduled campaign can be cancelled and disappears from scheduled reach.
- Follow-up table displays campaign names and still handles missing source campaigns.

## Subscribers/import/lists

Current strengths:
- Segment cards make list counts visible.
- Subscriber directory shows phone, source/list, consent/status, and created/imported date.
- CSV import creates lists on demand and imports rows.

Gaps/friction:
- Directory has no search, consent filter, source filter, pagination, or bulk actions.
- CSV parser is intentionally simple and does not handle quoted fields or validation reports.
- Subscribers can only belong to one visible list in the current API response, even though memberships support many lists.

Recommended improvements:
- P0 Done: Expand Demo Retail Co to a large subscriber base with realistic list counts.
- P1: Add subscriber search/filter/pagination before the directory grows beyond local-demo scale.
- P1: Add CSV validation preview with duplicate, invalid phone, and consent warnings.
- P2: Show all list memberships per subscriber.

Suggested implementation slices:
- Add backend query params for subscribers: `q`, `list_id`, `consent_status`, `limit`, `offset`.
- Replace simple CSV split with a small parser or server-side import validation endpoint.

Acceptance criteria / tests:
- Subscriber search returns matching phone/source/list rows.
- Large seeded tenant renders without a long direct-selection builder slowdown.
- CSV preview identifies invalid and duplicate rows without importing them.

## Content library

Current strengths:
- Template cards support using copy, copying copy, and creating campaigns.
- Media library supports URL and upload-style entry and shows image previews.
- Advanced tracked-link tools exist for developer/demo workflows.

Gaps/friction:
- Upload flow stores `local-upload://` placeholders rather than actual file storage.
- Templates are static and not tied to performance, segments, or compliance review.
- Advanced tools expose raw IDs and can confuse customer users.

Recommended improvements:
- P1: Add media validation and clear hosted URL vs local placeholder states.
- P1: Move advanced tracking-link tools behind a role/developer flag.
- P2: Add template categories and performance-backed recommendations.

Suggested implementation slices:
- Add media asset validation for content type and URL.
- Add role-aware rendering for advanced tools.

Acceptance criteria / tests:
- Invalid media URL/content type shows validation and does not call the API.
- Advanced tools are hidden for viewer/analyst roles.
- Using a template still preloads builder copy and Smart SMS media.

## Analytics

Current strengths:
- Analytics page summarizes scheduled reach, campaign count, message volume, lists, clicks, redemptions, and quota usage.
- Campaign analytics table shows campaign status, schedule, messages, credits, and follow-ups.

Gaps/friction:
- Charts are placeholder bars, not tied to campaign or event data.
- No date range, campaign filter, conversion rate, CTR, or revenue/proxy outcome metric.
- Analytics table does not include message body, segment, or delivery failure counts.

Recommended improvements:
- P1: Add date range and campaign/status filters mirroring the campaign workspace.
- P1: Add CTR, redemption rate, and failed-send rate.
- P2: Add drill-down from campaign row to link and reminder performance.

Suggested implementation slices:
- Extend campaign performance endpoint with date-bucketed counts.
- Reuse filter utility/state shape from Campaigns where practical.

Acceptance criteria / tests:
- Analytics date filters update metrics and table rows.
- Rate metrics handle zero denominators without `NaN`.
- Campaign row drill-down shows tracked links and reminder counts.

## Settings

Current strengths:
- Settings supports access code creation by role, credit limits, team refresh, and user permission updates.
- Tenant identity strip shows company, company ID, membership role, and credits.

Gaps/friction:
- No visible team table until refresh is clicked.
- Credit limit fields are free-text inputs, not numeric controls with validation.
- No audit trail for permission changes or access code creation.
- No tenant profile settings beyond team access.

Recommended improvements:
- P1: Load team users on page entry and validate numeric credit limits.
- P1: Add audit trail for access code and permission changes.
- P2: Add tenant profile fields: display name, billing/contact email, default timezone, quiet hours.

Suggested implementation slices:
- Trigger `refreshTeamUsers` from settings page effect.
- Add numeric input validation and disabled submit states for invalid values.
- Add read-only audit events table scoped to company.

Acceptance criteria / tests:
- Settings loads existing team without requiring manual refresh.
- Invalid credit limits do not call the API.
- Permission updates append an audit row and update the visible user list.
