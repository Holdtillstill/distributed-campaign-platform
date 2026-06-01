import { EmptyState } from '../../components/EmptyState'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { DataTable } from '../../components/DataTable'

import type { AdminDashboardSummary, CompanyHealthRow, CompanyResult, SystemCheck, UsageRow } from '../../types'
import { formatCount, formatNumber } from '../../utils'

function shortTraceId(traceId: string): string {
  return traceId.length > 12 ? `${traceId.slice(0, 12)}...` : traceId
}

export function AdminDashboard({
  adminSummary,
  companyResult,
  usageRows,
  companyHealthRows,
  systemChecks,
  onRefreshSystemStatus,
}: {
  adminSummary: AdminDashboardSummary | null
  companyResult: CompanyResult | null
  usageRows: UsageRow[]
  companyHealthRows: CompanyHealthRow[]
  systemChecks: SystemCheck[]
  onRefreshSystemStatus: () => void
}) {
  const messagesThisMonth = usageRows.reduce((total, row) => total + row.message_count, 0)
  const totalSubscribers = companyHealthRows.reduce((total, row) => total + row.subscriber_count, 0)
  const scheduledReach = companyHealthRows.reduce((total, row) => total + row.scheduled_reach, 0)
  const totalCredits = adminSummary?.total_credit_balance ?? 0
  const creditTone = totalCredits < 10000 ? 'warning' : 'neutral'
  const quotaWatchCount = companyHealthRows.filter((row) => row.quota_usage >= 0.8).length
  const accessCodeReadyCount = companyHealthRows.filter((row) => row.active_access_code).length
  const busiestTenant = [...companyHealthRows].sort((a, b) => b.scheduled_reach - a.scheduled_reach)[0]

  return (
    <>
      <PageHeader
        eyebrow="Internal admin"
        title="Internal operator console"
        description="Scan tenant health, quota pressure, access-code handoff, and platform readiness across active customers."
      />

      <section className="admin-operator-command" aria-label="Internal operator command surface">
        <div>
          <p className="eyebrow">Operator scan</p>
          <h2>Tenant health, quotas, and access handoff in one queue.</h2>
          <p>
            Prioritize quota-watch tenants, confirm access codes are ready for customer admins, and use system checks
            before escalating delivery or platform issues.
          </p>
        </div>
        <dl>
          <div>
            <dt>Quota watch</dt>
            <dd>{formatNumber(quotaWatchCount)}</dd>
            <dd className="metric-note">Tenants at 80%+ scheduled-send quota</dd>
          </div>
          <div>
            <dt>Access codes ready</dt>
            <dd>{formatNumber(accessCodeReadyCount)}</dd>
            <dd className="metric-note">Customer handoffs with active codes</dd>
          </div>
          <div>
            <dt>Highest scheduled reach</dt>
            <dd>{busiestTenant ? busiestTenant.company_name : 'No tenant loaded'}</dd>
            <dd className="metric-note">
              {busiestTenant ? `${formatNumber(busiestTenant.scheduled_reach)} upcoming messages` : 'Load tenant health'}
            </dd>
          </div>
        </dl>
      </section>

      <div className="metric-grid">
        <MetricCard label="Active companies" value={formatCount(adminSummary?.active_company_count)} trend="Contracted tenants" />
        <MetricCard label="Subscribers" value={totalSubscribers ? formatNumber(totalSubscribers) : 'No data yet'} trend="Across visible tenants" />
        <MetricCard label="Messages this month" value={messagesThisMonth ? formatNumber(messagesThisMonth) : 'No data yet'} trend="Load usage to refresh" />
        <MetricCard label="Scheduled reach" value={scheduledReach ? formatNumber(scheduledReach) : 'No data yet'} trend="Next 30 days" />
        <MetricCard label="Credits remaining" value={formatCount(adminSummary?.total_credit_balance)} trend="Across all tenants" tone={creditTone} />
        <MetricCard label="Active access codes" value={formatCount(adminSummary?.active_access_code_count)} trend="Ready for handoff" />
      </div>

      <section className="panel table-panel">
        <div className="section-heading">
          <span>Tenant health</span>
          <strong>Tenant health, quotas, and access codes</strong>
        </div>
        <p className="muted">Scheduled reach next 30 days drives quota watch and access-code handoff priority.</p>
        <DataTable
          ariaLabel="Tenant health"
          rows={companyHealthRows}
          getRowKey={(row) => row.company_id}
          empty={<EmptyState title="No tenant health loaded" description="Company health loads subscribers, credits, quota, and scheduled reach." />}
          columns={[
            {
              key: 'company',
              header: 'Company',
              render: (row) => (
                <div className="table-primary-cell">
                  <strong>{row.company_name}</strong>
                  <span>{row.company_id}</span>
                </div>
              ),
            },
            {
              key: 'health',
              header: 'Health',
              render: (row) => {
                const pct = Math.round(row.quota_usage * 100)
                const label = pct >= 100 ? 'Quota blocked' : pct >= 95 ? 'Quota critical' : pct >= 80 ? 'Quota watch' : 'Stable'
                const tone = pct >= 95 ? 'status-pill danger' : pct >= 80 ? 'status-pill warning' : 'status-pill'
                return <span className={tone}>{label}</span>
              },
            },
            { key: 'subscribers', header: 'Subscribers', render: (row) => formatNumber(row.subscriber_count) },
            { key: 'campaigns', header: 'Campaigns', render: (row) => formatNumber(row.campaign_count) },
            { key: 'reach', header: 'Scheduled reach', render: (row) => formatNumber(row.scheduled_reach) },
            { key: 'credits', header: 'Credits remaining', render: (row) => formatNumber(row.credits_remaining) },
            { key: 'limit', header: 'Monthly limit', render: (row) => formatNumber(row.monthly_send_limit) },
            {
              key: 'quota',
              header: 'Quota usage',
              render: (row) => {
                const pct = Math.round(row.quota_usage * 100)
                return (
                  <div className="health-quota" aria-label={`${row.company_name} quota usage ${pct}%`}>
                    <span className="health-quota-label">{row.monthly_send_limit ? `${pct}% used` : 'Not configured'}</span>
                    <span className="health-quota-track"><span style={{ width: `${Math.min(pct, 100)}%` }} /></span>
                  </div>
                )
              },
            },
            {
              key: 'access',
              header: 'Access-code handoff',
              render: (row) => <span className="code-chip">{row.active_access_code ?? 'Not configured'}</span>,
            },
          ]}
        />
      </section>

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
        <div className="status-actions">
          <button className="secondary" onClick={onRefreshSystemStatus}>
            Refresh checks
          </button>
          <div className="observability-links" aria-label="Observability links">
            <a className="docs-link secondary-link" href="http://127.0.0.1:3000" target="_blank" rel="noreferrer">
              Grafana
            </a>
            <a className="docs-link secondary-link" href="http://127.0.0.1:3000/explore" target="_blank" rel="noreferrer">
              Tempo Explore
            </a>
            <a className="docs-link secondary-link" href="http://127.0.0.1:9090" target="_blank" rel="noreferrer">
              Prometheus
            </a>
          </div>
        </div>
        <ul className="compact-list">
          {systemChecks.map((check) => (
            <li className={check.state} key={check.path}>
              <strong>{check.label}</strong>
              <span>{check.detail}</span>
              {check.traceId ? (
                <button
                  className="trace-chip"
                  title={`Copy trace ${check.traceId}`}
                  onClick={() => void navigator.clipboard?.writeText(check.traceId ?? '')}
                >
                  Trace {shortTraceId(check.traceId)}
                </button>
              ) : null}
              {check.spanId ? <span className="trace-meta">Span {shortTraceId(check.spanId)}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
