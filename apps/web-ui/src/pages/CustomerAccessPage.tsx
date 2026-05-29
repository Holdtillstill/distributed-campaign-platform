import type { FormEvent } from 'react'

import { getRoleMeta } from '../roles'
import type { Membership } from '../types'
import { formatNumber } from '../utils'

export function CustomerAccessPage({
  signupEmail,
  signupName,
  accessCode,
  loginEmail,
  memberships,
  authMessage,
  onSignupEmail,
  onSignupName,
  onAccessCode,
  onLoginEmail,
  onSignup,
  onLookup,
  onOpenMembership,
}: {
  signupEmail: string
  signupName: string
  accessCode: string
  loginEmail: string
  memberships: Membership[]
  authMessage: string | null
  onSignupEmail: (value: string) => void
  onSignupName: (value: string) => void
  onAccessCode: (value: string) => void
  onLoginEmail: (value: string) => void
  onSignup: (event: FormEvent<HTMLFormElement>) => void
  onLookup: (event: FormEvent<HTMLFormElement>) => void
  onOpenMembership: (membership: Membership) => void
}) {
  return (
    <main className="auth-screen">
      <section className="auth-hero workspace-access-hero">
        <div>
          <p className="eyebrow">Invite-based workspace access</p>
          <h1>Sign in to your campaign workspace</h1>
          <p>
            Existing invited users enter their email to choose a workspace. New teammates join with the
            access code issued by a company owner or admin.
          </p>
        </div>
        <aside className="demo-helper" aria-label="Demo credentials">
          <span>Demo workspace</span>
          <strong>Demo Retail Co</strong>
          <p>
            Evaluators can look up <b>owner@demo-retail.test</b> or join with access code <b>DEMORETA-E568C9</b>.
          </p>
        </aside>
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
              type="email"
              value={loginEmail}
              onChange={(event) => onLoginEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </label>
          <button>Find my companies</button>
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
              type="email"
              value={signupEmail}
              onChange={(event) => onSignupEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </label>
          <label>
            Full name
            <input value={signupName} onChange={(event) => onSignupName(event.target.value)} placeholder="Your name" />
          </label>
          <label>
            Access code
            <span className="sr-only">signup input</span>
            <input
              value={accessCode}
              onChange={(event) => onAccessCode(event.target.value.toUpperCase())}
              placeholder="ACME-7KQ9"
            />
          </label>
          <button>Sign up with access code</button>
        </form>
      </section>
      {authMessage ? <p className="notice">{authMessage}</p> : null}
    </main>
  )
}
