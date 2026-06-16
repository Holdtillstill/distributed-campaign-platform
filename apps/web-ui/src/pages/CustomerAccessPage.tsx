import type { FormEvent } from 'react'

import { isStaticPortfolioHost } from '../api/client'
import { getRoleMeta } from '../roles'
import type { Membership } from '../types'
import { formatNumber } from '../utils'

export function CustomerAccessPage({
  signupEmail,
  signupName,
  accessCode,
  loginEmail,
  setupCompanyName,
  setupCompanySlug,
  setupAdminEmail,
  setupMonthlyLimit,
  memberships,
  authMessage,
  onSignupEmail,
  onSignupName,
  onAccessCode,
  onLoginEmail,
  onSetupCompanyName,
  onSetupCompanySlug,
  onSetupAdminEmail,
  onSetupMonthlyLimit,
  onSignup,
  onLookup,
  onCreateCompany,
  onOpenMembership,
  onInternalAccess,
}: {
  signupEmail: string
  signupName: string
  accessCode: string
  loginEmail: string
  setupCompanyName: string
  setupCompanySlug: string
  setupAdminEmail: string
  setupMonthlyLimit: string
  memberships: Membership[]
  authMessage: string | null
  onSignupEmail: (value: string) => void
  onSignupName: (value: string) => void
  onAccessCode: (value: string) => void
  onLoginEmail: (value: string) => void
  onSetupCompanyName: (value: string) => void
  onSetupCompanySlug: (value: string) => void
  onSetupAdminEmail: (value: string) => void
  onSetupMonthlyLimit: (value: string) => void
  onSignup: (event: FormEvent<HTMLFormElement>) => void
  onLookup: (event: FormEvent<HTMLFormElement>) => void
  onCreateCompany: (event: FormEvent<HTMLFormElement>) => void
  onOpenMembership: (membership: Membership) => void
  onInternalAccess?: () => void
}) {
  const staticPortfolioHost = isStaticPortfolioHost()

  return (
    <main className="campaignos-redesign dark auth-screen customer-access-screen">
      <section className="auth-hero workspace-access-hero">
        <div>
          <p className="eyebrow">Invite-based workspace access</p>
          <h1>Sign in to your campaign workspace</h1>
          <p>
            Existing invited users enter their email to choose a workspace. New teammates join with the
            access code issued by a company owner or admin.
          </p>
        </div>
        <aside className="demo-helper" aria-label="Seeded demo access">
          <span>Seeded demo access</span>
          <strong>Demo Retail Co</strong>
          <p>
            Evaluators can look up <b>owner@demo-retail.test</b>, join with access code <b>DEMORETA-E568C9</b>,
            or create a new demo company that persists in this browser.
          </p>
        </aside>
      </section>
      {staticPortfolioHost ? (
        <section className="static-access-banner" aria-label="Static demo mode">
          <span>Demo workspace</span>
          <strong>Create a company, invite users, and test the product flow.</strong>
          <p>
            Your demo companies and workspace changes are saved in this browser so you can test login, campaigns,
            subscribers, team invites, and settings.
          </p>
        </section>
      ) : null}

      <section className="operator-demo-banner" aria-label="SaaS admin demo access">
        <div>
          <span>Platform operator demo</span>
          <strong>SaaS internal admin console</strong>
          <p>
            Use this path to review tenant setup, company usage, and observability. Production access is
            designed for SSO/MFA and internal role provisioning; the public demo uses a seeded operator login.
          </p>
        </div>
        <a
          href="/internal"
          onClick={(event) => {
            if (!onInternalAccess) return
            event.preventDefault()
            onInternalAccess()
          }}
        >
          Open SaaS admin demo
        </a>
      </section>

      <section className="auth-grid" aria-label="Authentication choices">
        <form className="panel access-panel" onSubmit={onLookup}>
          <div className="section-heading">
            <span>Existing invited user</span>
            <strong>Find your workspace</strong>
          </div>
          <p className="helper-text">
            We match your email against active company memberships, then show the role and allocation before
            opening the workspace.
          </p>
          <label>
            Login email
            <span className="sr-only">email lookup input</span>
            <input
              required
              type="email"
              value={loginEmail}
              onChange={(event) => onLoginEmail(event.target.value)}
              placeholder="you@example.test"
            />
          </label>
          <button type="submit">
            Find my companies
          </button>
          {memberships.length ? (
            <ul className="compact-list membership-list">
              {memberships.map((membership) => {
                const roleMeta = getRoleMeta(membership.role)
                const remaining =
                  membership.credit_limit !== null && membership.credit_limit !== undefined
                    ? Math.max(0, membership.credit_limit - (membership.credits_used ?? 0))
                    : null

                return (
                  <li aria-label={membership.company_name} key={membership.company_id}>
                    <div>
                      <strong>{membership.company_name}</strong>
                      <span>{roleMeta.label}</span>
                      <small>{roleMeta.permissionSummary}</small>
                      <small>
                        Budget:{' '}
                        {membership.credit_limit !== null && membership.credit_limit !== undefined
                          ? `${formatNumber(remaining)} remaining of ${formatNumber(membership.credit_limit)}`
                          : 'company pooled budget'}
                      </small>
                    </div>
                    <button className="secondary" type="button" onClick={() => onOpenMembership(membership)}>
                      Open {membership.company_name}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </form>

        <form className="panel access-panel" onSubmit={onSignup}>
          <div className="section-heading">
            <span>New invited teammate</span>
            <strong>Join with access code</strong>
          </div>
          <p className="helper-text">
            Owners and admins generate role-specific codes in Settings. The code carries the role and user
            credit limit for this demo workspace access flow.
          </p>
          <label>
            Work email
            <input
              required
              type="email"
              value={signupEmail}
              onChange={(event) => onSignupEmail(event.target.value)}
              placeholder="you@example.test"
            />
          </label>
          <label>
            Full name
            <input
              required
              value={signupName}
              onChange={(event) => onSignupName(event.target.value)}
              placeholder="Your name"
            />
          </label>
          <label>
            Access code
            <span className="sr-only">signup input</span>
            <input
              required
              value={accessCode}
              onChange={(event) => onAccessCode(event.target.value.toUpperCase())}
              placeholder="ACME-7KQ9"
            />
          </label>
          <button type="submit">
            Sign up with access code
          </button>
        </form>

        <form className="panel access-panel setup-panel" onSubmit={onCreateCompany}>
          <div className="section-heading">
            <span>New customer company</span>
            <strong>Create demo company</strong>
          </div>
          <p className="helper-text">
            Set up a customer workspace, seed realistic campaign history, and enter it as the first Customer
            Company Admin.
          </p>
          <label>
            Company name
            <input
              required
              value={setupCompanyName}
              onChange={(event) => onSetupCompanyName(event.target.value)}
              placeholder="Launch Demo Co"
            />
          </label>
          <label>
            Company slug
            <input
              required
              value={setupCompanySlug}
              onChange={(event) => onSetupCompanySlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
              placeholder="launch-demo"
            />
          </label>
          <label>
            Admin email
            <input
              required
              type="email"
              value={setupAdminEmail}
              onChange={(event) => onSetupAdminEmail(event.target.value)}
              placeholder="owner@launch-demo.test"
            />
          </label>
          <label>
            Monthly send limit
            <input
              required
              inputMode="numeric"
              min="1000"
              type="number"
              value={setupMonthlyLimit}
              onChange={(event) => onSetupMonthlyLimit(event.target.value)}
              placeholder="500000"
            />
          </label>
          <button type="submit">
            Create company
          </button>
        </form>
      </section>
      {authMessage ? <p className="notice">{authMessage}</p> : null}
    </main>
  )
}
