import type { FormEvent } from 'react'

import { DataTable } from '../../components/DataTable'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import type { UsageRow } from '../../types'
import { formatNumber } from '../../utils'

export function UsagePage({
  usageFromDate,
  usageToDate,
  usageRows,
  error,
  onUsageFromDate,
  onUsageToDate,
  onLoadUsage,
}: {
  usageFromDate: string
  usageToDate: string
  usageRows: UsageRow[]
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
      {error ? <p className="error">{error}</p> : null}
    </>
  )
}
