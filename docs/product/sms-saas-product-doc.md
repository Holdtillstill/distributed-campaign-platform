# SMS SaaS Product Doc

## Overview

CampaignOS is a multi-tenant SMS campaign SaaS for contracted brands, retail operators, and regional marketing teams. The product models tenant onboarding, credit limits, subscriber consent, media-backed smart SMS campaigns, tracked links, follow-up campaigns, and cross-tenant usage review.

The current portfolio implementation is local-first and simulator-backed. It does not send real SMS traffic or integrate with paid provider APIs. Provider delivery is represented by the provider simulator and dispatcher status transitions. Demo Retail Co uses a scale-aware audience model: local Postgres stores searchable sample subscribers and message rows, while subscriber lists and campaigns store modeled audience counts for million-scale product surfaces.

## Personas

- Internal operator: creates customer companies, assigns monthly send limits and credit balances, issues access codes, reviews tenant health, and checks platform readiness.
- Company admin: signs up with an access code, manages subscriber lists, imports contacts, manages media, creates campaigns, reviews analytics, and creates team access codes.
- Campaign manager: works inside an existing company workspace to build campaigns, use templates, and monitor campaign outcomes within assigned budget limits.
- Executive reviewer: inspects dashboards, usage, campaign performance, and observability evidence during demos or platform reviews.

## Roles

- `internal_admin`: cross-tenant admin surface for company creation, access code handoff, usage reports, and health review.
- `customer_admin`: company-level owner role that can onboard users, configure budgets, and run campaigns.
- `campaign_manager`: company user role intended for campaign execution with optional credit limits.
- `regional_manager`: company user role intended for delegated regional campaign activity.

## Key Workflows

1. Internal operator creates a company with a slug, initial admin email, monthly send limit, and credit balance.
2. The app returns an access code for the initial company admin.
3. Company admin signs up with the access code and lands in the company workspace.
4. Company admin creates subscriber lists and imports subscribers from CSV-style inputs.
5. Company admin uploads or registers media assets for smart SMS campaigns.
6. Company admin searches/paginates subscriber samples or selects modeled lists for regular or smart campaigns.
7. Campaign API writes local sample messages, stores modeled audience metadata, calculates local sample credit cost, and publishes dispatch jobs when NATS is configured.
8. Dispatcher sends jobs to the provider simulator and updates status to sent, retried, failed, or dead-lettered.
9. Company users monitor active/recent broadcasts with actual message status counts, local sample progress, modeled audience reach, throughput, and ETA.
10. Company users review campaign analytics, tracked links, redemptions, and follow-up candidates.
11. Internal operators review tenant health, credit risk, modeled scheduled reach, and platform readiness.

## Compliance And Consent Assumptions

This project models consent states and opt-in flows for demo purposes only. Production SMS compliance would require additional policy, audit, and legal controls:

- Consent source, timestamp, IP address, user agent, and opt-in confirmation should be retained as audit evidence.
- STOP/HELP keyword handling, suppression lists, and provider webhook ingestion are required before real sending.
- Message bodies should be reviewed for regulated content, quiet hours, sender identity, and regional restrictions.
- CSV import should validate consent source before a subscriber becomes marketable.
- Tenant data must remain isolated by company id across API, database, analytics, and logs.

## Analytics Model

The current model tracks:

- Company dashboard summary: subscribers, campaigns, messages, credits used, clicks, and redemptions.
- Campaign status counts: queued, sent, failed, retried, and dead-lettered.
- Broadcast monitor: modeled audience, local sample message count, mode, status counts, percent complete, throughput, ETA, started time, and last updated time.
- Campaign performance: media assets, tracked links, clicks, redemptions, and reminder campaigns.
- Admin usage: campaign count, message count, media count, tracked link count, clicks, redemptions, and reminders by tenant.
- Admin health: subscriber count, scheduled reach, credits remaining, monthly send limit, quota usage, and active access code.

## Scale Semantics

- `subscriber_lists.estimated_subscriber_count` is the durable modeled audience size for a list.
- `subscriber_count` in list responses is product-facing and uses the larger of modeled audience or loaded sample count.
- `sample_subscriber_count` preserves the actual local membership rows available for search, imports, and local campaign fan-out.
- `campaigns.modeled_audience_count` stores the modeled total audience at campaign creation or seed time.
- `messages` remains the source of truth for actual queued/sent/failed/retried/dead-lettered delivery rows.
- Broadcast monitor `mode` is `actual` when modeled and sample counts match, or `projected/sample` when the local demo processes a sample while presenting million-scale reach.

## Roadmap

- Provider webhooks for delivery receipts and inbound STOP/HELP handling.
- Tenant settings for sender identity, quiet hours, compliance footer, and suppression policy.
- Template approval workflow and content review states.
- Per-user permissions enforced consistently across every write operation.
- Real dashboard panels for trace latency, queue depth, retry rate, and campaign conversion.
- CI gates for Helm rendering, frontend build, Python tests, lint, and container builds.
- Optional EKS deployment path with external secrets, IRSA, ingress, TLS, and managed storage.
