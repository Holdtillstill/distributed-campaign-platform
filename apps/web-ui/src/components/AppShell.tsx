import type { ReactNode } from 'react'

import { getRoleMeta } from '../roles'
import type { AdminPage, CompanyPage, NavItem, Session } from '../types'
import { formatNumber } from '../utils'

const adminNav: NavItem<AdminPage>[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'companies', label: 'Companies' },
  { id: 'usage', label: 'Usage' },
]

const companyNav: NavItem<CompanyPage>[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'subscribers', label: 'Subscribers' },
  { id: 'content', label: 'Content Library' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
]

export function AppShell({
  session,
  adminPage,
  companyPage,
  onAdminPage,
  onCompanyPage,
  onLogout,
  children,
}: {
  session: Session
  adminPage: AdminPage
  companyPage: CompanyPage
  onAdminPage: (page: AdminPage) => void
  onCompanyPage: (page: CompanyPage) => void
  onLogout: () => void
  children: ReactNode
}) {
  const isAdmin = session.role === 'internal_admin'
  const nav = isAdmin ? adminNav : companyNav
  const activePage = isAdmin ? adminPage : companyPage
  const roleMeta = session.role === 'company_user' ? getRoleMeta(session.membershipRole) : null
  const remainingBudget =
    session.role === 'company_user' && session.creditLimit !== null && session.creditLimit !== undefined
      ? Math.max(0, session.creditLimit - (session.creditsUsed ?? 0))
      : null

  return (
    <main className={isAdmin ? 'app-frame admin-frame' : 'app-frame company-frame'}>
      <aside className="sidebar" aria-label={isAdmin ? 'Admin navigation' : 'Company navigation'}>
        <div className="brand-lockup">
          <span>CampaignOS</span>
          <strong>{isAdmin ? 'Internal' : session.companyName}</strong>
        </div>
        {session.role === 'company_user' && roleMeta ? (
          <div className="sidebar-context" aria-label="Workspace role and budget">
            <span className="context-kicker">{roleMeta.label}</span>
            <strong>{session.email}</strong>
            <p>{roleMeta.permissionSummary}</p>
            <div className="sidebar-budget">
              <span>Budget</span>
              <strong>
                {session.creditLimit !== null && session.creditLimit !== undefined
                  ? `${formatNumber(remainingBudget)} remaining`
                  : 'Company pooled'}
              </strong>
              <small>
                {session.creditLimit !== null && session.creditLimit !== undefined
                  ? `${formatNumber(session.creditsUsed ?? 0)} used of ${formatNumber(session.creditLimit)}`
                  : 'No individual allocation on this membership'}
              </small>
            </div>
          </div>
        ) : (
          <div className="sidebar-context" aria-label="Internal role">
            <span className="context-kicker">Internal operator</span>
            <strong>{session.email}</strong>
            <p>Tenant setup, quota visibility, usage reporting, and platform observability.</p>
          </div>
        )}
        <nav>
          {nav.map((item) => (
            <button
              className={activePage === item.id ? 'nav-item active' : 'nav-item'}
              aria-pressed={activePage === item.id}
              key={item.id}
              onClick={() => {
                if (isAdmin) onAdminPage(item.id as AdminPage)
                else onCompanyPage(item.id as CompanyPage)
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>{isAdmin ? 'Internal console' : roleMeta?.marketScope ?? 'Workspace access'}</span>
          <div className="sidebar-resource-links" aria-label="Product help links">
            <a href="/features">Features</a>
            <a href="/kb">Knowledge base</a>
            <a href="https://bozhi.dev/privacy.html">Privacy</a>
          </div>
          <button className="secondary" onClick={onLogout} type="button">
            Logout
          </button>
        </div>
      </aside>
      <section className="page-surface">{children}</section>
    </main>
  )
}
