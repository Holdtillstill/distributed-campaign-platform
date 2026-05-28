# Customer User Guide

## Access The App

Open the customer app:

- Compose: <http://127.0.0.1:8080/app>
- kind: <http://127.0.0.1:18080/app>

You can sign up with a company access code or look up existing memberships by work email.

## Sign Up With An Access Code

1. Enter your work email.
2. Enter your full name.
3. Enter the access code from your company admin or internal operator.
4. Select Sign up with access code.
5. The app opens your company workspace.

If the code fails, check that the code is active and belongs to the expected company.

## Log In With Existing Membership

1. Enter your work email in the membership lookup form.
2. Select Find memberships.
3. Choose the company workspace to open.

## Dashboard

The dashboard summarizes:

- Monthly send limit and credits.
- Subscriber count.
- Campaign count and message volume.
- Clicks and redemptions.
- Upcoming and recent campaign activity.

Use it to check whether there is enough credit before scheduling sends.

## Subscribers

Use Subscribers to manage audience records:

1. Create a subscriber list for a region, store group, or campaign segment.
2. Import a subscriber with phone number, source, and optional list.
3. Review consent and marketing status before sending.
4. Use double opt-in flows when consent confirmation is required.

For production use, only import subscribers with documented SMS consent.

## CSV Import Guidance

The demo UI models import fields rather than full file upload processing. Prepare CSV data with at least:

- `phone_number`
- `source`
- `list_name` or `list_id`
- consent evidence fields for production systems

Normalize phone numbers before import and remove duplicates.

## Content Library

Use Content Library to register media assets and templates:

1. Add filename, content type, and URL for media assets.
2. Use templates to prefill campaign copy.
3. Select media when creating smart SMS campaigns.

Smart SMS campaigns cost more credits because they include tracking and media/link workflow support.

## Campaign Scheduling

1. Open Campaigns.
2. Choose regular SMS or smart SMS.
3. Enter a campaign name and body.
4. Select recipients, subscriber lists, or use the demo default recipients.
5. For smart SMS, select a media asset.
6. Optionally set a scheduled time.
7. Submit the campaign.

The API calculates audience count, message count, credit cost, remaining credits, and status counts.

## Follow-Ups

Use Follow-ups to create reminder campaigns from prior campaigns:

- `not_clicked`: targets subscribers who have not clicked.
- `clicked_not_redeemed`: targets subscribers who clicked but have not redeemed.

Review estimated recipient count before creating a reminder.

## Analytics

Company analytics includes:

- Media asset count.
- Tracked link count.
- Click count.
- Redemption count.
- Campaign summary rows.

Use this view to compare smart SMS engagement and follow-up outcomes.

## Settings And Team Access

Company admins can create access codes and update team member budgets.

Recommended operating pattern:

- Give each new user a role-specific access code.
- Set credit limits for delegated users.
- Review team usage before increasing limits.
- Rotate or disable access codes in a production implementation.

## API Docs

Open API docs from the app header or:

- Compose: <http://127.0.0.1:8080/api/docs>
- kind: <http://127.0.0.1:18080/api/docs>

The proxied docs load schema from `/api/openapi.json`.
