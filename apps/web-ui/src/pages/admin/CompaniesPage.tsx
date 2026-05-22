import type { FormEvent } from 'react'

import { DataTable } from '../../components/DataTable'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'

import type { CampaignListItem, CompanyHealthRow, CompanyResult, UsageRow } from '../../types'
import { formatLocalDateTime, formatNumber } from '../../utils'

export function CompaniesPage({
  companyName,
  companySlug,
  initialAdminEmail,
  monthlySendLimit,
  creditBalance,
  companyResult,
  companies,
  companyHealthRows,
  selectedCompanyHealth,
  selectedCompanyCampaigns,
  error,
  onCompanyName,
  onCompanySlug,
  onInitialAdminEmail,
  onMonthlySendLimit,
  onCreditBalance,
  onCreateCompany,
  onRefreshCompanyHealth,
  onReviewCompany,
}: {
  companyName: string
  companySlug: string
  initialAdminEmail: string
  monthlySendLimit: string
  creditBalance: string
  companyResult: CompanyResult | null
  companies: UsageRow[]
  companyHealthRows: CompanyHealthRow[]
  selectedCompanyHealth: CompanyHealthRow | null
  selectedCompanyCampaigns: CampaignListItem[]
  error: string | null
  onCompanyName: (value: string) => void
  onCompanySlug: (value: string) => void
  onInitialAdminEmail: (value: string) => void
  onMonthlySendLimit: (value: string) => void
  onCreditBalance: (value: string) => void
  onCreateCompany: (event: FormEvent<HTMLFormElement>) => void
  onRefreshCompanyHealth: () => void
  onReviewCompany: (row: CompanyHealthRow) => void
}) {
  const companyRows = companyResult && !companyHealthRows.some((row) => row.company_id === companyResult.id)
    ? [
        {
          company_id: companyResult.id,
          company_name: companyResult.name,
          subscriber_count: 0,
          campaign_count: 0,
          scheduled_reach: 0,
          credits_remaining: companyResult.credit_balance,
          monthly_send_limit: companyResult.monthly_send_limit,
          quota_usage: 0,
          active_access_code: companyResult.access_code,
        },
        ...companyHealthRows,
      ]
    : companyHealthRows

  return (
    <>
      <PageHeader
        eyebrow="Tenant management"
        title="Companies"
        description="Create contracted tenants, set monthly sending guardrails, and hand off copy-friendly access codes."
      />

      <div className="split-layout two-column">
        <form className="panel form-stack" onSubmit={onCreateCompany}>
          <div className="section-heading">
            <span>Create</span>
            <strong>New company</strong>
          </div>
          <p className="helper-text">
            Monthly send limit is the operational throttle for campaign volume. Contract credits are the prepaid balance
            consumed by sends and smart tracking.
          </p>
          <label>
            Company name
            <input value={companyName} onChange={(event) => onCompanyName(event.target.value)} />
          </label>
          <label>
            Company slug
            <input value={companySlug} onChange={(event) => onCompanySlug(event.target.value)} />
          </label>
          <label>
            Initial admin email
            <input type="email" value={initialAdminEmail} onChange={(event) => onInitialAdminEmail(event.target.value)} />
          </label>
          <label>
            Monthly send limit
            <input inputMode="numeric" value={monthlySendLimit} onChange={(event) => onMonthlySendLimit(event.target.value)} />
          </label>
          <label>
            Contract credits
            <input inputMode="numeric" value={creditBalance} onChange={(event) => onCreditBalance(event.target.value)} />
          </label>
          <button>Create company</button>
        </form>

        <section className="panel">
          <div className="section-heading">
            <span>Handoff</span>
            <strong>Access code</strong>
          </div>
          {companyResult ? (
            <div className="access-code-panel">
              <span>Give this code to the initial company admin</span>
              <strong>{companyResult.access_code}</strong>
              <p>
                {companyResult.admin_user.email} can sign up at customer access using this code. Monthly limit:{' '}
                {formatNumber(companyResult.monthly_send_limit)}. Contract credits:{' '}
                {formatNumber(companyResult.credit_balance)}.
              </p>
            </div>
          ) : (
            <EmptyState
              title="No access code generated"
              description="Create a company to generate the first customer admin access code."
            />
          )}
        </section>
      </div>

      <section className="panel table-panel">
        <div className="section-heading">
          <span>Manage</span>
          <strong>Existing companies</strong>
        </div>
        <button className="secondary inline-action" onClick={onRefreshCompanyHealth}>
          Refresh company health
        </button>
        <DataTable
          ariaLabel="Existing companies"
          rows={companyRows}
          getRowKey={(row) => row.company_id}
          empty={
            <EmptyState
              title="No companies loaded yet"
              description="Create a company or load usage to populate this management table."
            />
          }
          columns={[
            {
              key: 'company',
              header: 'Company',
              render: (row) => (
                <div className="company-cell-action">
                  <strong>{row.company_name}</strong>
                  <button
                    aria-label={`Review ${row.company_name}`}
                    className="secondary inline-action"
                    onClick={() => onReviewCompany(row)}
                  >
                    Review
                  </button>
                </div>
              ),
            },
            { key: 'subscribers', header: 'Subscribers', render: (row) => formatNumber(row.subscriber_count) },
            { key: 'campaigns', header: 'Campaigns', render: (row) => formatNumber(row.campaign_count) },
            { key: 'reach', header: 'Scheduled reach', render: (row) => formatNumber(row.scheduled_reach) },
            { key: 'credits', header: 'Credits', render: (row) => formatNumber(row.credits_remaining) },
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
            { key: 'access', header: 'Access code', render: (row) => <span className="code-chip">{row.active_access_code ?? 'Not configured'}</span> },
            { key: 'status', header: 'Status', render: () => <span className="status-pill">Active</span> },
          ]}
        />
      </section>
      {selectedCompanyHealth ? (
        <section className="panel company-detail-workspace" aria-label={`${selectedCompanyHealth.company_name} detail workspace`}>
          <div className="section-heading">
            <span>Company detail</span>
            <h2>{selectedCompanyHealth.company_name} workspace</h2>
          </div>
          <div className="result-strip compact-id-strip">
            <strong>{selectedCompanyHealth.company_name}</strong>
            <small>{selectedCompanyHealth.company_id}</small>
            <span>Active access code: {selectedCompanyHealth.active_access_code ?? 'Not configured'}</span>
          </div>
          <div className="metric-grid spaced">
            <div className="metric">
              <span>Subscribers</span>
              <strong>{formatNumber(selectedCompanyHealth.subscriber_count)}</strong>
              <small>Active and marketable subscribers</small>
            </div>
            <div className="metric">
              <span>Campaigns</span>
              <strong>{formatNumber(selectedCompanyHealth.campaign_count)}</strong>
              <small>Total campaigns for this tenant</small>
            </div>
            <div className="metric">
              <span>Scheduled reach next 30 days</span>
              <strong>{formatNumber(selectedCompanyHealth.scheduled_reach)}</strong>
              <small>Queued messages in upcoming scheduled campaigns</small>
            </div>
            <div className="metric">
              <span>Credits remaining</span>
              <strong>{formatNumber(selectedCompanyHealth.credits_remaining)}</strong>
              <small>Current prepaid balance</small>
            </div>
            <div className="metric">
              <span>Monthly send limit</span>
              <strong>{formatNumber(selectedCompanyHealth.monthly_send_limit)}</strong>
              <small>Contract throttle for scheduled sends</small>
            </div>
          </div>
          <div className="dashboard-grid">
            <div className="quota-card">
              <div className="quota-header">
                <strong>Quota usage</strong>
                <span>{Math.round(selectedCompanyHealth.quota_usage * 100)}% used</span>
              </div>
              <div className="quota-track" aria-hidden="true">
                <span style={{ width: `${Math.min(Math.round(selectedCompanyHealth.quota_usage * 100), 100)}%` }} />
              </div>
              <p>
                {formatNumber(selectedCompanyHealth.scheduled_reach)} scheduled messages against{' '}
                {formatNumber(selectedCompanyHealth.monthly_send_limit)} monthly capacity.
              </p>
            </div>
            <EmptyState
              title="Operator notes have not been added"
              description="Risk notes, owner handoff context, and support escalations will appear here once recorded."
            />
          </div>
          <section className="table-panel">
            <div className="section-heading">
              <span>Campaigns</span>
              <strong>Recent and upcoming</strong>
            </div>
            <DataTable
              ariaLabel={`${selectedCompanyHealth.company_name} campaigns`}
              rows={selectedCompanyCampaigns}
              getRowKey={(row) => row.id}
              empty={
                <EmptyState
                  title="No campaigns returned"
                  description="This tenant has no campaign history available from the campaign API yet."
                />
              }
              columns={[
                { key: 'name', header: 'Campaign', render: (row) => row.name },
                { key: 'status', header: 'Status', render: (row) => row.status },
                { key: 'type', header: 'Type', render: (row) => row.message_type },
                { key: 'scheduled', header: 'Scheduled', render: (row) => formatLocalDateTime(row.scheduled_at) },
                { key: 'messages', header: 'Messages', render: (row) => formatNumber(row.message_count) },
                { key: 'credits', header: 'Credits', render: (row) => formatNumber(row.credit_cost) },
              ]}
            />
          </section>
        </section>
      ) : (
        <EmptyState
          title="Select a company to review"
          description="Use Review on a company row to open health, quota, access code, and campaign history."
        />
      )}
      {error ? <p className="error">{error}</p> : null}
    </>
  )
}
