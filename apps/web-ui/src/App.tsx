import { FormEvent, useEffect, useMemo, useState } from 'react'

type Session =
  | {
      role: 'internal_admin'
      email: string
      companyId?: never
      companyName?: never
    }
  | {
      role: 'company_user'
      email: string
      companyId: string
      companyName: string
      membershipRole?: string
    }

type Membership = {
  company_id: string
  company_name: string
  company_slug?: string
  role: string
  credit_limit?: number | null
  credits_used?: number
}

type CompanyResult = {
  id: string
  name: string
  slug: string
  monthly_send_limit?: number | null
  credit_balance: number
  access_code: string
  admin_user: {
    id: string
    email: string
    role: string
  }
}

type UsageRow = {
  company_id: string
  company_name: string
  campaign_count: number
  message_count: number
  media_asset_count: number
  tracked_link_count: number
  click_count: number
  redemption_count: number
  reminder_count: number
}

type DashboardSummary = {
  company_id: string
  company_name: string
  monthly_send_limit?: number | null
  credit_balance: number
  subscriber_count: number
  campaign_count: number
  message_count: number
  credits_used: number
  click_count: number
  redemption_count: number
}

type StatusCounts = {
  queued: number
  sent: number
  failed: number
  retried: number
  dead_lettered: number
}

type Campaign = {
  id: string
  company_id: string
  name: string
  message_type: 'regular' | 'smart'
  message_count: number
  credit_cost: number
  remaining_credits: number
  status_counts: StatusCounts
}

type CompanyUser = {
  user_id: string
  email: string
  display_name?: string | null
  role: string
  credit_limit?: number | null
  credits_used: number
}

type AccessCodeResult = {
  code: string
  company_id: string
  role: string
  credit_limit?: number | null
}

type SubscriberListResult = {
  id?: string
  company_id?: string
  name?: string
}

type SubscriberResult = {
  id?: string
  company_id?: string
  phone_number?: string
  list_id?: string
  consent_status?: string
}

type OptInResult = {
  subscriber_id?: string
  company_id?: string
  phone_number?: string
  status?: string
  confirmation_token?: string
}

type MediaAsset = {
  id?: string
  company_id?: string
  filename?: string
  content_type?: string
  url?: string
}

type CampaignLink = {
  id?: string
  token?: string
  public_url?: string
  company_id?: string
  campaign_id?: string
  subscriber_id?: string
  media_asset_id?: string
  destination_url?: string
  click_count?: number
  redeemed_count?: number
}

type PerformanceTotals = {
  media_asset_count: number
  tracked_link_count: number
  click_count: number
  redemption_count: number
}

type ReminderCampaign = {
  id?: string
  company_id?: string
  source_campaign_id?: string
  audience_rule?: string
  message_body?: string
  status?: string
  estimated_recipient_count?: number
}

type SystemCheck = {
  path: string
  label: string
  state: 'checking' | 'ok' | 'error'
  detail: string
}

type AdminPage = 'dashboard' | 'companies' | 'usage'
type Surface = 'marketing' | 'app' | 'internal'
type CompanyPage =
  | 'dashboard'
  | 'campaigns'
  | 'subscribers'
  | 'content'
  | 'analytics'
  | 'reminders'
  | 'settings'

const API_BASE_URL = window.__APP_CONFIG__?.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL ?? '/api'
const SESSION_KEY = 'campaign-platform-session'
const DEMO_RECIPIENTS = ['+15550001001', '+15550001002', '+15550001003']

const adminNav: { id: AdminPage; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'companies', label: 'Companies' },
  { id: 'usage', label: 'Usage' },
]

const companyNav: { id: CompanyPage; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'subscribers', label: 'Subscribers' },
  { id: 'content', label: 'Content Library' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'settings', label: 'Settings' },
]

function loadStoredSession(): Session | null {
  try {
    const rawSession = window.localStorage.getItem(SESSION_KEY)
    if (!rawSession) return null
    const parsed = JSON.parse(rawSession) as Session
    if (parsed.role === 'internal_admin' || parsed.role === 'company_user') return parsed
  } catch {
    window.localStorage.removeItem(SESSION_KEY)
  }
  return null
}

function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) return 'Not set'
  return new Intl.NumberFormat().format(value)
}

function asMemberships(payload: unknown): Membership[] {
  if (Array.isArray(payload)) return payload as Membership[]
  if (payload && typeof payload === 'object' && 'memberships' in payload) {
    const memberships = (payload as { memberships?: unknown }).memberships
    return Array.isArray(memberships) ? (memberships as Membership[]) : []
  }
  return []
}

function surfaceFromLocation(): Surface {
  const host = window.location.hostname.toLowerCase()
  const path = window.location.pathname
  if (host.startsWith('admin.') || host.startsWith('ops.') || path.startsWith('/internal')) return 'internal'
  if (path.startsWith('/app')) return 'app'
  return 'marketing'
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadStoredSession())
  const [surface, setSurface] = useState<Surface>(() => surfaceFromLocation())
  const [adminPage, setAdminPage] = useState<AdminPage>('dashboard')
  const [companyPage, setCompanyPage] = useState<CompanyPage>('dashboard')
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [adminEmail, setAdminEmail] = useState('ops@example.test')
  const [loginEmail, setLoginEmail] = useState('owner@acme.test')
  const [signupEmail, setSignupEmail] = useState('owner@acme.test')
  const [signupName, setSignupName] = useState('Acme Owner')
  const [accessCode, setAccessCode] = useState('')
  const [memberships, setMemberships] = useState<Membership[]>([])

  function navigate(nextSurface: Surface) {
    const path = nextSurface === 'internal' ? '/internal' : nextSurface === 'app' ? '/app' : '/'
    window.history.pushState(null, '', path)
    setSurface(nextSurface)
  }

  useEffect(() => {
    const handlePopState = () => setSurface(surfaceFromLocation())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function persistSession(nextSession: Session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    setAuthMessage(null)
  }

  function logout() {
    window.localStorage.removeItem(SESSION_KEY)
    setSession(null)
    setMemberships([])
    setAdminPage('dashboard')
    setCompanyPage('dashboard')
  }

  function loginInternalAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    persistSession({ role: 'internal_admin', email: adminEmail })
    setSurface('internal')
  }

  async function lookupMemberships(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthMessage(null)
    const response = await fetch(`${API_BASE_URL}/me/memberships`, {
      headers: { 'X-User-Email': loginEmail },
    })
    if (!response.ok) {
      setAuthMessage(`Membership lookup failed: ${response.status}`)
      return
    }
    const result = asMemberships(await response.json())
    setMemberships(result)
    if (result.length === 0) {
      setAuthMessage('No companies found. Please sign up with an access code from your company admin.')
    }
  }

  async function signupWithAccessCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthMessage(null)
    const response = await fetch(`${API_BASE_URL}/signup/access-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: signupEmail, name: signupName, access_code: accessCode }),
    })
    if (!response.ok) {
      setAuthMessage('Access code signup failed. Check the code and try again.')
      return
    }
    const result = (await response.json()) as {
      email: string
      company_id: string
      company_name: string
      membership_role: string
    }
    persistSession({
      role: 'company_user',
      email: result.email,
      companyId: result.company_id,
      companyName: result.company_name,
      membershipRole: result.membership_role,
    })
    setSurface('app')
    setCompanyPage('dashboard')
  }

  const customerAccess = (
    <main className="auth-screen">
      <section className="auth-hero">
        <p className="eyebrow">Customer access</p>
        <h1>Sign in to your campaign workspace</h1>
        <p>Use a company access code for first-time setup, or find existing company memberships by email.</p>
      </section>

      <section className="auth-grid" aria-label="Authentication choices">
        <form className="panel" onSubmit={signupWithAccessCode}>
          <div className="section-heading">
            <span>Company signup</span>
            <strong>Access code</strong>
          </div>
          <label>
            Work email
            <input type="email" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} />
          </label>
          <label>
            Full name
            <input value={signupName} onChange={(event) => setSignupName(event.target.value)} />
          </label>
          <label>
            Access code
            <input value={accessCode} onChange={(event) => setAccessCode(event.target.value.toUpperCase())} />
          </label>
          <button>Sign up with access code</button>
        </form>

        <form className="panel" onSubmit={lookupMemberships}>
          <div className="section-heading">
            <span>Company login</span>
            <strong>Email lookup</strong>
          </div>
          <label>
            Login email
            <input type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} />
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
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => {
                      persistSession({
                        role: 'company_user',
                        email: loginEmail,
                        companyId: membership.company_id,
                        companyName: membership.company_name,
                        membershipRole: membership.role,
                      })
                      setCompanyPage('dashboard')
                    }}
                  >
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

  if (!session) {
    if (surface === 'marketing') {
      return <MarketingLanding onCustomerAccess={() => navigate('app')} />
    }

    if (surface === 'internal') {
      return (
        <main className="auth-screen compact-auth">
          <section className="auth-hero">
            <p className="eyebrow">Internal operations</p>
            <h1>Operator console</h1>
            <p>Create contracted companies, grant credits, issue access codes, and monitor platform usage.</p>
          </section>
          <form className="panel auth-card" onSubmit={loginInternalAdmin}>
            <div className="section-heading">
              <span>Internal team</span>
              <strong>Admin access</strong>
            </div>
            <label>
              Admin email
              <input type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} />
            </label>
            <button>Login as internal admin</button>
          </form>
        </main>
      )
    }

    return customerAccess
  }

  if (surface === 'app' && session.role !== 'company_user') {
    return customerAccess
  }

  if (session.role === 'internal_admin' && surface === 'marketing') {
    return <MarketingLanding onCustomerAccess={() => navigate('app')} onInternalAccess={() => navigate('internal')} />
  }

  return (
    <main className="app-frame">
      <header className="topbar">
        <div>
          <p className="eyebrow">Distributed Campaign Platform</p>
          <strong>{session.role === 'internal_admin' ? 'Internal admin' : session.companyName}</strong>
        </div>
        <div className="user-chip">
          <span>{session.email}</span>
          <button className="secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label={session.role === 'internal_admin' ? 'Admin navigation' : 'Company navigation'}>
          {(session.role === 'internal_admin' ? adminNav : companyNav).map((item) => (
            <button
              className={
                (session.role === 'internal_admin' ? adminPage : companyPage) === item.id ? 'nav-item active' : 'nav-item'
              }
              key={item.id}
              onClick={() => {
                if (session.role === 'internal_admin') setAdminPage(item.id as AdminPage)
                else setCompanyPage(item.id as CompanyPage)
              }}
            >
              {item.label}
            </button>
          ))}
        </aside>

        <section className="page-surface">
          {session.role === 'internal_admin' ? (
            <AdminWorkspace page={adminPage} />
          ) : (
            <CompanyWorkspace page={companyPage} session={session} />
          )}
        </section>
      </div>
    </main>
  )
}

function MarketingLanding({
  onCustomerAccess,
  onInternalAccess,
}: {
  onCustomerAccess: () => void
  onInternalAccess?: () => void
}) {
  return (
    <main className="marketing-site">
      <header className="marketing-nav">
        <strong>CampaignOS</strong>
        <nav aria-label="Public navigation">
          <a href="#pricing">Pricing</a>
          <a href="#platform">Platform</a>
          <button className="secondary" onClick={onCustomerAccess}>
            Customer login
          </button>
          {onInternalAccess ? (
            <button className="ghost" onClick={onInternalAccess}>
              Internal
            </button>
          ) : null}
        </nav>
      </header>

      <section className="marketing-hero">
        <div>
          <p className="eyebrow">Contract-first SMS marketing SaaS</p>
          <h1>Send smarter campaigns without losing control of spend.</h1>
          <p>
            Give each brand, region, or campaign owner a clean SMS workspace with credit budgets, tracked links,
            reminders, and reporting your finance team can actually reconcile.
          </p>
          <div className="hero-actions">
            <button onClick={onCustomerAccess}>Start with access code</button>
            <a className="docs-link secondary-link" href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">
              API docs
            </a>
          </div>
        </div>
        <div className="product-shot" aria-label="Product summary">
          <div className="product-shot-header">
            <span>Acme Retail</span>
            <strong>42,000 credits</strong>
          </div>
          <div className="product-metrics">
            <Metric label="Smart messages" value="18k" />
            <Metric label="Regional budget" value="62%" />
            <Metric label="Reminder lift" value="+14%" />
          </div>
        </div>
      </section>

      <section className="marketing-band" id="platform">
        <div>
          <span>01</span>
          <h2>Contracted company setup</h2>
          <p>Internal operators create the tenant, grant prepaid or monthly credits, and issue the first admin code.</p>
        </div>
        <div>
          <span>02</span>
          <h2>Company-owned teams</h2>
          <p>Customer admins invite users, choose roles, and allocate budgets by region or campaign owner.</p>
        </div>
        <div>
          <span>03</span>
          <h2>Credit-aware sending</h2>
          <p>Regular SMS and smart tracked campaigns consume credits before sends leave the platform.</p>
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div>
          <p className="eyebrow">Usage model</p>
          <h2>Simple credits for real campaign economics.</h2>
        </div>
        <div className="pricing-grid">
          <div>
            <strong>Regular SMS</strong>
            <span>1 credit per recipient segment</span>
          </div>
          <div>
            <strong>Smart SMS</strong>
            <span>2 credits with tracking and reminder support</span>
          </div>
          <div>
            <strong>Budget guardrails</strong>
            <span>Company and user-level limits block overspend</span>
          </div>
        </div>
      </section>
    </main>
  )
}

function AdminWorkspace({ page }: { page: AdminPage }) {
  const [companyName, setCompanyName] = useState('Acme Retail')
  const [companySlug, setCompanySlug] = useState('acme-retail')
  const [initialAdminEmail, setInitialAdminEmail] = useState('admin@acme.test')
  const [monthlySendLimit, setMonthlySendLimit] = useState('50000')
  const [creditBalance, setCreditBalance] = useState('50000')
  const [companyResult, setCompanyResult] = useState<CompanyResult | null>(null)
  const [usageFromDate, setUsageFromDate] = useState('2026-05-01')
  const [usageToDate, setUsageToDate] = useState('2026-05-21')
  const [usageRows, setUsageRows] = useState<UsageRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([
    { path: '/healthz', label: 'Campaign API liveness', state: 'checking', detail: 'Not checked yet' },
    { path: '/readyz', label: 'Campaign API readiness', state: 'checking', detail: 'Not checked yet' },
    { path: '/metrics', label: 'Prometheus metrics', state: 'checking', detail: 'Not checked yet' },
  ])

  function toSystemCheck(response: Response, path: string, label: string): SystemCheck {
    if (!response.ok) {
      return { path, label, state: 'error', detail: `${response.status} ${response.statusText}` }
    }
    return { path, label, state: 'ok', detail: `${path} responded ${response.status}` }
  }

  async function refreshSystemStatus() {
    const checks = await Promise.all([
      fetch(`${API_BASE_URL}/healthz`).then((response) => toSystemCheck(response, '/healthz', 'Campaign API liveness')),
      fetch(`${API_BASE_URL}/readyz`).then((response) => toSystemCheck(response, '/readyz', 'Campaign API readiness')),
      fetch(`${API_BASE_URL}/metrics`).then((response) => toSystemCheck(response, '/metrics', 'Prometheus metrics')),
    ])
    setSystemChecks(checks)
  }

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const limit = monthlySendLimit.trim() ? Number(monthlySendLimit) : null
    const credits = creditBalance.trim() ? Number(creditBalance) : 0
    const response = await fetch(`${API_BASE_URL}/admin/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Admin': 'true' },
      body: JSON.stringify({
        name: companyName,
        slug: companySlug,
        admin_email: initialAdminEmail,
        monthly_send_limit: limit,
        credit_balance: credits,
      }),
    })
    if (!response.ok) {
      setError(`Create company failed: ${response.status}`)
      return
    }
    setCompanyResult(await response.json())
  }

  async function loadUsage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const params = new URLSearchParams({ from: usageFromDate, to: usageToDate })
    const response = await fetch(`${API_BASE_URL}/admin/usage?${params.toString()}`, {
      headers: { 'X-Internal-Admin': 'true' },
    })
    if (!response.ok) {
      setError(`Usage dashboard failed: ${response.status}`)
      return
    }
    setUsageRows(await response.json())
  }

  if (page === 'dashboard') {
    return (
      <>
        <PageHeader title="Admin dashboard" description="Monitor tenant onboarding, quota setup, and platform usage." />
        <div className="metric-grid">
          <Metric label="Companies created" value={companyResult ? '1' : '0'} />
          <Metric label="Latest access code" value={companyResult?.access_code ?? 'None yet'} />
          <Metric label="Usage rows loaded" value={String(usageRows.length)} />
        </div>
        <section className="status-section" aria-label="System status">
          <div className="section-heading">
            <span>Platform</span>
            <strong>System status</strong>
          </div>
          <button className="secondary" onClick={() => void refreshSystemStatus()}>
            Refresh checks
          </button>
          <ul className="compact-list">
            {systemChecks.map((check) => (
              <li className={check.state} key={check.path}>
                <strong>{check.label}</strong>
                <span>{check.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      </>
    )
  }

  if (page === 'companies') {
    return (
      <>
        <PageHeader title="Companies" description="Create tenants, set monthly quota, and hand off local signup codes." />
        <form className="form-grid" onSubmit={createCompany}>
          <label>
            Company name
            <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
          </label>
          <label>
            Company slug
            <input value={companySlug} onChange={(event) => setCompanySlug(event.target.value)} />
          </label>
          <label>
            Initial admin email
            <input
              type="email"
              value={initialAdminEmail}
              onChange={(event) => setInitialAdminEmail(event.target.value)}
            />
          </label>
          <label>
            Monthly send limit
            <input
              inputMode="numeric"
              value={monthlySendLimit}
              onChange={(event) => setMonthlySendLimit(event.target.value)}
            />
          </label>
          <label>
            Contract credits
            <input inputMode="numeric" value={creditBalance} onChange={(event) => setCreditBalance(event.target.value)} />
          </label>
          <button>Create company</button>
        </form>
        {companyResult ? (
          <div className="result-strip">
            <strong>{companyResult.name}</strong>
            <span>{companyResult.id}</span>
            <span>Monthly limit: {formatNumber(companyResult.monthly_send_limit)}</span>
            <span>Credits: {formatNumber(companyResult.credit_balance)}</span>
            <span>Access code: {companyResult.access_code}</span>
            <span>Admin: {companyResult.admin_user.email}</span>
          </div>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
      </>
    )
  }

  return (
    <>
      <PageHeader title="Usage" description="Review cross-tenant campaign, message, engagement, and reminder volume." />
      <form className="toolbar-form" onSubmit={loadUsage}>
        <label>
          Usage from date
          <input type="date" value={usageFromDate} onChange={(event) => setUsageFromDate(event.target.value)} />
        </label>
        <label>
          Usage to date
          <input type="date" value={usageToDate} onChange={(event) => setUsageToDate(event.target.value)} />
        </label>
        <button>Load usage</button>
      </form>
      {usageRows.length ? (
        <ul className="compact-list">
          {usageRows.map((row) => (
            <li key={row.company_id}>
              <strong>{row.company_name}</strong>
              <span>Campaigns: {row.campaign_count}</span>
              <span>Messages: {row.message_count}</span>
              <span>Clicks: {row.click_count}</span>
              <span>Reminders: {row.reminder_count}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </>
  )
}

function CompanyWorkspace({ page, session }: { page: CompanyPage; session: Extract<Session, { role: 'company_user' }> }) {
  const companyId = session.companyId
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
  const [campaignName, setCampaignName] = useState('Spring Launch')
  const [messageBody, setMessageBody] = useState('Hello from the Kubernetes campaign platform')
  const [messageType, setMessageType] = useState<'regular' | 'smart'>('regular')
  const [recipients, setRecipients] = useState(DEMO_RECIPIENTS.join('\n'))
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [listName, setListName] = useState('VIP List')
  const [subscriberList, setSubscriberList] = useState<SubscriberListResult | null>(null)
  const [subscriberPhone, setSubscriberPhone] = useState('+15550001010')
  const [subscriberSource, setSubscriberSource] = useState('import')
  const [subscriber, setSubscriber] = useState<SubscriberResult | null>(null)
  const [optInPhone, setOptInPhone] = useState('+15550001011')
  const [optInSource, setOptInSource] = useState('landing-page')
  const [optIn, setOptIn] = useState<OptInResult | null>(null)
  const [confirmToken, setConfirmToken] = useState('')
  const [confirmResult, setConfirmResult] = useState<OptInResult | null>(null)
  const [mediaFilename, setMediaFilename] = useState('coupon.png')
  const [mediaContentType, setMediaContentType] = useState('image/png')
  const [mediaUrl, setMediaUrl] = useState('https://cdn.example/coupon.png')
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [trackedCampaignId, setTrackedCampaignId] = useState('')
  const [trackedSubscriberId, setTrackedSubscriberId] = useState('')
  const [trackedMediaAssetId, setTrackedMediaAssetId] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('https://example.com/spring')
  const [campaignLinks, setCampaignLinks] = useState<CampaignLink[]>([])
  const [campaignLink, setCampaignLink] = useState<CampaignLink | null>(null)
  const [performance, setPerformance] = useState<PerformanceTotals | null>(null)
  const [reminderSourceCampaignId, setReminderSourceCampaignId] = useState('')
  const [reminderAudienceRule, setReminderAudienceRule] = useState('not_clicked')
  const [reminderMessageBody, setReminderMessageBody] = useState('Still interested?')
  const [reminderCampaigns, setReminderCampaigns] = useState<ReminderCampaign[]>([])
  const [reminderCampaign, setReminderCampaign] = useState<ReminderCampaign | null>(null)
  const [teamUsers, setTeamUsers] = useState<CompanyUser[]>([])
  const [inviteRole, setInviteRole] = useState('campaign_manager')
  const [inviteCreditLimit, setInviteCreditLimit] = useState('2000')
  const [accessCodeResult, setAccessCodeResult] = useState<AccessCodeResult | null>(null)
  const [editUserEmail, setEditUserEmail] = useState('')
  const [editUserRole, setEditUserRole] = useState('campaign_manager')
  const [editCreditLimit, setEditCreditLimit] = useState('2000')
  const [error, setError] = useState<string | null>(null)

  const recipientList = useMemo(
    () =>
      recipients
        .split(/\n|,/)
        .map((recipient) => recipient.trim())
        .filter(Boolean),
    [recipients],
  )

  useEffect(() => {
    async function loadDashboardSummary() {
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/dashboard-summary`)
      if (response.ok) setDashboardSummary(await response.json())
    }
    void loadDashboardSummary()
  }, [companyId])

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Company-Id': companyId, 'X-User-Email': session.email },
      body: JSON.stringify({ name: campaignName, body: messageBody, message_type: messageType, recipients: recipientList }),
    })
    if (!response.ok) {
      setError(`Create campaign failed: ${response.status}`)
      return
    }
    const result = (await response.json()) as Campaign
    setCampaign(result)
    setDashboardSummary((current) =>
      current
        ? {
            ...current,
            credit_balance: result.remaining_credits,
            credits_used: current.credits_used + result.credit_cost,
            campaign_count: current.campaign_count + 1,
            message_count: current.message_count + result.message_count,
          }
        : current,
    )
    setTrackedCampaignId(result.id)
    setReminderSourceCampaignId(result.id)
  }

  async function createSubscriberList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/subscriber-lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: listName }),
    })
    if (response.ok) setSubscriberList(await response.json())
  }

  async function importSubscriber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/subscribers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: subscriberPhone, source: subscriberSource, list_id: subscriberList?.id ?? '' }),
    })
    if (response.ok) {
      const result = (await response.json()) as SubscriberResult
      setSubscriber(result)
      if (result.id) setTrackedSubscriberId(result.id)
    }
  }

  async function startOptIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/public/opt-ins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, phone_number: optInPhone, source: optInSource }),
    })
    if (response.ok) {
      const result = (await response.json()) as OptInResult
      setOptIn(result)
      if (result.confirmation_token) setConfirmToken(result.confirmation_token)
    }
  }

  async function confirmOptIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/public/opt-ins/${confirmToken}/confirm`, { method: 'POST' })
    if (response.ok) setConfirmResult(await response.json())
  }

  async function addMediaAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/media-assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: mediaFilename, content_type: mediaContentType, url: mediaUrl }),
    })
    if (response.ok) {
      const result = (await response.json()) as MediaAsset
      setMediaAssets((current) => [result, ...current.filter((asset) => asset.id !== result.id)])
      if (result.id) setTrackedMediaAssetId(result.id)
    }
  }

  async function refreshMediaAssets() {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/media-assets`)
    if (response.ok) setMediaAssets(await response.json())
  }

  async function createTrackedLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/campaign-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: trackedCampaignId,
        subscriber_id: trackedSubscriberId,
        media_asset_id: trackedMediaAssetId,
        destination_url: destinationUrl,
      }),
    })
    if (response.ok) {
      const result = (await response.json()) as CampaignLink
      setCampaignLink(result)
      setCampaignLinks((current) => [result, ...current.filter((link) => link.id !== result.id)])
    }
  }

  async function refreshCampaignLinks() {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/campaign-links`)
    if (response.ok) setCampaignLinks(await response.json())
  }

  async function refreshPerformance() {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/campaign-performance`)
    if (response.ok) setPerformance(await response.json())
  }

  async function createReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/reminder-campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_campaign_id: reminderSourceCampaignId,
        audience_rule: reminderAudienceRule,
        message_body: reminderMessageBody,
      }),
    })
    if (response.ok) setReminderCampaign(await response.json())
  }

  async function refreshReminders() {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/reminder-campaigns`)
    if (response.ok) setReminderCampaigns(await response.json())
  }

  async function createTeamAccessCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/access-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: inviteRole,
        credit_limit: inviteCreditLimit.trim() ? Number(inviteCreditLimit) : null,
      }),
    })
    if (response.ok) setAccessCodeResult(await response.json())
  }

  async function refreshTeamUsers() {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/users`)
    if (response.ok) setTeamUsers(await response.json())
  }

  async function updateTeamUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/users/${encodeURIComponent(editUserEmail)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: editUserRole,
        credit_limit: editCreditLimit.trim() ? Number(editCreditLimit) : null,
      }),
    })
    if (response.ok) {
      const updatedUser = (await response.json()) as CompanyUser
      setTeamUsers((current) => [
        updatedUser,
        ...current.filter((user) => user.email.toLowerCase() !== updatedUser.email.toLowerCase()),
      ])
    }
  }

  if (page === 'dashboard') {
    return (
      <>
        <PageHeader title="Company dashboard" description={`Active company: ${session.companyName} (${companyId})`} />
        <div className="metric-grid">
          <Metric label="Subscribers" value={formatNumber(dashboardSummary?.subscriber_count)} />
          <Metric label="Campaigns" value={formatNumber(dashboardSummary?.campaign_count)} />
          <Metric label="Messages" value={formatNumber(dashboardSummary?.message_count)} />
          <Metric label="Credits remaining" value={formatNumber(dashboardSummary?.credit_balance)} />
          <Metric label="Credits used" value={formatNumber(dashboardSummary?.credits_used)} />
          <Metric label="Clicks" value={formatNumber(dashboardSummary?.click_count)} />
          <Metric label="Redemptions" value={formatNumber(dashboardSummary?.redemption_count)} />
          <Metric label="Monthly send limit" value={formatNumber(dashboardSummary?.monthly_send_limit)} />
        </div>
      </>
    )
  }

  if (page === 'campaigns') {
    return (
      <>
        <PageHeader title="Campaigns" description="Create SMS campaigns against the active company scope." />
        <form className="form-grid" onSubmit={createCampaign}>
          <label>
            Campaign name
            <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} />
          </label>
          <label>
            Message type
            <select value={messageType} onChange={(event) => setMessageType(event.target.value as 'regular' | 'smart')}>
              <option value="regular">Regular SMS - 1 credit</option>
              <option value="smart">Smart SMS - 2 credits</option>
            </select>
          </label>
          <label className="wide">
            Message body
            <textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
          </label>
          <label className="wide">
            Recipients
            <textarea value={recipients} onChange={(event) => setRecipients(event.target.value)} />
          </label>
          <p className="estimate">
            Estimated cost: {formatNumber(recipientList.length * (messageType === 'smart' ? 2 : 1))} credits
          </p>
          <button>Create campaign</button>
        </form>
        {campaign ? (
          <div className="result-strip">
            <strong>Campaign status</strong>
            <strong>{campaign.id}</strong>
            <span>{campaign.company_id}</span>
            <span>{campaign.message_type}</span>
            <span>Messages: {campaign.message_count}</span>
            <span>Credits spent: {campaign.credit_cost}</span>
            <span>Remaining: {formatNumber(campaign.remaining_credits)}</span>
            <span>Queued: {campaign.status_counts.queued}</span>
            <span>Sent: {campaign.status_counts.sent}</span>
            <span>Retried: {campaign.status_counts.retried}</span>
            <span>Dead-lettered: {campaign.status_counts.dead_lettered}</span>
          </div>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
      </>
    )
  }

  if (page === 'subscribers') {
    return (
      <>
        <PageHeader title="Subscribers" description="Manage lists, local imports, and double opt-in confirmation." />
        <div className="split-layout">
          <form className="panel" onSubmit={createSubscriberList}>
            <div className="section-heading">
              <span>Lists</span>
              <strong>Create</strong>
            </div>
            <label>
              Subscriber list name
              <input value={listName} onChange={(event) => setListName(event.target.value)} />
            </label>
            <button>Create list</button>
            {subscriberList ? <p className="muted">List id: {subscriberList.id}</p> : null}
          </form>
          <form className="panel" onSubmit={importSubscriber}>
            <div className="section-heading">
              <span>Import</span>
              <strong>Company provided</strong>
            </div>
            <label>
              Subscriber phone number
              <input value={subscriberPhone} onChange={(event) => setSubscriberPhone(event.target.value)} />
            </label>
            <label>
              Subscriber source
              <input value={subscriberSource} onChange={(event) => setSubscriberSource(event.target.value)} />
            </label>
            <button>Import subscriber</button>
            {subscriber ? <p className="muted">{subscriber.consent_status}</p> : null}
          </form>
          <div className="panel">
            <form onSubmit={startOptIn}>
              <div className="section-heading">
                <span>Opt-in</span>
                <strong>Public flow</strong>
              </div>
              <label>
                Opt-in phone number
                <input value={optInPhone} onChange={(event) => setOptInPhone(event.target.value)} />
              </label>
              <label>
                Opt-in source
                <input value={optInSource} onChange={(event) => setOptInSource(event.target.value)} />
              </label>
              <button>Start opt-in</button>
            </form>
            {optIn ? <p className="muted">Token: {optIn.confirmation_token}</p> : null}
            <form className="stacked-form" onSubmit={confirmOptIn}>
              <label>
                Confirmation token
                <input value={confirmToken} onChange={(event) => setConfirmToken(event.target.value)} />
              </label>
              <button>Confirm opt-in</button>
            </form>
            {confirmResult ? <p className="muted">{confirmResult.status}</p> : null}
          </div>
        </div>
      </>
    )
  }

  if (page === 'content') {
    return (
      <>
        <PageHeader title="Content Library" description="Store media references and create tracked campaign links." />
        <div className="split-layout two-column">
          <form className="panel" onSubmit={addMediaAsset}>
            <div className="section-heading">
              <span>Media</span>
              <strong>Asset</strong>
            </div>
            <label>
              Media filename
              <input value={mediaFilename} onChange={(event) => setMediaFilename(event.target.value)} />
            </label>
            <label>
              Media content type
              <input value={mediaContentType} onChange={(event) => setMediaContentType(event.target.value)} />
            </label>
            <label>
              Media url
              <input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} />
            </label>
            <button>Add media asset</button>
            <button className="secondary inline-action" type="button" onClick={() => void refreshMediaAssets()}>
              Refresh media assets
            </button>
          </form>
          <form className="panel" onSubmit={createTrackedLink}>
            <div className="section-heading">
              <span>Links</span>
              <strong>Tracking</strong>
            </div>
            <label>
              Tracked campaign id
              <input value={trackedCampaignId} onChange={(event) => setTrackedCampaignId(event.target.value)} />
            </label>
            <label>
              Tracked subscriber id
              <input value={trackedSubscriberId} onChange={(event) => setTrackedSubscriberId(event.target.value)} />
            </label>
            <label>
              Tracked media asset id
              <input value={trackedMediaAssetId} onChange={(event) => setTrackedMediaAssetId(event.target.value)} />
            </label>
            <label>
              Destination url
              <input value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} />
            </label>
            <button>Create tracked link</button>
            <button className="secondary inline-action" type="button" onClick={() => void refreshCampaignLinks()}>
              Refresh tracked links
            </button>
          </form>
        </div>
        {mediaAssets.length || campaignLinks.length || campaignLink ? (
          <ul className="compact-list">
            {mediaAssets.map((asset) => (
              <li key={asset.id}>
                <strong>{asset.filename}</strong>
                <span>{asset.id}</span>
              </li>
            ))}
            {campaignLink ? (
              <li>
                <strong>{campaignLink.token}</strong>
                <span>{campaignLink.public_url}</span>
              </li>
            ) : null}
            {campaignLinks.map((link) => (
              <li key={link.id}>
                <strong>{link.token}</strong>
                <span>Clicks: {link.click_count}</span>
                <span>Redemptions: {link.redeemed_count}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </>
    )
  }

  if (page === 'analytics') {
    return (
      <>
        <PageHeader title="Analytics" description="Review tracked-link performance for this tenant." />
        <button onClick={() => void refreshPerformance()}>Refresh performance</button>
        {performance ? (
          <div className="metric-grid spaced">
            <Metric label="Media assets" value={formatNumber(performance.media_asset_count)} />
            <Metric label="Tracked links" value={formatNumber(performance.tracked_link_count)} />
            <Metric label="Clicks" value={formatNumber(performance.click_count)} />
            <Metric label="Redemptions" value={formatNumber(performance.redemption_count)} />
          </div>
        ) : null}
      </>
    )
  }

  if (page === 'reminders') {
    return (
      <>
        <PageHeader title="Reminders" description="Estimate follow-up audiences from tracked campaign engagement." />
        <form className="form-grid" onSubmit={createReminder}>
          <label>
            Reminder source campaign id
            <input
              value={reminderSourceCampaignId}
              onChange={(event) => setReminderSourceCampaignId(event.target.value)}
            />
          </label>
          <label>
            Reminder audience rule
            <select value={reminderAudienceRule} onChange={(event) => setReminderAudienceRule(event.target.value)}>
              <option value="not_clicked">Not clicked</option>
              <option value="clicked_not_redeemed">Clicked not redeemed</option>
            </select>
          </label>
          <label className="wide">
            Reminder copy
            <textarea value={reminderMessageBody} onChange={(event) => setReminderMessageBody(event.target.value)} />
          </label>
          <button>Create reminder</button>
          <button className="secondary" type="button" onClick={() => void refreshReminders()}>
            Refresh reminders
          </button>
        </form>
        {reminderCampaign ? (
          <div className="result-strip">
            <strong>{reminderCampaign.id}</strong>
            <span>{reminderCampaign.audience_rule}</span>
            <span>Estimated recipients: {reminderCampaign.estimated_recipient_count}</span>
          </div>
        ) : null}
        {reminderCampaigns.length ? (
          <ul className="compact-list">
            {reminderCampaigns.map((reminder) => (
              <li key={reminder.id}>
                <strong>{reminder.id}</strong>
                <span>{reminder.audience_rule}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </>
    )
  }

  return (
    <>
      <PageHeader title="Settings" description="Manage tenant identity, team access, roles, and regional credit budgets." />
      <div className="result-strip">
        <strong>{session.companyName}</strong>
        <span>{companyId}</span>
        <span>{session.membershipRole ?? 'company_user'}</span>
        <span>Credits: {formatNumber(dashboardSummary?.credit_balance)}</span>
      </div>
      <div className="split-layout two-column settings-grid">
        <form className="panel" onSubmit={createTeamAccessCode}>
          <div className="section-heading">
            <span>Invite</span>
            <strong>Access code</strong>
          </div>
          <label>
            Invite role
            <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
              <option value="customer_admin">Company admin</option>
              <option value="campaign_manager">Campaign manager</option>
              <option value="regional_manager">Regional manager</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <label>
            User credit limit
            <input value={inviteCreditLimit} onChange={(event) => setInviteCreditLimit(event.target.value)} />
          </label>
          <button>Create user access code</button>
          {accessCodeResult ? (
            <p className="notice">
              Code {accessCodeResult.code} grants {accessCodeResult.role} with{' '}
              {formatNumber(accessCodeResult.credit_limit)} credits.
            </p>
          ) : null}
        </form>

        <form className="panel" onSubmit={updateTeamUser}>
          <div className="section-heading">
            <span>Permissions</span>
            <strong>Adjust user</strong>
          </div>
          <label>
            User email
            <input value={editUserEmail} onChange={(event) => setEditUserEmail(event.target.value)} />
          </label>
          <label>
            User role
            <select value={editUserRole} onChange={(event) => setEditUserRole(event.target.value)}>
              <option value="customer_admin">Company admin</option>
              <option value="campaign_manager">Campaign manager</option>
              <option value="regional_manager">Regional manager</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <label>
            User credit limit
            <input value={editCreditLimit} onChange={(event) => setEditCreditLimit(event.target.value)} />
          </label>
          <button>Update user permissions</button>
          <button className="secondary inline-action" type="button" onClick={() => void refreshTeamUsers()}>
            Refresh team
          </button>
        </form>
      </div>
      {teamUsers.length ? (
        <ul className="compact-list">
          {teamUsers.map((user) => (
            <li key={user.user_id}>
              <strong>{user.email}</strong>
              <span>{user.role}</span>
              <span>
                Budget: {formatNumber(user.credits_used)} used / {formatNumber(user.credit_limit)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}

function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">Workspace</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <a className="docs-link" href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">
        API docs
      </a>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
