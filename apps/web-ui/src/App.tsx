import { type FormEvent, useEffect, useState } from 'react'

import { API_BASE_URL } from './api/client'
import { AppShell } from './components/AppShell'
import { CustomerAccessPage } from './pages/CustomerAccessPage'
import { InternalLoginPage } from './pages/InternalLoginPage'
import { MarketingPage } from './pages/MarketingPage'
import { DesignExploration, routeToExploration } from './pages/DesignExplorations'
import { AdminWorkspace } from './pages/admin/AdminWorkspace'
import { CompanyWorkspace } from './pages/app/CompanyWorkspace'
import { asMemberships, loadStoredSession, SESSION_KEY, surfaceFromLocation } from './state/session'
import type { AdminPage, CompanyPage, Membership, Session, Surface } from './types'

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadStoredSession())
  const [surface, setSurface] = useState<Surface>(() => surfaceFromLocation())
  const [designExploration, setDesignExploration] = useState(() => routeToExploration(window.location.pathname))
  const [adminPage, setAdminPage] = useState<AdminPage>('dashboard')
  const [companyPage, setCompanyPage] = useState<CompanyPage>('dashboard')
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [adminEmail, setAdminEmail] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupName, setSignupName] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [memberships, setMemberships] = useState<Membership[]>([])

  function navigate(nextSurface: Surface) {
    const path = nextSurface === 'internal' ? '/internal' : nextSurface === 'app' ? '/app' : '/'
    window.history.pushState(null, '', path)
    setSurface(nextSurface)
  }

  useEffect(() => {
    const handlePopState = () => {
      setSurface(surfaceFromLocation())
      setDesignExploration(routeToExploration(window.location.pathname))
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
  }

  function loginInternalAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    persistSession({ role: 'internal_admin', email: adminEmail || 'ops@company.com' })
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
    setSurface('app')
    setCompanyPage('dashboard')
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
    setCompanyPage('dashboard')
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

  return (
    <AppShell
      session={session}
      adminPage={adminPage}
      companyPage={companyPage}
      onAdminPage={setAdminPage}
      onCompanyPage={setCompanyPage}
      onLogout={logout}
    >
      {session.role === 'internal_admin' ? (
        <AdminWorkspace page={adminPage} />
      ) : (
        <CompanyWorkspace page={companyPage} session={session} onNavigate={setCompanyPage} />
      )}
    </AppShell>
  )
}
