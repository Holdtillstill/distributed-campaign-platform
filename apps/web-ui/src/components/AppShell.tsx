import type { ReactNode } from 'react'

import type { AdminPage, CompanyPage, NavItem, Session } from '../types'

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

  return (
    <main className={isAdmin ? 'app-frame admin-frame' : 'app-frame company-frame'}>
      <aside className="sidebar" aria-label={isAdmin ? 'Admin navigation' : 'Company navigation'}>
        <div className="brand-lockup">
          <span>CampaignOS</span>
          <strong>{isAdmin ? 'Internal' : session.companyName}</strong>
        </div>
        <nav>
          {nav.map((item) => (
            <button
              className={activePage === item.id ? 'nav-item active' : 'nav-item'}
              key={item.id}
              onClick={() => {
                if (isAdmin) onAdminPage(item.id as AdminPage)
                else onCompanyPage(item.id as CompanyPage)
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>{session.email}</span>
          <button className="secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>
      <section className="page-surface">{children}</section>
    </main>
  )
}
