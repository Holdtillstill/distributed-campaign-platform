# Full App Design, Sign-in, RBAC, Invites, and Budget Ownership Plan

> **For Hermes:** Use Codex/controller workflow to implement this plan slice-by-slice, with live browser QA before commit.

**Goal:** Make the real customer/internal app — not only landing pages — feel like a credible role-based SMS SaaS with sign-in, invites, permission-aware navigation, segment ownership, and allocated campaign budgets.

**Architecture:** Use the existing lightweight demo-auth backend primitives (users, roles, memberships, access codes, credit limits, credits used) and make them product-legible in the frontend. Avoid pretending there is password/OAuth security unless implemented; frame the current demo flow as invite/access-code based workspace access. Add low-risk backend enforcement only where needed and testable.

**Tech Stack:** FastAPI + asyncpg backend, Vite/React frontend, Vitest/Pytest, local kind deployment.

---

## Product reality to model

Current state:
- Existing users can type an email, retrieve memberships, and click “Open”.
- New users can join with an access code.
- Company owner/admin can generate access codes and update team roles/budgets in Settings.
- Roles exist: `customer_admin`, `campaign_manager`, `regional_manager`, `analyst`, `viewer`.
- Memberships have `credit_limit` and `credits_used`.
- There is no password/OAuth; do not imply real password auth.

Target demo story:
- Demo sign-in should feel like a real invite-based SaaS: enter email, choose workspace, see role/budget before opening.
- Owners/admins can invite teammates by role and budget allocation.
- Campaign managers can build/schedule campaigns within budget.
- Regional managers have an allocated market/segment/budget story.
- Analysts/viewers see reporting/read-only affordances and disabled restricted actions.
- Internal admins manage tenants, health, quotas, and observability.
- The whole app shell/design should be elevated, consistent, tasteful, and role-aware.

## Real-life cases to cover

1. **Owner/admin invites a marketer**
   - Owner creates an invite/access code for `campaign_manager` with 25k credits.
   - UI explains that the recipient joins with code and inherits permissions/budget.
   - Team table shows role, budget, used credits, remaining credits, and actions.

2. **Regional manager for a market segment**
   - Regional manager owns a market/lists such as “Seattle VIP Customers” and a smaller budget.
   - UI should surface “Market scope / allocated budget” in shell/dashboard/settings.
   - If true segment-level ACL is too large, model it visibly as role guidance and acceptance criteria for next slice.

3. **Campaign manager schedules campaign**
   - Builder shows projected audience, sample rows, credit cost, user budget, and remaining allocation.
   - If budget would be exceeded, UI should warn/disable send where feasible.

4. **Analyst/viewer opens workspace**
   - Navigation and cards should communicate read-only/reporting permissions.
   - Restricted actions should be hidden or disabled with explanation.

5. **Internal operator**
   - Internal side should retain tenant control, health, quotas, and observability links.

## Phase 1 acceptance criteria

- `CustomerAccessPage` redesigned to explain:
  - existing invited user sign-in by email + workspace selection
  - new user joins with invite/access code
  - demo credentials are visible enough for portfolio evaluation but not ugly
- `AppShell` shows company, user email, role label, permission summary, budget usage if available.
- Company app pages visually redesigned consistently beyond landing pages:
  - dashboard
  - campaigns
  - subscribers
  - content library
  - analytics
  - settings/team
- Settings/team page clearly supports invite/access-code generation, roles, and credit budgets.
- Permission-aware UI:
  - admins can invite/edit team users
  - campaign managers/regional managers can campaign-build
  - analysts/viewers get read-only/reporting-oriented messaging and disabled restricted actions
- Tests prove:
  - invited user flow renders membership/workspace selection
  - settings invite flow shows role/budget/access code
  - non-admin roles see restricted/disabled invite controls or explanatory text
  - campaign builder shows projected audience + budget context
- Do not break `/1`–`/5`, `/app`, `/internal`, `/api/docs`.

## Guardrails

- Do not implement real password auth unless doing the full secure version with hashing/session tokens. For this slice, name it “demo workspace access” or “invite/access-code access”.
- Do not overbuild tenant segment ACL tables unless the slice can be tested quickly. If needed, make segment ownership a visible product model/backlog item.
- Do not touch unrelated files: `docs/one-week-senior-platform-crash-course.md`, `docs/study-guide.md`.
- Do not commit from Codex; controller will validate and commit.

## Validation commands

```bash
cd apps/web-ui && npm test -- --run && npm run build
cd ../..
. .venv/bin/activate && ruff check . && python -m pytest -q
docker build -t web-ui:local -f apps/web-ui/Dockerfile .
```

## Live QA checklist

- `/app` signed out screen reads as invite/workspace access, not “type email and magically open”.
- Login with `owner@demo-retail.test` shows Demo Retail Co, role `customer_admin`, budget/credits.
- Open workspace and confirm app shell role/budget card.
- Settings page: create invite/access code with role + budget; team table looks credible.
- Test viewer/analyst session via localStorage or signup code and confirm restricted actions are disabled/hidden.
- Campaign builder: projected audience and user/company budget context are visible.
- `/1`–`/5` still render.
