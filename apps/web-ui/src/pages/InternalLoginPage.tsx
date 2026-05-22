import type { FormEvent } from 'react'

export function InternalLoginPage({
  adminEmail,
  onAdminEmail,
  onLogin,
}: {
  adminEmail: string
  onAdminEmail: (value: string) => void
  onLogin: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <main className="auth-screen compact-auth internal-login">
      <section className="auth-hero">
        <p className="eyebrow">Internal operations</p>
        <h1>Operator console</h1>
        <p>Create contracted companies, grant credits, issue access codes, and monitor platform usage.</p>
      </section>
      <form className="panel auth-card" onSubmit={onLogin}>
        <div className="section-heading">
          <span>Internal team</span>
          <strong>Admin access</strong>
        </div>
        <label>
          Admin email
          <input
            type="email"
            value={adminEmail}
            onChange={(event) => onAdminEmail(event.target.value)}
            placeholder="ops@company.com"
          />
        </label>
        <button>Login as internal admin</button>
      </form>
    </main>
  )
}
