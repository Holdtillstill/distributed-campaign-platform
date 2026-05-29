import { type FormEvent, useEffect, useState } from 'react'

import { API_BASE_URL } from './api/client'
import { AppShell } from './components/AppShell'
import { EmptyState } from './components/EmptyState'
import { CustomerAccessPage } from './pages/CustomerAccessPage'
import { DesignReviewPage } from './pages/DesignReviewPage'
import { FeatureMarketingPage } from './pages/FeatureMarketingPage'
import { InternalLoginPage } from './pages/InternalLoginPage'
import { KnowledgeBasePage } from './pages/KnowledgeBasePage'
import { MarketingPage } from './pages/MarketingPage'
import { AppDesignExploration, routeToAppDesign } from './pages/AppDesignExplorations'
import { DesignExploration, routeToExploration } from './pages/DesignExplorations'
import { AdminWorkspace } from './pages/admin/AdminWorkspace'
import { CompanyWorkspace } from './pages/app/CompanyWorkspace'
import { asMemberships, loadStoredSession, SESSION_KEY, surfaceFromLocation } from './state/session'
import type { AdminPage, CampaignSubpage, CompanyPage, Membership, Session, Surface } from './types'

type PublicRoute = { page: 'features'; activeSlug?: string } | { page: 'kb' } | { page: 'design-review' }
type AuthenticatedRouteUnavailable = { surface: 'app' | 'internal'; path: string }

const companyPageIds = ['dashboard', 'campaigns', 'subscribers', 'content', 'analytics', 'settings'] as const
const adminPageIds = ['dashboard', 'companies', 'usage'] as const

const companyPagePaths: Record<CompanyPage, string> = {
  dashboard: '/app/dashboard',
  campaigns: '/app/campaigns',
  subscribers: '/app/subscribers',
  content: '/app/content',
  analytics: '/app/analytics',
  settings: '/app/settings',
}

const adminPagePaths: Record<AdminPage, string> = {
  dashboard: '/internal/dashboard',
  companies: '/internal/companies',
  usage: '/internal/usage',
}

function isCompanyPage(value: string): value is CompanyPage {
  return (companyPageIds as readonly string[]).includes(value)
}

function isAdminPage(value: string): value is AdminPage {
  return (adminPageIds as readonly string[]).includes(value)
}

function firstRouteSegment(path: string, basePath: string): string | null {
  if (path === basePath || path === `${basePath}/`) return null
  if (!path.startsWith(`${basePath}/`)) return null
  return path.slice(basePath.length + 1).split('/')[0] || null
}

function isCampaignMonitorPath(path: string): boolean {
  return path === '/monitor' || path.startsWith('/monitor/') || path === '/app/monitor' || path.startsWith('/app/monitor/')
}

function companyPageFromLocation(): CompanyPage {
  const path = window.location.pathname
  if (isCampaignMonitorPath(path)) return 'campaigns'

  const segment = firstRouteSegment(path, '/app')
  if (!segment) return 'dashboard'
  return isCompanyPage(segment) ? segment : 'dashboard'
}

function adminPageFromLocation(): AdminPage {
  const segment = firstRouteSegment(window.location.pathname, '/internal')
  if (!segment) return 'dashboard'
  return isAdminPage(segment) ? segment : 'dashboard'
}

function campaignSubpageFromLocation(): CampaignSubpage | undefined {
  return isCampaignMonitorPath(window.location.pathname) ? 'monitor' : undefined
}

function unavailableAuthenticatedRouteFromLocation(): AuthenticatedRouteUnavailable | null {
  const path = window.location.pathname
  const companySegment = firstRouteSegment(path, '/app')
  if (companySegment && !isCampaignMonitorPath(path) && !isCompanyPage(companySegment)) {
    return { surface: 'app', path }
  }

  const adminSegment = firstRouteSegment(path, '/internal')
  if (adminSegment && !isAdminPage(adminSegment)) {
    return { surface: 'internal', path }
  }

  return null
}

function publicRouteFromLocation(): PublicRoute | null {
  const path = window.location.pathname
  if (path === '/design-review' || path === '/designs') return { page: 'design-review' }
  if (path === '/kb' || path.startsWith('/kb/')) return { page: 'kb' }
  if (path === '/features' || path.startsWith('/features/')) {
    const activeSlug = path.split('/')[2]
    return { page: 'features', activeSlug }
  }
  return null
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadStoredSession())
  const [surface, setSurface] = useState<Surface>(() => surfaceFromLocation())
  const [publicRoute, setPublicRoute] = useState<PublicRoute | null>(() => publicRouteFromLocation())
  const [designExploration, setDesignExploration] = useState(() => routeToExploration(window.location.pathname))
  const [appDesignExploration, setAppDesignExploration] = useState(() => routeToAppDesign(window.location.pathname))
  const [adminPage, setAdminPage] = useState<AdminPage>(() => adminPageFromLocation())
  const [companyPage, setCompanyPage] = useState<CompanyPage>(() => companyPageFromLocation())
  const [companyCampaignSubpage, setCompanyCampaignSubpage] = useState<CampaignSubpage | undefined>(() =>
    campaignSubpageFromLocation(),
  )
  const [unavailableRoute, setUnavailableRoute] = useState<AuthenticatedRouteUnavailable | null>(() =>
    unavailableAuthenticatedRouteFromLocation(),
  )
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [adminEmail, setAdminEmail] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupName, setSignupName] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [memberships, setMemberships] = useState<Membership[]>([])

  function syncRouteStateFromLocation() {
    setSurface(surfaceFromLocation())
    setPublicRoute(publicRouteFromLocation())
    setDesignExploration(routeToExploration(window.location.pathname))
    setAppDesignExploration(routeToAppDesign(window.location.pathname))
    setAdminPage(adminPageFromLocation())
    setCompanyPage(companyPageFromLocation())
    setCompanyCampaignSubpage(campaignSubpageFromLocation())
    setUnavailableRoute(unavailableAuthenticatedRouteFromLocation())
  }

  function pushHistory(path: string) {
    if (window.location.pathname !== path) window.history.pushState(null, '', path)
  }

  function navigate(nextSurface: Surface) {
    pushHistory(nextSurface === 'internal' ? '/internal' : nextSurface === 'app' ? '/app' : '/')
    syncRouteStateFromLocation()
  }

  function navigateAdminPage(nextPage: AdminPage) {
    pushHistory(adminPagePaths[nextPage])
    setSurface('internal')
    setPublicRoute(null)
    setDesignExploration(null)
    setAppDesignExploration(null)
    setUnavailableRoute(null)
    setAdminPage(nextPage)
  }

  function navigateCompanyPage(
    nextPage: CompanyPage,
    options: { campaignSubpage?: CampaignSubpage; path?: string } = {},
  ) {
    pushHistory(options.path ?? companyPagePaths[nextPage])
    setSurface('app')
    setPublicRoute(null)
    setDesignExploration(null)
    setAppDesignExploration(null)
    setUnavailableRoute(null)
    setCompanyPage(nextPage)
    setCompanyCampaignSubpage(options.campaignSubpage ?? campaignSubpageFromLocation())
  }

  useEffect(() => {
    const handlePopState = () => {
      syncRouteStateFromLocation()
    }
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
    setCompanyCampaignSubpage(undefined)
    setUnavailableRoute(null)
  }

  function loginInternalAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    persistSession({ role: 'internal_admin', email: adminEmail || 'ops@company.com' })
    syncRouteStateFromLocation()
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
      credit_limit?: number | null
      credits_used?: number
    }
    persistSession({
      role: 'company_user',
      email: result.email,
      companyId: result.company_id,
      companyName: result.company_name,
      membershipRole: result.membership_role,
      creditLimit: result.credit_limit,
      creditsUsed: result.credits_used ?? 0,
    })
    syncRouteStateFromLocation()
  }

  function openMembership(membership: Membership) {
    persistSession({
      role: 'company_user',
      email: loginEmail,
      companyId: membership.company_id,
      companyName: membership.company_name,
      membershipRole: membership.role,
      creditLimit: membership.credit_limit,
      creditsUsed: membership.credits_used ?? 0,
    })
    syncRouteStateFromLocation()
  }

  const customerAccess = (
    <CustomerAccessPage
      signupEmail={signupEmail}
      signupName={signupName}
      accessCode={accessCode}
      loginEmail={loginEmail}
      memberships={memberships}
      authMessage={authMessage}
      onSignupEmail={setSignupEmail}
      onSignupName={setSignupName}
      onAccessCode={setAccessCode}
      onLoginEmail={setLoginEmail}
      onSignup={(event) => void signupWithAccessCode(event)}
      onLookup={(event) => void lookupMemberships(event)}
      onOpenMembership={openMembership}
    />
  )

  if (designExploration) {
    return <DesignExploration id={designExploration} />
  }

  if (appDesignExploration) {
    return <AppDesignExploration id={appDesignExploration} />
  }

  if (publicRoute?.page === 'kb') {
    return <KnowledgeBasePage />
  }

  if (publicRoute?.page === 'design-review') {
    return <DesignReviewPage />
  }

  if (publicRoute?.page === 'features') {
    return <FeatureMarketingPage activeSlug={publicRoute.activeSlug} />
  }

  if (!session) {
    if (surface === 'marketing') {
      return <MarketingPage onCustomerAccess={() => navigate('app')} />
    }

    if (surface === 'internal') {
      return (
        <InternalLoginPage
          adminEmail={adminEmail}
          onAdminEmail={setAdminEmail}
          onLogin={loginInternalAdmin}
        />
      )
    }

    return customerAccess
  }

  if (surface === 'app' && session.role !== 'company_user') {
    return customerAccess
  }

  if (session.role === 'internal_admin' && surface === 'marketing') {
    return <MarketingPage onCustomerAccess={() => navigate('app')} onInternalAccess={() => navigate('internal')} />
  }

  const activeUnavailableRoute =
    unavailableRoute &&
    ((session.role === 'internal_admin' && unavailableRoute.surface === 'internal') ||
      (session.role === 'company_user' && unavailableRoute.surface === 'app'))
      ? unavailableRoute
      : null

  return (
    <AppShell
      session={session}
      adminPage={adminPage}
      companyPage={companyPage}
      onAdminPage={navigateAdminPage}
      onCompanyPage={navigateCompanyPage}
      onLogout={logout}
    >
      {activeUnavailableRoute ? (
        <AuthenticatedRoutePlaceholder route={activeUnavailableRoute} />
      ) : session.role === 'internal_admin' ? (
        <AdminWorkspace page={adminPage} />
      ) : (
        <CompanyWorkspace
          page={companyPage}
          session={session}
          initialCampaignSubpage={companyCampaignSubpage}
          onNavigate={navigateCompanyPage}
        />
      )}
    </AppShell>
  )
}

function AuthenticatedRoutePlaceholder({ route }: { route: AuthenticatedRouteUnavailable }) {
  const isInternal = route.surface === 'internal'
  const homePath = isInternal ? adminPagePaths.dashboard : companyPagePaths.dashboard
  const availableRoutes = isInternal
    ? Object.values(adminPagePaths).join(', ')
    : [...Object.values(companyPagePaths), '/app/monitor', '/monitor'].join(', ')

  return (
    <section className="panel route-placeholder" aria-label="Unavailable route">
      <EmptyState
        title="Route not available"
        description={`${route.path} does not map to an available ${isInternal ? 'internal admin' : 'customer workspace'} page.`}
        action={
          <a className="docs-link secondary-link" href={homePath}>
            Open dashboard
          </a>
        }
      />
      <p className="helper-text">Available routes: {availableRoutes}</p>
    </section>
  )
}
