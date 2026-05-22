import type { FormEvent } from 'react'

import type { Membership } from '../types'

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
      <section className="auth-hero">
        <p className="eyebrow">Customer access</p>
        <h1>Sign in to your campaign workspace</h1>
        <p>New user? Sign up with an access code. Existing user? Find your workspace by email.</p>
      </section>

      <section className="auth-grid" aria-label="Authentication choices">
        <form className="panel" onSubmit={onSignup}>
          <div className="section-heading">
            <span>New user?</span>
            <strong>Sign up with access code</strong>
          </div>
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
            <input
              value={accessCode}
              onChange={(event) => onAccessCode(event.target.value.toUpperCase())}
              placeholder="ACME-7KQ9"
            />
          </label>
          <button>Sign up with access code</button>
        </form>

        <form className="panel" onSubmit={onLookup}>
          <div className="section-heading">
            <span>Existing user?</span>
            <strong>Find your workspace</strong>
          </div>
          <label>
            Login email
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
              {memberships.map((membership) => (
                <li aria-label={membership.company_name} key={membership.company_id}>
                  <div>
                    <strong>{membership.company_name}</strong>
                    <span>{membership.role}</span>
                  </div>
                  <button className="secondary" type="button" onClick={() => onOpenMembership(membership)}>
                    Open {membership.company_name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      </section>
      {authMessage ? <p className="notice">{authMessage}</p> : null}
    </main>
  )
}
