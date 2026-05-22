# SMS SaaS product depth pass

## User feedback

- Subscribers need to be visible: either full list or meaningful segments/regions/lists.
- Demo customer should be pre-populated with subscribers and realistic content.
- Subscriber import should support CSV.
- Follow-up/reminders do not belong on the main Campaigns page; they should live in a subpage/tab or inside campaign create/modify workflows.
- Media content should look like real marketing content, not placeholder URLs.
- Internal admin needs richer company-level analytics: breakdown by company, scheduled campaign reach for the next 30 days, quotas/credits, subscribers, and usage.

## Market research notes

Comparable SMS/customer-engagement SaaS patterns from Klaviyo, Attentive, Postscript, SimpleTexting, and Braze:

- Contacts/subscribers are central objects with segments/lists, attributes, consent status, and import workflows.
- Campaigns commonly have tabs for broadcasts/campaigns, automations/flows, drafts, scheduled, sent, and performance.
- Follow-ups/reminders are usually part of automations/flows or campaign detail actions, not a top-level pile on the campaigns index.
- Media/MMS content is presented as a library/template surface with real campaign-ready assets.
- Analytics focus on audience size, sends, scheduled reach, engagement, conversion/revenue/proxy outcomes, opt-outs, and quota/cost usage.
- Admin/operator views need tenant tables with health, quotas, billing/credits, usage, subscribers, scheduled reach, and alerts.

## Next implementation slice

1. Subscriber management
   - Add subscriber list/segment cards with counts.
   - Add subscriber table for selected segment/list.
   - Add CSV import UX: upload/paste CSV with phone_number, region, source/list columns if possible.
   - Preserve company-provided consent and double opt-in flows.

2. Campaign IA
   - Campaigns page tabs/subpages: Overview/Scheduled/Sent/Drafts/Builder/Follow-ups.
   - Move reminder/follow-up UI out of the main campaigns overview.
   - Add campaign detail/action patterns where feasible.

3. Content library
   - Prepopulate demo media/templates in seeded/demo fixtures or UI defaults.
   - Show marketing-ready templates: Memorial Day sale, loyalty points, winback, weekend flash sale.
   - Make media cards visually useful: preview, content type, suggested message copy.

4. Internal admin
   - Company table should show subscribers, campaign count, scheduled reach next 30 days, credits remaining, monthly limit, quota usage, active access code.
   - Add admin dashboard sections/charts for scheduled reach and quota risk.
   - Add company drill-in scaffold if feasible.

5. Testing/verification
   - TDD first: backend tests for any new endpoints, frontend tests for new UI behavior.
   - Verify frontend tests/build and full backend lint/tests.

## Local demo seed

Run the local seed after Postgres is available:

```bash
. .venv/bin/activate
python scripts/local/seed-demo-data.py
```

The script is designed to be safe to rerun. It creates or refreshes Demo Retail Co with regional subscriber lists, 12 company-provided subscribers, realistic media assets, scheduled Smart SMS campaigns, and a reusable customer admin access code:

- Customer app email: `owner@demoretail.example`
- Access code: `DEMORETAIL-ADMIN`
- Company id: `demo-retail-co`
