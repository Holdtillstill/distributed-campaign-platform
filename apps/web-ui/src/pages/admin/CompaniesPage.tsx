import type { FormEvent } from 'react'

import { DataTable } from '../../components/DataTable'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'

import type { CompanyHealthRow, CompanyResult, UsageRow } from '../../types'
import { formatNumber } from '../../utils'

export function CompaniesPage({
  companyName,
  companySlug,
  initialAdminEmail,
  monthlySendLimit,
  creditBalance,
  companyResult,
  companies,
  companyHealthRows,
  error,
  onCompanyName,
  onCompanySlug,
  onInitialAdminEmail,
  onMonthlySendLimit,
  onCreditBalance,
  onCreateCompany,
  onRefreshCompanyHealth,
}: {
  companyName: string
  companySlug: string
  initialAdminEmail: string
  monthlySendLimit: string
  creditBalance: string
  companyResult: CompanyResult | null
  companies: UsageRow[]
  companyHealthRows: CompanyHealthRow[]
  error: string | null
  onCompanyName: (value: string) => void
  onCompanySlug: (value: string) => void
  onInitialAdminEmail: (value: string) => void
  onMonthlySendLimit: (value: string) => void
  onCreditBalance: (value: string) => void
  onCreateCompany: (event: FormEvent<HTMLFormElement>) => void
  onRefreshCompanyHealth: () => void
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
            { key: 'company', header: 'Company', render: (row) => row.company_name },
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
            { key: 'actions', header: 'Actions', render: () => <button className="secondary inline-action">Review</button> },
          ]}
        />
      </section>
      {error ? <p className="error">{error}</p> : null}
    </>
  )
}
