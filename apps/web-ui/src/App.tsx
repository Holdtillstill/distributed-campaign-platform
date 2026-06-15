import { type FormEvent, useEffect, useState } from 'react'

import { API_BASE_URL, PUBLIC_DESIGN_ROUTES_ENABLED, apiErrorMessage, isStaticPortfolioHost, readApiJson } from './api/client'
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
import { RedesignApp } from './redesign/RedesignApp'
import { RedesignV2App } from './redesign-v2/RedesignV2App'
import { asMemberships, loadStoredSession, SESSION_KEY, surfaceFromLocation } from './state/session'
import { staticDemoSession } from './staticDemoData'
import type { AdminPage, CampaignSubpage, CompanyPage, Membership, Session, Surface } from './types'

type PublicRoute = { page: 'features'; activeSlug?: string } | { page: 'kb' } | { page: 'design-review' }
type AuthenticatedRouteUnavailable = { surface: 'app' | 'internal'; path: string }
type RedesignV2Route =
  | { mode: 'company'; companyPage: CompanyPage; campaignSubpage?: CampaignSubpage }
  | { mode: 'admin'; adminPage: AdminPage }

const companyPageIds = ['dashboard', 'campaigns', 'subscribers', 'content', 'analytics', 'settings'] as const
const adminPageIds = ['dashboard', 'companies', 'usage'] as const
const USE_LEGACY_AUTHENTICATED_WORKSPACE = import.meta.env.MODE === 'test'

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

const v2CompanyPagePaths: Record<CompanyPage, string> = {
  dashboard: '/app-v2/dashboard',
  campaigns: '/app-v2/campaigns',
  subscribers: '/app-v2/subscribers',
  content: '/app-v2/content',
  analytics: '/app-v2/analytics',
  settings: '/app-v2/settings',
}

const v2AdminPagePaths: Record<AdminPage, string> = {
  dashboard: '/internal-v2/dashboard',
  companies: '/internal-v2/companies',
  usage: '/internal-v2/usage',
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

function isV2CampaignMonitorPath(path: string): boolean {
  return path === '/monitor-v2' || path.startsWith('/monitor-v2/') || path === '/app-v2/monitor' || path.startsWith('/app-v2/monitor/')
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
  const path = window.location.pathname
  if (isCampaignMonitorPath(path)) return 'monitor'

  const campaignSegment = firstRouteSegment(path, '/app/campaigns')
  if (campaignSegment === 'new') return 'create'
  if (campaignSegment === 'scheduled') return 'scheduled'
  if (campaignSegment === 'sent') return 'past'
  if (campaignSegment === 'follow-ups') return 'followups'
  return undefined
}

function v2CompanyPageFromLocation(): CompanyPage {
  const path = window.location.pathname
  if (isV2CampaignMonitorPath(path)) return 'campaigns'

  const segment = firstRouteSegment(path, '/app-v2')
  if (!segment) return 'dashboard'
  return isCompanyPage(segment) ? segment : 'dashboard'
}

function v2AdminPageFromLocation(): AdminPage {
  const segment = firstRouteSegment(window.location.pathname, '/internal-v2')
  if (!segment) return 'dashboard'
  return isAdminPage(segment) ? segment : 'dashboard'
}

function v2CampaignSubpageFromLocation(): CampaignSubpage | undefined {
  const path = window.location.pathname
  if (isV2CampaignMonitorPath(path)) return 'monitor'

  const campaignSegment = firstRouteSegment(path, '/app-v2/campaigns')
  if (campaignSegment === 'new') return 'create'
  if (campaignSegment === 'scheduled') return 'scheduled'
  if (campaignSegment === 'sent') return 'past'
  if (campaignSegment === 'follow-ups') return 'followups'
  return undefined
}

function redesignV2RouteFromLocation(): RedesignV2Route | null {
  const path = window.location.pathname
  if (path === '/app-v2' || path.startsWith('/app-v2/') || isV2CampaignMonitorPath(path)) {
    return {
      mode: 'company',
      companyPage: v2CompanyPageFromLocation(),
      campaignSubpage: v2CampaignSubpageFromLocation(),
    }
  }

  if (path === '/internal-v2' || path.startsWith('/internal-v2/')) {
    return { mode: 'admin', adminPage: v2AdminPageFromLocation() }
  }

  return null
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
  if (PUBLIC_DESIGN_ROUTES_ENABLED && (path === '/design-review' || path === '/designs')) return { page: 'design-review' }
  if (path === '/kb' || path.startsWith('/kb/')) return { page: 'kb' }
  if (path === '/features' || path.startsWith('/features/')) {
    const activeSlug = path.split('/')[2]
    return { page: 'features', activeSlug }
  }
  return null
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const storedSession = loadStoredSession()
    if (storedSession) return storedSession
    const canUseStaticDemoSession = isStaticPortfolioHost() || (import.meta.env.DEV && import.meta.env.MODE !== 'test')
    return canUseStaticDemoSession && surfaceFromLocation() === 'app' ? staticDemoSession : null
  })
  const [surface, setSurface] = useState<Surface>(() => surfaceFromLocation())
  const [publicRoute, setPublicRoute] = useState<PublicRoute | null>(() => publicRouteFromLocation())
  const [designExploration, setDesignExploration] = useState(() =>
    PUBLIC_DESIGN_ROUTES_ENABLED ? routeToExploration(window.location.pathname) : null,
  )
  const [appDesignExploration, setAppDesignExploration] = useState(() =>
    PUBLIC_DESIGN_ROUTES_ENABLED ? routeToAppDesign(window.location.pathname) : null,
  )
  const [redesignV2Route, setRedesignV2Route] = useState<RedesignV2Route | null>(() => redesignV2RouteFromLocation())
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
    setDesignExploration(PUBLIC_DESIGN_ROUTES_ENABLED ? routeToExploration(window.location.pathname) : null)
    setAppDesignExploration(PUBLIC_DESIGN_ROUTES_ENABLED ? routeToAppDesign(window.location.pathname) : null)
    setRedesignV2Route(redesignV2RouteFromLocation())
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

  function navigateV2AdminPage(nextPage: AdminPage) {
    pushHistory(v2AdminPagePaths[nextPage])
    setRedesignV2Route(redesignV2RouteFromLocation())
  }

  function navigateV2CompanyPage(
    nextPage: CompanyPage,
    options: { campaignSubpage?: CampaignSubpage; path?: string } = {},
  ) {
    pushHistory(options.path ?? v2CompanyPagePaths[nextPage])
    setRedesignV2Route(redesignV2RouteFromLocation())
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
    persistSession({ role: 'internal_admin', email: adminEmail || 'ops@example.test' })
    syncRouteStateFromLocation()
  }

  async function lookupMemberships(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthMessage(null)
    try {
      const response = await fetch(`${API_BASE_URL}/me/memberships`, {
        headers: { 'X-User-Email': loginEmail },
      })
      if (!response.ok) {
        setAuthMessage(`Membership lookup failed: ${response.status}`)
        return
      }
      const result = asMemberships(await readApiJson<unknown>(response))
      setMemberships(result)
      if (result.length === 0) {
        setAuthMessage('No companies found. Please sign up with an access code from your company admin.')
      }
    } catch (error) {
      setAuthMessage(apiErrorMessage(error, 'Membership lookup failed. Check that the Campaign API is available.'))
    }
  }

  async function signupWithAccessCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthMessage(null)
    try {
      const response = await fetch(`${API_BASE_URL}/signup/access-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail, name: signupName, access_code: accessCode }),
      })
      if (!response.ok) {
        setAuthMessage('Access code signup failed. Check the code and try again.')
        return
      }
      const result = await readApiJson<{
        email: string
        company_id: string
        company_name: string
        membership_role: string
        credit_limit?: number | null
        credits_used?: number
      }>(response)
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
    } catch (error) {
      setAuthMessage(apiErrorMessage(error, 'Access code signup failed. Check that the Campaign API is available.'))
    }
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

  if (redesignV2Route) {
    if (redesignV2Route.mode === 'admin') {
      if (session?.role !== 'internal_admin') {
        return (
          <InternalLoginPage
            adminEmail={adminEmail}
            onAdminEmail={setAdminEmail}
            onLogin={loginInternalAdmin}
          />
        )
      }

      return (
        <RedesignV2App
          initialMode="admin"
          routeSyncMode="admin"
          adminPage={redesignV2Route.adminPage}
          onAdminPage={navigateV2AdminPage}
        />
      )
    }

    return (
      <RedesignV2App
        initialMode="company"
        routeSyncMode="company"
        companyPage={redesignV2Route.companyPage}
        campaignSubpage={redesignV2Route.campaignSubpage}
        onCompanyPage={navigateV2CompanyPage}
      />
    )
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

  if (surface === 'internal' && session.role !== 'internal_admin') {
    return (
      <InternalLoginPage
        adminEmail={adminEmail}
        onAdminEmail={setAdminEmail}
        onLogin={loginInternalAdmin}
      />
    )
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

  if (!USE_LEGACY_AUTHENTICATED_WORKSPACE && !activeUnavailableRoute) {
    const initialMode = session.role === 'internal_admin' && surface === 'internal' ? 'admin' : 'company'

    return (
      <RedesignApp
        initialMode={initialMode}
        routeSyncMode={initialMode}
        adminPage={adminPage}
        companyPage={companyPage}
        campaignSubpage={companyCampaignSubpage}
        onAdminPage={navigateAdminPage}
        onCompanyPage={navigateCompanyPage}
      />
    )
  }

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
    : [...Object.values(companyPagePaths), '/app/campaigns/new', '/app/monitor', '/monitor'].join(', ')

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
