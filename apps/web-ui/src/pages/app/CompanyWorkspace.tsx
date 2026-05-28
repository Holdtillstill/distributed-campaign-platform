import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { API_BASE_URL } from '../../api/client'
import { DataTable } from '../../components/DataTable'
import { EmptyState } from '../../components/EmptyState'
import { MetricCard as Metric } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { QuotaBar } from '../../components/QuotaBar'
import type {
  AccessCodeResult,
  Campaign,
  CampaignLink,
  CampaignListItem,
  CampaignSubpage,
  CompanyPage,
  CompanyUser,
  DashboardSummary,
  MediaAsset,
  OptInResult,
  PerformanceTotals,
  ReminderCampaign,
  Session,
  SubscriberListResult,
  SubscriberResult,
} from '../../types'
import { formatActivity, formatCount, formatLocalDateTime, formatNumber } from '../../utils'

const contentTemplates = [
  {
    title: 'Memorial Day 30% Off Hero',
    tag: 'Holiday sale',
    copy: 'Memorial Day starts now: take 30% off summer favorites. Use code MEMORIAL30 through Monday.',
    preview: '30% OFF',
    messageType: 'smart',
    mediaKeywords: ['memorial', 'coupon', 'offer'],
  },
  {
    title: 'VIP Loyalty Double Points',
    tag: 'Loyalty',
    copy: 'VIP weekend: earn double points on every order through Sunday. Your reward balance updates automatically.',
    preview: '2X POINTS',
    messageType: 'regular',
    mediaKeywords: ['loyalty', 'vip'],
  },
  {
    title: 'Weekend Flash Sale MMS',
    tag: 'Flash sale',
    copy: 'Flash sale: our bestsellers are back in stock for 48 hours. Tap to shop before sizes sell out.',
    preview: '48 HRS',
    messageType: 'smart',
    mediaKeywords: ['flash', 'sale', 'coupon'],
  },
  {
    title: 'Winback Offer',
    tag: 'Retention',
    copy: 'We saved you a private offer: take $15 off your next visit this week. Come back and see what is new.',
    preview: '$15 BACK',
    messageType: 'regular',
    mediaKeywords: ['winback', 'offer'],
  },
] satisfies {
  title: string
  tag: string
  copy: string
  preview: string
  messageType: 'regular' | 'smart'
  mediaKeywords: string[]
}[]

export function CompanyWorkspace({
  page,
  session,
  onNavigate,
}: {
  page: CompanyPage
  session: Extract<Session, { role: 'company_user' }>
  onNavigate: (page: CompanyPage) => void
}) {
  const companyId = session.companyId
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
  const [campaignName, setCampaignName] = useState('Memorial Day VIP Weekend')
  const [messageBody, setMessageBody] = useState('Memorial Day starts now: take 30% off summer favorites through Monday. Use code MEMORIAL30 in-store or online.')
  const [messageType, setMessageType] = useState<'regular' | 'smart'>('regular')
  const [campaignSubpage, setCampaignSubpage] = useState<CampaignSubpage>('overview')
  const [scheduledAt, setScheduledAt] = useState('2026-05-25T16:00')
  const [smartMediaAssetId, setSmartMediaAssetId] = useState('')
  const [subscriberLists, setSubscriberLists] = useState<SubscriberListResult[]>([])
  const [subscribers, setSubscribers] = useState<SubscriberResult[]>([])
  const [selectedListIds, setSelectedListIds] = useState<string[]>([])
  const [selectedSubscriberIds, setSelectedSubscriberIds] = useState<string[]>([])
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [campaignSearch, setCampaignSearch] = useState('')
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('all')
  const [campaignDateFrom, setCampaignDateFrom] = useState('')
  const [campaignDateTo, setCampaignDateTo] = useState('')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [listName, setListName] = useState('VIP List')
  const [subscriberList, setSubscriberList] = useState<SubscriberListResult | null>(null)
  const [subscriberPhone, setSubscriberPhone] = useState('+15550001010')
  const [subscriberSource, setSubscriberSource] = useState('import')
  const [subscriber, setSubscriber] = useState<SubscriberResult | null>(null)
  const [selectedSubscriberListId, setSelectedSubscriberListId] = useState('all')
  const [csvImportText, setCsvImportText] = useState('phone_number,list_name,region,source\n+15550001012,VIP Customers,Phoenix,loyalty_export')
  const [csvImportResult, setCsvImportResult] = useState<string | null>(null)
  const [optInPhone, setOptInPhone] = useState('+15550001011')
  const [optInSource, setOptInSource] = useState('landing-page')
  const [optIn, setOptIn] = useState<OptInResult | null>(null)
  const [confirmToken, setConfirmToken] = useState('')
  const [confirmResult, setConfirmResult] = useState<OptInResult | null>(null)
  const [mediaFilename, setMediaFilename] = useState('memorial-day-hero.png')
  const [mediaContentType, setMediaContentType] = useState('image/png')
  const [mediaUrl, setMediaUrl] = useState('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80')
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [trackedCampaignId, setTrackedCampaignId] = useState('')
  const [trackedSubscriberId, setTrackedSubscriberId] = useState('')
  const [trackedMediaAssetId, setTrackedMediaAssetId] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('https://example.com/offers/memorial-day')
  const [campaignLinks, setCampaignLinks] = useState<CampaignLink[]>([])
  const [campaignLink, setCampaignLink] = useState<CampaignLink | null>(null)
  const [contentFeedback, setContentFeedback] = useState<string | null>(null)
  const [performance, setPerformance] = useState<PerformanceTotals | null>(null)
  const [reminderSourceCampaignId, setReminderSourceCampaignId] = useState('')
  const [reminderAudienceRule, setReminderAudienceRule] = useState('not_clicked')
  const [reminderMessageBody, setReminderMessageBody] = useState('Still thinking it over? Your VIP offer ends tonight. Tap to finish checkout before it expires.')
  const [reminderCampaign, setReminderCampaign] = useState<ReminderCampaign | null>(null)
  const [reminderCampaigns, setReminderCampaigns] = useState<ReminderCampaign[]>([])
  const [teamUsers, setTeamUsers] = useState<CompanyUser[]>([])
  const [inviteRole, setInviteRole] = useState('campaign_manager')
  const [inviteCreditLimit, setInviteCreditLimit] = useState('2000')
  const [accessCodeResult, setAccessCodeResult] = useState<AccessCodeResult | null>(null)
  const [editUserEmail, setEditUserEmail] = useState('')
  const [editUserRole, setEditUserRole] = useState('campaign_manager')
  const [editCreditLimit, setEditCreditLimit] = useState('2000')
  const [error, setError] = useState<string | null>(null)

  const selectedAudienceCount = useMemo(() => {
    const listSubscriberCount = subscriberLists
      .filter((list) => selectedListIds.includes(list.id))
      .reduce((total, list) => total + (list.subscriber_count ?? 0), 0)
    return listSubscriberCount + selectedSubscriberIds.length
  }, [selectedListIds, selectedSubscriberIds.length, subscriberLists])

  const campaignStatusOptions = useMemo(
    () => Array.from(new Set(campaigns.map((item) => item.status).filter(Boolean))).sort(),
    [campaigns],
  )
  const filteredCampaigns = useMemo(
    () => filterCampaigns(campaigns, {
      search: campaignSearch,
      status: campaignStatusFilter,
      from: campaignDateFrom,
      to: campaignDateTo,
    }),
    [campaignDateFrom, campaignDateTo, campaignSearch, campaignStatusFilter, campaigns],
  )
  const hasCampaignFilters =
    campaignSearch.trim() !== '' || campaignStatusFilter !== 'all' || campaignDateFrom !== '' || campaignDateTo !== ''
  const upcomingCampaigns = filteredCampaigns.filter((item) => item.status === 'scheduled')
  const pastCampaigns = filteredCampaigns.filter((item) => item.status !== 'scheduled')
  const directSubscriberPicklist = subscribers.slice(0, 50)
  const selectedSubscriberList = subscriberLists.find((list) => list.id === selectedSubscriberListId)
  const visibleSubscribers =
    selectedSubscriberListId === 'all'
      ? subscribers
      : subscribers.filter((subscriberItem) => subscriberItem.list_id === selectedSubscriberListId)
  const subscriberListNameById = useMemo(
    () => new Map(subscriberLists.map((list) => [list.id, list.name])),
    [subscriberLists],
  )

  useEffect(() => {
    async function loadDashboardSummary() {
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/dashboard-summary`)
      if (response.ok) setDashboardSummary(await response.json())
    }
    void loadDashboardSummary()
  }, [companyId])

  useEffect(() => {
    async function loadCampaignPlanningData() {
      const [listsResponse, subscribersResponse, campaignsResponse, mediaResponse, remindersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/companies/${companyId}/subscriber-lists`),
        fetch(`${API_BASE_URL}/companies/${companyId}/subscribers`),
        fetch(`${API_BASE_URL}/companies/${companyId}/campaigns`),
        fetch(`${API_BASE_URL}/companies/${companyId}/media-assets`),
        fetch(`${API_BASE_URL}/companies/${companyId}/reminder-campaigns`),
      ])
      if (listsResponse.ok) setSubscriberLists(await listsResponse.json())
      if (subscribersResponse.ok) setSubscribers(await subscribersResponse.json())
      if (campaignsResponse.ok) setCampaigns(await campaignsResponse.json())
      if (mediaResponse.ok) setMediaAssets(await mediaResponse.json())
      if (remindersResponse.ok) setReminderCampaigns(await remindersResponse.json())
    }
    void loadCampaignPlanningData()
  }, [companyId])

  function toggleValue(current: string[], value: string): string[] {
    return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
  }

  function findTemplateMediaAsset(template: (typeof contentTemplates)[number]) {
    const matchingAsset = mediaAssets.find((asset) => {
      const searchable = `${asset.filename ?? ''} ${asset.url ?? ''}`.toLowerCase()
      return template.mediaKeywords.some((keyword) => searchable.includes(keyword))
    })
    return matchingAsset ?? mediaAssets.find((asset) => asset.content_type?.startsWith('image/')) ?? null
  }

  function applyTemplate(template: (typeof contentTemplates)[number]) {
    const mediaAsset = findTemplateMediaAsset(template)
    setCampaignName(template.title)
    setMessageBody(template.copy)
    setMessageType(template.messageType)
    setSmartMediaAssetId(template.messageType === 'smart' ? mediaAsset?.id ?? '' : '')
    setCampaignSubpage('create')
    setContentFeedback(`${template.title} loaded into Campaign Builder`)
    onNavigate('campaigns')
  }

  function copyTemplateCopy(template: (typeof contentTemplates)[number]) {
    void navigator.clipboard?.writeText(template.copy)
    setContentFeedback(`Copied copy for ${template.title}`)
  }

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Company-Id': companyId, 'X-User-Email': session.email },
      body: JSON.stringify({
        name: campaignName,
        body: messageBody,
        message_type: messageType,
        media_asset_id: messageType === 'smart' && smartMediaAssetId ? smartMediaAssetId : null,
        subscriber_list_ids: selectedListIds,
        subscriber_ids: selectedSubscriberIds,
        scheduled_at: scheduledAt,
      }),
    })
    if (!response.ok) {
      setError(`Create campaign failed: ${response.status}`)
      return
    }
    const result = (await response.json()) as Campaign
    setCampaign(result)
    setCampaigns((current) => [
      {
        id: result.id,
        company_id: result.company_id,
        name: result.name,
        body: messageBody,
        message_type: result.message_type,
        status: result.status,
        scheduled_at: result.scheduled_at,
        created_at: new Date().toISOString(),
        message_count: result.message_count,
        credit_cost: result.credit_cost,
        reminder_count: 0,
      },
      ...current.filter((item) => item.id !== result.id),
    ])
    setDashboardSummary((current) =>
      current
        ? {
            ...current,
            credit_balance: result.remaining_credits,
            credits_used: current.credits_used + result.credit_cost,
            campaign_count: current.campaign_count + 1,
            message_count: current.message_count + result.message_count,
          }
        : current,
    )
    setTrackedCampaignId(result.id ?? '')
    setReminderSourceCampaignId(result.id ?? '')
  }

  async function createSubscriberList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/subscriber-lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: listName }),
    })
    if (response.ok) setSubscriberList(await response.json())
  }

  async function importSubscriber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/subscribers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: subscriberPhone, source: subscriberSource, list_id: subscriberList?.id ?? '' }),
    })
    if (response.ok) {
      const result = (await response.json()) as SubscriberResult
      setSubscriber(result)
      if (result.id) setTrackedSubscriberId(result.id)
    }
  }

  function parseCsvRows(csvText: string) {
    const [headerLine, ...lines] = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (!headerLine) return []
    const headers = headerLine.split(',').map((header) => header.trim().toLowerCase())
    return lines
      .map((line) => {
        const values = line.split(',').map((value) => value.trim())
        return headers.reduce<Record<string, string>>((row, header, index) => {
          row[header] = values[index] ?? ''
          return row
        }, {})
      })
      .filter((row) => row.phone_number)
  }

  async function importCsvSubscribers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const rows = parseCsvRows(csvImportText)
    const importedSubscribers: SubscriberResult[] = []
    const createdLists = new Map(subscriberLists.map((list) => [list.name.toLowerCase(), list]))

    for (const row of rows) {
      const listName = row.list_name || row.region || ''
      let listId = ''
      if (listName) {
        const key = listName.toLowerCase()
        let list = createdLists.get(key)
        if (!list) {
          const listResponse = await fetch(`${API_BASE_URL}/companies/${companyId}/subscriber-lists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: listName }),
          })
          if (listResponse.ok) {
            list = (await listResponse.json()) as SubscriberListResult
            createdLists.set(key, list)
            setSubscriberLists((current) => [list as SubscriberListResult, ...current.filter((item) => item.id !== list?.id)])
          }
        }
        listId = list?.id ?? ''
      }

      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: row.phone_number,
          source: row.source || 'csv_import',
          list_id: listId,
        }),
      })
      if (response.ok) {
        const result = (await response.json()) as SubscriberResult
        importedSubscribers.push({ ...result, region: row.region, source: row.source || result.source })
      }
    }

    if (importedSubscribers.length) {
      setSubscribers((current) => [
        ...importedSubscribers,
        ...current.filter((item) => !importedSubscribers.some((imported) => imported.id === item.id)),
      ])
      setCsvImportResult(`Imported ${importedSubscribers.length} subscribers`)
    } else {
      setCsvImportResult('No subscribers imported')
    }
  }

  function stageSubscriberCsv(file: File | undefined) {
    if (!file) return
    void file.text().then(setCsvImportText)
  }

  async function startOptIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/public/opt-ins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, phone_number: optInPhone, source: optInSource }),
    })
    if (response.ok) {
      const result = (await response.json()) as OptInResult
      setOptIn(result)
      if (result.confirmation_token) setConfirmToken(result.confirmation_token)
    }
  }

  async function confirmOptIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/public/opt-ins/${confirmToken}/confirm`, { method: 'POST' })
    if (response.ok) setConfirmResult(await response.json())
  }

  async function addMediaAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/media-assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: mediaFilename, content_type: mediaContentType, url: mediaUrl }),
    })
    if (response.ok) {
      const result = (await response.json()) as MediaAsset
      setMediaAssets((current) => [result, ...current.filter((asset) => asset.id !== result.id)])
      if (result.id) setTrackedMediaAssetId(result.id)
      setContentFeedback(`${result.filename ?? 'Media asset'} added to the library`)
    } else {
      setContentFeedback(`Add media failed: ${response.status}`)
    }
  }

  async function refreshMediaAssets() {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/media-assets`)
    if (response.ok) setMediaAssets(await response.json())
  }

  function stageUploadedMedia(file: File | undefined) {
    if (!file) return
    setMediaFilename(file.name)
    setMediaContentType(file.type || 'application/octet-stream')
    setMediaUrl(`local-upload://${file.name}`)
  }

  async function createTrackedLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/campaign-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: trackedCampaignId,
        subscriber_id: trackedSubscriberId,
        media_asset_id: trackedMediaAssetId,
        destination_url: destinationUrl,
      }),
    })
    if (response.ok) {
      const result = (await response.json()) as CampaignLink
      setCampaignLink(result)
      setCampaignLinks((current) => [result, ...current.filter((link) => link.id !== result.id)])
      setContentFeedback(`Tracking link created: ${result.public_url}`)
    } else {
      setContentFeedback(`Create tracked link failed: ${response.status}`)
    }
  }

  async function refreshCampaignLinks() {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/campaign-links`)
    if (response.ok) setCampaignLinks(await response.json())
  }

  async function refreshPerformance() {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/campaign-performance`)
    if (response.ok) setPerformance(await response.json())
  }

  async function createReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/reminder-campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_campaign_id: reminderSourceCampaignId,
        audience_rule: reminderAudienceRule,
        message_body: reminderMessageBody,
      }),
    })
    if (response.ok) {
      const result = (await response.json()) as ReminderCampaign
      setReminderCampaign(result)
      setReminderCampaigns((current) => [result, ...current.filter((item) => item.id !== result.id)])
    }
  }

  async function createTeamAccessCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/access-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: inviteRole,
        credit_limit: inviteCreditLimit.trim() ? Number(inviteCreditLimit) : null,
      }),
    })
    if (response.ok) setAccessCodeResult(await response.json())
  }

  async function refreshTeamUsers() {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/users`)
    if (response.ok) setTeamUsers(await response.json())
  }

  async function updateTeamUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/users/${encodeURIComponent(editUserEmail)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: editUserRole,
        credit_limit: editCreditLimit.trim() ? Number(editCreditLimit) : null,
      }),
    })
    if (response.ok) {
      const updatedUser = (await response.json()) as CompanyUser
      setTeamUsers((current) => [
        updatedUser,
        ...current.filter((user) => user.email.toLowerCase() !== updatedUser.email.toLowerCase()),
      ])
    }
  }

  if (page === 'dashboard') {
    return (
      <>
        <PageHeader
          eyebrow="Company workspace"
          title="Company dashboard"
          description={`Active company: ${session.companyName} (${companyId})`}
        />
        <div className="metric-grid">
          <Metric label="Subscribers" value={formatCount(dashboardSummary?.subscriber_count)} trend="Confirmed and imported audience" />
          <Metric label="Campaigns" value={formatCount(dashboardSummary?.campaign_count)} trend="Scheduled or sent" />
          <Metric label="Messages" value={formatActivity(dashboardSummary?.message_count)} trend="No data yet until first send" />
          <Metric label="Credits remaining" value={formatCount(dashboardSummary?.credit_balance)} trend="Contract balance" />
          <Metric label="Clicks" value={formatActivity(dashboardSummary?.click_count)} trend="Smart SMS engagement" />
          <Metric label="Redemptions" value={formatActivity(dashboardSummary?.redemption_count)} trend="Tracked offer outcomes" />
        </div>
        <div className="dashboard-grid">
          <QuotaBar
            label="Monthly send quota"
            used={dashboardSummary?.credits_used}
            limit={dashboardSummary?.monthly_send_limit}
            helper={
              dashboardSummary?.monthly_send_limit
                ? `${formatCount(dashboardSummary?.credits_used)} credits used against a ${formatNumber(
                    dashboardSummary.monthly_send_limit,
                  )} monthly send limit.`
                : 'Monthly send limit is not configured for this tenant.'
            }
          />
          <section className="panel quick-actions" aria-label="Quick actions">
            <div className="section-heading">
              <span>Next steps</span>
              <strong>Quick actions</strong>
            </div>
            <button
              onClick={() => {
                setCampaignSubpage('create')
                onNavigate('campaigns')
              }}
            >
              Create campaign
            </button>
            <button className="secondary" onClick={() => onNavigate('subscribers')}>
              Import subscribers
            </button>
            <button className="secondary" onClick={() => onNavigate('content')}>
              Upload media
            </button>
            <button className="secondary" onClick={() => onNavigate('analytics')}>
              View analytics
            </button>
          </section>
        </div>
        <div className="dashboard-grid">
          <section className="panel chart-card" aria-label="Recent performance">
            <div className="section-heading">
              <span>Performance</span>
              <strong>Recent activity</strong>
            </div>
            <div className="mini-chart" aria-hidden="true">
              <span style={{ height: '22%' }} />
              <span style={{ height: '36%' }} />
              <span style={{ height: '28%' }} />
              <span style={{ height: '54%' }} />
              <span style={{ height: '46%' }} />
              <span style={{ height: '72%' }} />
            </div>
            <p className="muted">Campaign activity will populate as sends, clicks, and redemptions arrive.</p>
          </section>
          <EmptyState
            title="No recent operational alerts"
            description="Quota risk, failed sends, and reminder opportunities will appear here once activity is available."
          />
        </div>
      </>
    )
  }

  if (page === 'campaigns') {
    const campaignTabs: { id: CampaignSubpage; label: string }[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'scheduled', label: 'Scheduled' },
      { id: 'past', label: 'Sent/Past' },
      { id: 'create', label: 'Builder' },
      { id: 'followups', label: 'Follow-ups' },
    ]

    return (
      <>
        <PageHeader
          title="Campaigns"
          description="Plan broadcasts, review scheduled and sent campaigns, and build follow-up automations in their own workspace."
          action={<button onClick={() => setCampaignSubpage('create')}>Create campaign</button>}
        />
        <div className="segmented-control" aria-label="Campaign sections">
          {campaignTabs.map((tab) => (
            <button
              className={campaignSubpage === tab.id ? 'active' : ''}
              key={tab.id}
              onClick={() => setCampaignSubpage(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {campaignSubpage === 'overview' || campaignSubpage === 'scheduled' || campaignSubpage === 'past' ? (
          <section className="panel campaign-filters" aria-label="Campaign filters">
            <div className="section-heading">
              <span>Filters</span>
              <strong>
                Showing {formatNumber(filteredCampaigns.length)} of {formatNumber(campaigns.length)} campaigns
              </strong>
            </div>
            <div className="form-grid">
              <label>
                Search campaigns
                <input
                  value={campaignSearch}
                  onChange={(event) => setCampaignSearch(event.target.value)}
                  placeholder="Name or message body"
                />
              </label>
              <label>
                Campaign status
                <select value={campaignStatusFilter} onChange={(event) => setCampaignStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  {campaignStatusOptions.map((status) => (
                    <option value={status} key={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Scheduled/created from
                <input
                  type="datetime-local"
                  value={campaignDateFrom}
                  onChange={(event) => setCampaignDateFrom(event.target.value)}
                />
              </label>
              <label>
                Scheduled/created to
                <input
                  type="datetime-local"
                  value={campaignDateTo}
                  onChange={(event) => setCampaignDateTo(event.target.value)}
                />
              </label>
            </div>
            <div className="filter-actions">
              <span>Scheduled/created date window</span>
              <button
                className="secondary"
                disabled={!hasCampaignFilters}
                type="button"
                onClick={() => {
                  setCampaignSearch('')
                  setCampaignStatusFilter('all')
                  setCampaignDateFrom('')
                  setCampaignDateTo('')
                }}
              >
                Clear filters
              </button>
            </div>
          </section>
        ) : null}

        {campaignSubpage === 'overview' ? (
          <>
            <div className="metric-grid spaced">
              <Metric label="Scheduled" value={formatNumber(upcomingCampaigns.length)} trend="Broadcasts waiting to send" />
              <Metric label="Sent/Past" value={formatNumber(pastCampaigns.length)} trend="Completed or cancelled campaigns" />
              <Metric
                label="Scheduled reach"
                value={formatNumber(upcomingCampaigns.reduce((total, item) => total + item.message_count, 0))}
                trend="Recipients in upcoming campaigns"
              />
              <Metric
                label="Reminder opportunities"
                value={formatNumber(campaigns.reduce((total, item) => total + item.reminder_count, 0))}
                trend="Managed under Follow-ups"
              />
            </div>
            <div className="campaign-board">
              <CampaignColumn
                title="Upcoming"
                campaigns={upcomingCampaigns.slice(0, 5)}
                emptyText={hasCampaignFilters ? 'No upcoming campaigns match the current filters.' : undefined}
                onEdit={() => setCampaignSubpage('create')}
              />
              <CampaignColumn
                title="Past"
                campaigns={pastCampaigns.slice(0, 5)}
                emptyText={hasCampaignFilters ? 'No past campaigns match the current filters.' : undefined}
                onEdit={() => setCampaignSubpage('create')}
              />
            </div>
          </>
        ) : null}

        {campaignSubpage === 'scheduled' ? (
          <div className="campaign-board single">
            <CampaignColumn
              title="Upcoming"
              campaigns={upcomingCampaigns}
              emptyText={hasCampaignFilters ? 'No scheduled campaigns match the current filters.' : undefined}
              onEdit={() => setCampaignSubpage('create')}
            />
          </div>
        ) : null}

        {campaignSubpage === 'past' ? (
          <div className="campaign-board single">
            <CampaignColumn
              title="Past"
              campaigns={pastCampaigns}
              emptyText={hasCampaignFilters ? 'No sent, queued, or cancelled campaigns match the current filters.' : undefined}
              onEdit={() => setCampaignSubpage('create')}
            />
          </div>
        ) : null}

        {campaignSubpage === 'create' ? (
          <>
            <form className="campaign-builder" onSubmit={createCampaign}>
              <section className="builder-step" aria-label="Audience step">
                <div className="section-heading">
                  <span>Step 1</span>
                  <strong>Audience</strong>
                </div>
                <div>
                  <h2>Segments</h2>
                  {subscriberLists.length ? (
                    subscriberLists.map((list) => (
                      <label className="check-row" key={list.id}>
                        <input
                          type="checkbox"
                          checked={selectedListIds.includes(list.id)}
                          onChange={() => setSelectedListIds((current) => toggleValue(current, list.id))}
                        />
                        {list.name} ({formatNumber(list.subscriber_count)})
                      </label>
                    ))
                  ) : (
                    <p className="muted">Create subscriber lists before scheduling broad campaigns.</p>
                  )}
                </div>
                <div>
                  <h2>Audience members</h2>
                  {subscribers.length ? (
                    <>
                      {directSubscriberPicklist.map((subscriber) => (
                        <label className="check-row" key={subscriber.id}>
                          <input
                            type="checkbox"
                            checked={selectedSubscriberIds.includes(subscriber.id)}
                            onChange={() => setSelectedSubscriberIds((current) => toggleValue(current, subscriber.id))}
                          />
                          {subscriber.phone_number} ({subscriber.consent_status})
                        </label>
                      ))}
                      {subscribers.length > directSubscriberPicklist.length ? (
                        <p className="muted">
                          Showing {formatNumber(directSubscriberPicklist.length)} of {formatNumber(subscribers.length)} direct
                          subscribers. Use segments for broad sends.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="muted">Import or confirm subscribers first.</p>
                  )}
                </div>
              </section>
              <section className="builder-step" aria-label="Message and media step">
                <div className="section-heading">
                  <span>Step 2</span>
                  <strong>Message & media</strong>
                </div>
                <div className="form-grid">
                  <label>
                    Campaign name
                    <input value={campaignName ?? ''} onChange={(event) => setCampaignName(event.target.value)} />
                  </label>
                  <label>
                    Message type
                    <select
                      value={messageType ?? ''}
                      onChange={(event) => setMessageType(event.target.value as 'regular' | 'smart')}
                    >
                      <option value="regular">Regular SMS - 1 credit</option>
                      <option value="smart">Smart SMS - 2 credits</option>
                    </select>
                  </label>
                  <label className="wide">
                    Message body
                    <textarea value={messageBody ?? ''} onChange={(event) => setMessageBody(event.target.value)} />
                  </label>
                  {messageType === 'smart' ? (
                    <label>
                      Smart SMS media
                      <select
                        value={smartMediaAssetId ?? ''}
                        onChange={(event) => setSmartMediaAssetId(event.target.value)}
                        required
                      >
                        <option value="">Choose media</option>
                        {mediaAssets.map((asset) => (
                          <option value={asset.id ?? ''} key={asset.id ?? asset.url ?? asset.filename}>
                            {asset.filename}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              </section>
              <section className="builder-step" aria-label="Schedule step">
                <div className="section-heading">
                  <span>Step 3</span>
                  <strong>Schedule</strong>
                </div>
                <label>
                  Schedule date and time
                  <input
                    type="datetime-local"
                    value={scheduledAt ?? ''}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                </label>
              </section>
              <section className="builder-step review-step" aria-label="Review and estimate step">
                <div className="section-heading">
                  <span>Step 4</span>
                  <strong>Review/estimate</strong>
                </div>
                <p className="estimate">
                  Estimated cost: {formatNumber(selectedAudienceCount * (messageType === 'smart' ? 2 : 1))} credits
                </p>
                <p className="muted">
                  {formatNumber(selectedAudienceCount)} recipients selected for {messageType === 'smart' ? 'Smart SMS' : 'Regular SMS'}.
                </p>
                {selectedAudienceCount === 0 ? (
                  <p className="helper-text">Select at least one segment or subscriber before scheduling.</p>
                ) : null}
                <button disabled={selectedAudienceCount === 0}>Schedule campaign</button>
              </section>
            </form>
            {campaign ? (
              <div className="result-strip">
                <strong>Campaign status</strong>
                <small>Campaign ID: {campaign.id}</small>
                <span>{campaign.message_type}</span>
                <span>{campaign.status}</span>
                <span>Scheduled: {formatLocalDateTime(campaign.scheduled_at)}</span>
                <span>Messages: {campaign.message_count}</span>
                <span>Credits spent: {campaign.credit_cost}</span>
                <span>Remaining: {formatNumber(campaign.remaining_credits)}</span>
                <span>Tracked links: {formatNumber(campaign.tracked_links?.length ?? 0)}</span>
                <span>Queued: {campaign.status_counts.queued}</span>
                <span>Sent: {campaign.status_counts.sent}</span>
                <span>Retried: {campaign.status_counts.retried}</span>
                <span>Dead-lettered: {campaign.status_counts.dead_lettered}</span>
              </div>
            ) : null}
            {error ? <p className="error">{error}</p> : null}
          </>
        ) : null}

        {campaignSubpage === 'followups' ? (
          <>
            <form className="form-grid follow-up-panel" onSubmit={createReminder}>
              <div className="section-heading wide">
                <span>Follow-up</span>
                <strong>Reminder automation</strong>
              </div>
              <label>
                Follow-up source campaign
                <select
                  value={reminderSourceCampaignId ?? ''}
                  onChange={(event) => setReminderSourceCampaignId(event.target.value)}
                >
                  <option value="">Choose a campaign</option>
                  {pastCampaigns.concat(upcomingCampaigns).map((item) => (
                    <option value={item.id ?? ''} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Follow-up audience rule
                <select value={reminderAudienceRule ?? ''} onChange={(event) => setReminderAudienceRule(event.target.value)}>
                  <option value="not_clicked">Not clicked</option>
                  <option value="clicked_not_redeemed">Clicked not redeemed</option>
                </select>
              </label>
              <label className="wide">
                Follow-up copy
                <textarea value={reminderMessageBody ?? ''} onChange={(event) => setReminderMessageBody(event.target.value)} />
              </label>
              <button disabled={!reminderSourceCampaignId}>Create follow-up reminder</button>
              {!reminderSourceCampaignId ? <p className="helper-text wide">Choose a source campaign before creating a follow-up.</p> : null}
            </form>
            {reminderCampaign ? (
              <div className="result-strip">
                <strong>{reminderCampaign.id}</strong>
                <span>{reminderCampaign.audience_rule}</span>
                <span>Estimated recipients: {reminderCampaign.estimated_recipient_count}</span>
              </div>
            ) : null}
            <section className="panel table-panel">
              <div className="section-heading">
                <span>Automations</span>
                <strong>Existing follow-ups</strong>
              </div>
              <DataTable
                ariaLabel="Follow-up reminders"
                rows={reminderCampaigns}
                getRowKey={(row) => row.id ?? `${row.source_campaign_id}-${row.audience_rule}`}
                empty={
                  <EmptyState
                    title="No follow-ups yet"
                    description="Create a reminder automation from a recent campaign engagement rule."
                  />
                }
                columns={[
                  { key: 'source', header: 'Source campaign', render: (row) => row.source_campaign_id ?? 'Unknown' },
                  { key: 'rule', header: 'Audience rule', render: (row) => row.audience_rule ?? 'Unknown' },
                  { key: 'copy', header: 'Copy', render: (row) => row.message_body ?? 'No copy' },
                  { key: 'status', header: 'Status', render: (row) => row.status ?? 'draft' },
                  {
                    key: 'estimate',
                    header: 'Estimated recipients',
                    render: (row) => formatNumber(row.estimated_recipient_count),
                  },
                ]}
              />
            </section>
          </>
        ) : null}
      </>
    )
  }

  if (page === 'subscribers') {
    return (
      <>
        <PageHeader
          title="Subscribers"
          description="Manage audience lists, regional segments, consent status, and CSV imports."
        />
        <div className="metric-grid spaced">
          <button
            className={`segment-card ${selectedSubscriberListId === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedSubscriberListId('all')}
          >
            <span>All subscribers</span>
            <strong>{formatNumber(subscribers.length)}</strong>
            <small>Across all visible lists</small>
          </button>
          {subscriberLists.map((list) => (
            <button
              className={`segment-card ${selectedSubscriberListId === list.id ? 'active' : ''}`}
              key={list.id}
              onClick={() => setSelectedSubscriberListId(list.id)}
            >
              <span>{list.name}</span>
              <strong>{formatNumber(list.subscriber_count)}</strong>
              <small>List segment</small>
            </button>
          ))}
        </div>

        <section className="panel table-panel">
          <div className="section-heading">
            <span>Directory</span>
            <strong>{selectedSubscriberList?.name ?? 'All subscribers'}</strong>
          </div>
          <DataTable
            ariaLabel="Subscriber directory"
            rows={visibleSubscribers}
            getRowKey={(row) => row.id}
            empty={
              <EmptyState
                title="No subscribers in this segment"
                description="Import a CSV or choose another list to review subscriber consent."
              />
            }
            columns={[
              { key: 'phone', header: 'Phone number', render: (row) => row.phone_number },
              {
                key: 'source',
                header: 'Source / region / list',
                render: (row) =>
                  [row.source, row.region, row.list_id ? subscriberListNameById.get(row.list_id) : null]
                    .filter(Boolean)
                    .join(' / ') || 'Unknown',
              },
              { key: 'status', header: 'Consent / status', render: (row) => `${row.consent_status ?? 'unknown'} / ${row.marketing_status ?? 'unknown'}` },
              { key: 'created', header: 'Created/imported', render: (row) => formatLocalDateTime(row.created_at) },
            ]}
          />
        </section>

        <div className="split-layout two-column">
          <form className="panel" onSubmit={createSubscriberList}>
            <div className="section-heading">
              <span>Lists</span>
              <strong>Create</strong>
            </div>
            <label>
              Subscriber list name
              <input value={listName ?? ''} onChange={(event) => setListName(event.target.value)} />
            </label>
            <button>Create list</button>
            {subscriberList ? <p className="muted">List id: {subscriberList.id}</p> : null}
          </form>
          <form className="panel" onSubmit={importCsvSubscribers}>
            <div className="section-heading">
              <span>Import</span>
              <strong>CSV subscribers</strong>
            </div>
            <p className="helper-text">Required: phone_number. Optional: list_name, region, source.</p>
            <label>
              Upload CSV file
              <input type="file" accept=".csv,text/csv" onChange={(event) => stageSubscriberCsv(event.target.files?.[0])} />
            </label>
            <label className="wide">
              Paste CSV subscribers
              <textarea value={csvImportText ?? ''} onChange={(event) => setCsvImportText(event.target.value)} />
            </label>
            <button>Import CSV</button>
            {csvImportResult ? <p className="muted">{csvImportResult}</p> : null}
          </form>
        </div>

        <div className="split-layout two-column">
          <form className="panel" onSubmit={importSubscriber}>
            <div className="section-heading">
              <span>Single add</span>
              <strong>Company provided</strong>
            </div>
            <label>
              Subscriber phone number
              <input value={subscriberPhone ?? ''} onChange={(event) => setSubscriberPhone(event.target.value)} />
            </label>
            <label>
              Subscriber source
              <input value={subscriberSource ?? ''} onChange={(event) => setSubscriberSource(event.target.value)} />
            </label>
            <button>Import subscriber</button>
            {subscriber ? <p className="muted">{subscriber.consent_status}</p> : null}
          </form>
          <div className="panel">
            <form onSubmit={startOptIn}>
              <div className="section-heading">
                <span>Opt-in</span>
                <strong>Public flow</strong>
              </div>
              <label>
                Opt-in phone number
                <input value={optInPhone ?? ''} onChange={(event) => setOptInPhone(event.target.value)} />
              </label>
              <label>
                Opt-in source
                <input value={optInSource ?? ''} onChange={(event) => setOptInSource(event.target.value)} />
              </label>
              <button>Start opt-in</button>
            </form>
            {optIn ? <p className="muted">Token: {optIn.confirmation_token}</p> : null}
            <form className="stacked-form" onSubmit={confirmOptIn}>
              <label>
                Confirmation token
                <input value={confirmToken ?? ''} onChange={(event) => setConfirmToken(event.target.value)} />
              </label>
              <button>Confirm opt-in</button>
            </form>
            {confirmResult ? <p className="muted">{confirmResult.status}</p> : null}
          </div>
        </div>
      </>
    )
  }

  if (page === 'content') {
    return (
      <>
        <PageHeader
          title="Content Library"
          description="Store media, offer destinations, and tracked assets for Smart SMS campaigns."
        />
        <section className="panel">
          <div className="section-heading">
            <span>Templates</span>
            <strong>Marketing content starters</strong>
          </div>
          <div className="template-grid">
            {contentTemplates.map((template) => (
              <article aria-label={template.title} className="template-card" key={template.title}>
                <div className="template-preview">
                  <span>{template.tag}</span>
                  <strong>{template.preview}</strong>
                </div>
                <div>
                  <strong>{template.title}</strong>
                  <p>{template.copy}</p>
                </div>
                <div className="template-actions">
                  <button type="button" onClick={() => applyTemplate(template)}>
                    Use template
                  </button>
                  <button className="secondary" type="button" onClick={() => copyTemplateCopy(template)}>
                    Copy copy
                  </button>
                  <button className="secondary" type="button" onClick={() => applyTemplate(template)}>
                    Create campaign
                  </button>
                </div>
              </article>
            ))}
          </div>
          {contentFeedback ? <p className="notice">{contentFeedback}</p> : null}
        </section>
        <div className="split-layout two-column">
          <form className="panel" onSubmit={addMediaAsset}>
            <div className="section-heading">
              <span>Media</span>
              <strong>Add content</strong>
            </div>
            <label>
              Upload media file
              <input
                type="file"
                accept="image/*,video/*,application/pdf"
                onChange={(event) => stageUploadedMedia(event.target.files?.[0])}
              />
            </label>
            <label>
              Media filename
              <input value={mediaFilename ?? ''} onChange={(event) => setMediaFilename(event.target.value)} />
            </label>
            <label>
              Media content type
              <input value={mediaContentType ?? ''} onChange={(event) => setMediaContentType(event.target.value)} />
            </label>
            <label>
              Media url
              <input value={mediaUrl ?? ''} onChange={(event) => setMediaUrl(event.target.value)} />
            </label>
            <button>Add URL media</button>
            <button className="secondary inline-action" type="button" onClick={() => void refreshMediaAssets()}>
              Refresh media assets
            </button>
            {contentFeedback ? <p className="muted">{contentFeedback}</p> : null}
          </form>
          <section className="panel">
            <div className="section-heading">
              <span>Library</span>
              <strong>Existing media</strong>
            </div>
            {mediaAssets.length ? (
              <ul className="asset-grid embedded-list">
                {mediaAssets.map((asset) => (
                  <li key={asset.id}>
                    <div className="asset-thumb">
                      {asset.content_type?.startsWith('image/') && asset.url ? (
                        <img src={asset.url} alt={`${asset.filename} preview`} loading="lazy" />
                      ) : (
                        <span>FILE</span>
                      )}
                    </div>
                    <strong>{asset.filename}</strong>
                    <span>{asset.content_type}</span>
                    <span>{asset.url}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No media has been added yet"
                description="Upload or register a hosted image, video, or PDF before building Smart SMS campaigns."
              />
            )}
          </section>
        </div>
        <details className="advanced-tools">
          <summary>Advanced / Developer tools</summary>
          <form className="form-grid follow-up-panel" onSubmit={createTrackedLink}>
            <div className="section-heading wide">
              <span>Links</span>
              <strong>Manual tracking link</strong>
            </div>
              <label>
                Tracked campaign id
                <input value={trackedCampaignId ?? ''} onChange={(event) => setTrackedCampaignId(event.target.value)} />
              </label>
              <label>
                Tracked subscriber id
                <input value={trackedSubscriberId ?? ''} onChange={(event) => setTrackedSubscriberId(event.target.value)} />
              </label>
              <label>
                Tracked media asset id
                <input value={trackedMediaAssetId ?? ''} onChange={(event) => setTrackedMediaAssetId(event.target.value)} />
              </label>
              <label>
                Destination url
                <input value={destinationUrl ?? ''} onChange={(event) => setDestinationUrl(event.target.value)} />
              </label>
              <button>Create tracked link</button>
              <button className="secondary inline-action" type="button" onClick={() => void refreshCampaignLinks()}>
                Refresh tracked links
              </button>
          </form>
          {campaignLinks.length || campaignLink ? (
            <ul className="compact-list">
              {campaignLink ? (
                <li>
                  <strong>{campaignLink.token}</strong>
                  <span>{campaignLink.public_url}</span>
                </li>
              ) : null}
              {campaignLinks.map((link) => (
                <li key={link.id}>
                  <strong>{link.token}</strong>
                  <span>Clicks: {link.click_count}</span>
                  <span>Redemptions: {link.redeemed_count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No manual tracking links loaded. Campaign-created Smart SMS links appear after scheduling.</p>
          )}
        </details>
      </>
    )
  }

  if (page === 'analytics') {
    const scheduledReach = upcomingCampaigns.reduce((total, item) => total + item.message_count, 0)
    const totalListSubscribers = subscriberLists.reduce((total, list) => total + (list.subscriber_count ?? 0), 0)

    return (
      <>
        <PageHeader
          title="Analytics"
          description="Review campaign performance, tracked links, redemptions, and quota consumption."
          action={<button onClick={() => void refreshPerformance()}>Refresh performance</button>}
        />
        <div className="metric-grid spaced">
          <Metric label="Scheduled reach" value={formatNumber(scheduledReach)} trend="Recipients in upcoming campaigns" />
          <Metric label="Campaign count" value={formatNumber(campaigns.length || dashboardSummary?.campaign_count)} trend="Loaded campaign history" />
          <Metric label="Message volume" value={formatActivity(dashboardSummary?.message_count)} trend="Campaign delivery volume" />
          <Metric label="Subscriber lists" value={formatNumber(subscriberLists.length)} trend={`${formatNumber(totalListSubscribers)} list memberships`} />
          <Metric label="Clicks" value={formatActivity(performance?.click_count ?? dashboardSummary?.click_count)} trend="Tracked link engagement" />
          <Metric
            label="Redemptions"
            value={formatActivity(performance?.redemption_count ?? dashboardSummary?.redemption_count)}
            trend="Offer conversion"
          />
          <Metric label="Quota usage" value={formatActivity(dashboardSummary?.credits_used)} trend="Credits consumed" />
        </div>
        <section className="panel table-panel">
          <div className="section-heading">
            <span>Campaigns</span>
            <strong>Analytics summary</strong>
          </div>
          <DataTable
            ariaLabel="Campaign analytics summary"
            rows={campaigns}
            getRowKey={(row) => row.id}
            empty={
              <EmptyState
                title="No campaigns available"
                description="Campaign counts and scheduled reach will appear once campaigns exist for this company."
              />
            }
            columns={[
              { key: 'name', header: 'Campaign', render: (row) => row.name },
              { key: 'status', header: 'Status', render: (row) => row.status },
              { key: 'scheduled', header: 'Scheduled', render: (row) => formatLocalDateTime(row.scheduled_at) },
              { key: 'messages', header: 'Messages', render: (row) => formatNumber(row.message_count) },
              { key: 'credits', header: 'Credits', render: (row) => formatNumber(row.credit_cost) },
              { key: 'followups', header: 'Follow-ups', render: (row) => formatNumber(row.reminder_count) },
            ]}
          />
        </section>
        <div className="analytics-grid">
          {['Messages', 'Clicks', 'Redemptions', 'Quota usage'].map((label, index) => (
            <section className="panel chart-card" aria-label={`${label} chart`} key={label}>
              <div className="section-heading">
                <span>Chart</span>
                <strong>{label}</strong>
              </div>
              <div className="mini-chart" aria-hidden="true">
                {[32, 48, 38, 62, 54, 76, 58].map((height, barIndex) => (
                  <span key={barIndex} style={{ height: `${Math.max(18, height - index * 8)}%` }} />
                ))}
              </div>
              <p className="muted">{performance ? 'Performance data refreshed from tenant reporting.' : 'No data yet. Refresh after campaigns have activity.'}</p>
            </section>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Settings" description="Manage tenant identity, team access, roles, and regional credit budgets." />
      <div className="result-strip">
        <strong>{session.companyName}</strong>
        <span>{companyId}</span>
        <span>{session.membershipRole ?? 'company_user'}</span>
        <span>Credits: {formatNumber(dashboardSummary?.credit_balance)}</span>
      </div>
      <div className="split-layout two-column settings-grid">
        <form className="panel" onSubmit={createTeamAccessCode}>
          <div className="section-heading">
            <span>Invite</span>
            <strong>Access code</strong>
          </div>
          <label>
            Invite role
            <select value={inviteRole ?? ''} onChange={(event) => setInviteRole(event.target.value)}>
              <option value="customer_admin">Company admin</option>
              <option value="campaign_manager">Campaign manager</option>
              <option value="regional_manager">Regional manager</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <label>
            User credit limit
            <input value={inviteCreditLimit ?? ''} onChange={(event) => setInviteCreditLimit(event.target.value)} />
          </label>
          <button>Create user access code</button>
          {accessCodeResult ? (
            <p className="notice">
              Code {accessCodeResult.code} grants {accessCodeResult.role} with{' '}
              {formatNumber(accessCodeResult.credit_limit)} credits.
            </p>
          ) : null}
        </form>

        <form className="panel" onSubmit={updateTeamUser}>
          <div className="section-heading">
            <span>Permissions</span>
            <strong>Adjust user</strong>
          </div>
          <label>
            User email
            <input value={editUserEmail ?? ''} onChange={(event) => setEditUserEmail(event.target.value)} />
          </label>
          <label>
            User role
            <select value={editUserRole ?? ''} onChange={(event) => setEditUserRole(event.target.value)}>
              <option value="customer_admin">Company admin</option>
              <option value="campaign_manager">Campaign manager</option>
              <option value="regional_manager">Regional manager</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <label>
            User credit limit
            <input value={editCreditLimit ?? ''} onChange={(event) => setEditCreditLimit(event.target.value)} />
          </label>
          <button>Update user permissions</button>
          <button className="secondary inline-action" type="button" onClick={() => void refreshTeamUsers()}>
            Refresh team
          </button>
        </form>
      </div>
      {teamUsers.length ? (
        <ul className="compact-list">
          {teamUsers.map((user) => (
            <li key={user.user_id}>
              <strong>{user.email}</strong>
              <span>{user.role}</span>
              <span>
                Budget: {formatNumber(user.credits_used)} used / {formatNumber(user.credit_limit)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}

function CampaignColumn({
  title,
  campaigns,
  emptyText = 'No campaigns yet.',
  onEdit,
}: {
  title: string
  campaigns: CampaignListItem[]
  emptyText?: string
  onEdit?: (campaign: CampaignListItem) => void
}) {
  return (
    <section className="campaign-column">
      <h2>{title}</h2>
      {campaigns.length ? (
        <ul className="compact-list">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <strong>{campaign.name}</strong>
              <small className="subtle-id">Campaign ID: {campaign.id}</small>
              {campaign.body ? <span>Copy: {campaign.body}</span> : null}
              <span>{campaign.status}</span>
              <span>Scheduled: {formatLocalDateTime(campaign.scheduled_at)}</span>
              <span>Created: {formatLocalDateTime(campaign.created_at)}</span>
              <span>Messages: {formatNumber(campaign.message_count)}</span>
              <span>Credits: {formatNumber(campaign.credit_cost)}</span>
              <span>Follow-ups: {formatNumber(campaign.reminder_count)}</span>
              {onEdit ? (
                <button className="secondary inline-action" type="button" onClick={() => onEdit(campaign)}>
                  Modify campaign
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{emptyText}</p>
      )}
    </section>
  )
}

function filterCampaigns(
  campaigns: CampaignListItem[],
  filters: {
    search: string
    status: string
    from: string
    to: string
  },
) {
  const search = filters.search.trim().toLowerCase()
  const fromTime = parseFilterDateTime(filters.from)
  const toTime = parseFilterDateTime(filters.to)

  return campaigns.filter((campaign) => {
    const searchable = `${campaign.name ?? ''} ${campaign.body ?? ''}`.toLowerCase()
    if (search && !searchable.includes(search)) return false
    if (filters.status !== 'all' && campaign.status !== filters.status) return false

    const campaignTime = parseCampaignDateTime(campaign)
    if (fromTime !== null && (campaignTime === null || campaignTime < fromTime)) return false
    if (toTime !== null && (campaignTime === null || campaignTime > toTime)) return false

    return true
  })
}

function parseCampaignDateTime(campaign: CampaignListItem): number | null {
  return parseFilterDateTime(campaign.scheduled_at ?? campaign.created_at ?? '')
}

function parseFilterDateTime(value: string): number | null {
  if (!value) return null
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? null : parsed
}
