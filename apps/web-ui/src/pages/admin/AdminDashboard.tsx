import { EmptyState } from '../../components/EmptyState'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import type { AdminDashboardSummary, CompanyResult, SystemCheck, UsageRow } from '../../types'
import { formatCount, formatNumber } from '../../utils'

export function AdminDashboard({
  adminSummary,
  companyResult,
  usageRows,
  systemChecks,
  onRefreshSystemStatus,
}: {
  adminSummary: AdminDashboardSummary | null
  companyResult: CompanyResult | null
  usageRows: UsageRow[]
  systemChecks: SystemCheck[]
  onRefreshSystemStatus: () => void
}) {
  const messagesThisMonth = usageRows.reduce((total, row) => total + row.message_count, 0)
  const totalSubscribers = 0
  const totalCredits = adminSummary?.total_credit_balance ?? 0
  const creditTone = totalCredits < 10000 ? 'warning' : 'neutral'

  return (
    <>
      <PageHeader
        eyebrow="Internal admin"
        title="Admin dashboard"
        description="Monitor tenant onboarding, quota setup, access code handoff, and platform readiness."
      />
      <div className="metric-grid">
        <MetricCard label="Active companies" value={formatCount(adminSummary?.active_company_count)} trend="Contracted tenants" />
        <MetricCard label="Subscribers" value={totalSubscribers ? formatNumber(totalSubscribers) : 'No data yet'} trend="Subscriber rollup pending" />
        <MetricCard label="Messages this month" value={messagesThisMonth ? formatNumber(messagesThisMonth) : 'No data yet'} trend="Load usage to refresh" />
        <MetricCard label="Credits remaining" value={formatCount(adminSummary?.total_credit_balance)} trend="Across all tenants" tone={creditTone} />
        <MetricCard label="Active access codes" value={formatCount(adminSummary?.active_access_code_count)} trend="Ready for handoff" />
      </div>

      <div className="dashboard-grid">
        <section className="panel chart-card" aria-label="Platform message trend">
          <div className="section-heading">
            <span>Trend</span>
            <strong>Message volume</strong>
          </div>
          <div className="mini-chart" aria-hidden="true">
            <span style={{ height: '34%' }} />
            <span style={{ height: '48%' }} />
            <span style={{ height: '42%' }} />
            <span style={{ height: '66%' }} />
            <span style={{ height: '58%' }} />
            <span style={{ height: '76%' }} />
            <span style={{ height: '62%' }} />
          </div>
          <p className="muted">Usage loads from the cross-tenant usage report.</p>
        </section>

        <section className="panel alert-panel" aria-label="Quota risk and alerts">
          <div className="section-heading">
            <span>Risk</span>
            <strong>Quota alerts</strong>
          </div>
          {totalCredits === 0 ? (
            <EmptyState
              title="No credit risk data yet"
              description="Load tenant usage or create companies with contract credits to surface risk signals."
            />
          ) : (
            <ul className="compact-list embedded-list">
              <li className={totalCredits < 10000 ? 'error' : 'ok'}>
                <strong>{totalCredits < 10000 ? 'Credits need review' : 'Credit pool healthy'}</strong>
                <span>{formatNumber(totalCredits)} contract credits remain across active companies.</span>
              </li>
              <li className="checking">
                <strong>Latest access code</strong>
                <span>{companyResult?.access_code ?? 'No recent company handoff'}</span>
              </li>
            </ul>
          )}
        </section>
      </div>

      <section className="status-section panel" aria-label="System status">
        <div className="section-heading">
          <span>Platform</span>
          <strong>System status</strong>
        </div>
        <button className="secondary" onClick={onRefreshSystemStatus}>
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
