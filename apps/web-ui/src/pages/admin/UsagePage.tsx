import type { FormEvent } from 'react'

import { DataTable } from '../../components/DataTable'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import type { CompanyHealthRow, UsageRow } from '../../types'
import { formatNumber } from '../../utils'

export function UsagePage({
  usageFromDate,
  usageToDate,
  usageRows,
  companyHealthRows,
  error,
  onUsageFromDate,
  onUsageToDate,
  onLoadUsage,
}: {
  usageFromDate: string
  usageToDate: string
  usageRows: UsageRow[]
  companyHealthRows: CompanyHealthRow[]
  error: string | null
  onUsageFromDate: (value: string) => void
  onUsageToDate: (value: string) => void
  onLoadUsage: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <>
      <PageHeader title="Usage" description="Review cross-tenant campaign, message, engagement, and reminder volume." />
      <form className="toolbar-form" onSubmit={onLoadUsage}>
        <label>
          Usage from date
          <input type="date" value={usageFromDate} onChange={(event) => onUsageFromDate(event.target.value)} />
        </label>
        <label>
          Usage to date
          <input type="date" value={usageToDate} onChange={(event) => onUsageToDate(event.target.value)} />
        </label>
        <button>Load usage</button>
      </form>
      <section className="panel table-panel">
        <DataTable
          ariaLabel="Usage rows"
          rows={usageRows}
          getRowKey={(row) => row.company_id}
          empty={<EmptyState title="No usage loaded" description="Choose a date range to load tenant usage." />}
          columns={[
            { key: 'company', header: 'Company', render: (row) => row.company_name },
            { key: 'campaigns', header: 'Campaigns', render: (row) => formatNumber(row.campaign_count) },
            { key: 'messages', header: 'Messages', render: (row) => formatNumber(row.message_count) },
            { key: 'media', header: 'Media', render: (row) => formatNumber(row.media_asset_count) },
            { key: 'links', header: 'Tracked links', render: (row) => formatNumber(row.tracked_link_count) },
            { key: 'clicks', header: 'Clicks', render: (row) => formatNumber(row.click_count) },
            { key: 'reminders', header: 'Reminders', render: (row) => formatNumber(row.reminder_count) },
          ]}
        />
      </section>
      <section className="panel table-panel">
        <div className="section-heading">
          <span>Health</span>
          <strong>Company breakdown</strong>
        </div>
        <DataTable
          ariaLabel="Usage company health"
          rows={companyHealthRows}
          getRowKey={(row) => row.company_id}
          empty={<EmptyState title="No company health loaded" description="Open the admin dashboard to load tenant health." />}
          columns={[
            { key: 'company', header: 'Company', render: (row) => row.company_name },
            { key: 'subscribers', header: 'Subscribers', render: (row) => formatNumber(row.subscriber_count) },
            { key: 'reach', header: 'Scheduled reach', render: (row) => formatNumber(row.scheduled_reach) },
            { key: 'credits', header: 'Credits remaining', render: (row) => formatNumber(row.credits_remaining) },
            { key: 'limit', header: 'Monthly send limit', render: (row) => formatNumber(row.monthly_send_limit) },
            { key: 'access', header: 'Active access code', render: (row) => row.active_access_code ?? 'Not configured' },
          ]}
        />
      </section>
      {error ? <p className="error">{error}</p> : null}
    </>
  )
}
