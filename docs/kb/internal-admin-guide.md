# Internal Admin Guide

## Access

Open the internal admin surface:

- Compose: <http://127.0.0.1:8080/internal>
- kind: <http://127.0.0.1:18080/internal>

In the current demo, any email can start an internal admin session. Production access would require identity provider authentication and role enforcement.

## Dashboard

The dashboard shows:

- Active company count.
- Subscriber totals across visible tenants.
- Messages this month.
- Scheduled reach.
- Credits remaining.
- Active access code count.
- Tenant health.
- Quota risk.
- System status and observability links.

Use Refresh checks to call liveness, readiness, metrics, and trace-smoke endpoints.

## Create A Company

1. Open Companies.
2. Enter company name and slug.
3. Enter the initial admin email.
4. Set monthly send limit.
5. Set starting credit balance.
6. Submit Create company.
7. Copy the returned access code and send it to the initial company admin through an approved channel.

The access code creates a company user membership when used on the customer app surface.

## Review Company Health

Company health shows:

- Subscriber count.
- Campaign count.
- Scheduled reach.
- Credits remaining.
- Monthly limit.
- Quota usage.
- Active access code.

Select Review on a tenant to inspect its workspace summary and campaign history.

## Usage Review

Open Usage and load a date range to review:

- Campaign count.
- Message count.
- Media assets.
- Tracked links.
- Clicks.
- Redemptions.
- Reminder campaigns.

Use this during account reviews, quota discussions, and platform demos.

## Access Codes

Access codes are the primary onboarding handoff in this demo. Treat them as sensitive:

- Share codes only with intended company admins or users.
- Record who received each code in production.
- Prefer short expiration windows in production.
- Rotate or revoke unused codes in production.

## Tenant Health Checks

Review tenant health when:

- Scheduled reach is high compared with monthly limit.
- Credits remaining are low.
- Quota usage approaches contract limits.
- A tenant has no active access code but needs onboarding.
- Campaign counts or reminders spike unexpectedly.

## Observability During Review

Use the Dashboard System Status panel:

1. Click Refresh checks.
2. Confirm liveness and readiness are ok.
3. Confirm Prometheus metrics responds.
4. Confirm Trace smoke responds.
5. Open Grafana, Tempo Explore, or Prometheus from the panel links.

For full trace troubleshooting, see [Observability Runbook](../runbooks/observability.md).

## Review Workspace

The Review action on a company row opens a focused tenant workspace for internal inspection. Use it to verify:

- Correct company id and name.
- Credits and monthly limits.
- Active access code.
- Recent campaigns.
- Upcoming scheduled campaigns.
- Smart SMS and reminder usage.

Do not edit customer campaign content from the internal surface unless a production support workflow explicitly permits it.
