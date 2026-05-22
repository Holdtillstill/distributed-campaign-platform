import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { API_BASE_URL } from '../../api/client'
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
import { formatActivity, formatCount, formatNumber } from '../../utils'

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
  const [campaignName, setCampaignName] = useState('Spring Launch')
  const [messageBody, setMessageBody] = useState('Hello from the Kubernetes campaign platform')
  const [messageType, setMessageType] = useState<'regular' | 'smart'>('regular')
  const [campaignSubpage, setCampaignSubpage] = useState<CampaignSubpage>('list')
  const [scheduledAt, setScheduledAt] = useState('2026-05-25T16:00')
  const [smartMediaAssetId, setSmartMediaAssetId] = useState('')
  const [subscriberLists, setSubscriberLists] = useState<SubscriberListResult[]>([])
  const [subscribers, setSubscribers] = useState<SubscriberResult[]>([])
  const [selectedListIds, setSelectedListIds] = useState<string[]>([])
  const [selectedSubscriberIds, setSelectedSubscriberIds] = useState<string[]>([])
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [listName, setListName] = useState('VIP List')
  const [subscriberList, setSubscriberList] = useState<SubscriberListResult | null>(null)
  const [subscriberPhone, setSubscriberPhone] = useState('+15550001010')
  const [subscriberSource, setSubscriberSource] = useState('import')
  const [subscriber, setSubscriber] = useState<SubscriberResult | null>(null)
  const [optInPhone, setOptInPhone] = useState('+15550001011')
  const [optInSource, setOptInSource] = useState('landing-page')
  const [optIn, setOptIn] = useState<OptInResult | null>(null)
  const [confirmToken, setConfirmToken] = useState('')
  const [confirmResult, setConfirmResult] = useState<OptInResult | null>(null)
  const [mediaFilename, setMediaFilename] = useState('coupon.png')
  const [mediaContentType, setMediaContentType] = useState('image/png')
  const [mediaUrl, setMediaUrl] = useState('https://cdn.example/coupon.png')
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [trackedCampaignId, setTrackedCampaignId] = useState('')
  const [trackedSubscriberId, setTrackedSubscriberId] = useState('')
  const [trackedMediaAssetId, setTrackedMediaAssetId] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('https://example.com/spring')
  const [campaignLinks, setCampaignLinks] = useState<CampaignLink[]>([])
  const [campaignLink, setCampaignLink] = useState<CampaignLink | null>(null)
  const [performance, setPerformance] = useState<PerformanceTotals | null>(null)
  const [reminderSourceCampaignId, setReminderSourceCampaignId] = useState('')
  const [reminderAudienceRule, setReminderAudienceRule] = useState('not_clicked')
  const [reminderMessageBody, setReminderMessageBody] = useState('Still interested?')
  const [reminderCampaign, setReminderCampaign] = useState<ReminderCampaign | null>(null)
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

  const upcomingCampaigns = campaigns.filter((item) => item.status === 'scheduled')
  const pastCampaigns = campaigns.filter((item) => item.status !== 'scheduled')

  useEffect(() => {
    async function loadDashboardSummary() {
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/dashboard-summary`)
      if (response.ok) setDashboardSummary(await response.json())
    }
    void loadDashboardSummary()
  }, [companyId])

  useEffect(() => {
    async function loadCampaignPlanningData() {
      const [listsResponse, subscribersResponse, campaignsResponse, mediaResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/companies/${companyId}/subscriber-lists`),
        fetch(`${API_BASE_URL}/companies/${companyId}/subscribers`),
        fetch(`${API_BASE_URL}/companies/${companyId}/campaigns`),
        fetch(`${API_BASE_URL}/companies/${companyId}/media-assets`),
      ])
      if (listsResponse.ok) setSubscriberLists(await listsResponse.json())
      if (subscribersResponse.ok) setSubscribers(await subscribersResponse.json())
      if (campaignsResponse.ok) setCampaigns(await campaignsResponse.json())
      if (mediaResponse.ok) setMediaAssets(await mediaResponse.json())
    }
    void loadCampaignPlanningData()
  }, [companyId])

  function toggleValue(current: string[], value: string): string[] {
    return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
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
    if (response.ok) setReminderCampaign(await response.json())
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
    return (
      <>
        <PageHeader
          title="Campaigns"
          description="Schedule SMS campaigns from opted-in subscribers, lists, and recent campaign follow-ups."
          action={
            campaignSubpage === 'list' ? (
              <button onClick={() => setCampaignSubpage('create')}>Create campaign</button>
            ) : (
              <button className="secondary" onClick={() => setCampaignSubpage('list')}>
                Back to campaigns
              </button>
            )
          }
        />
        {campaignSubpage === 'create' ? (
          <>
            <form className="form-grid" onSubmit={createCampaign}>
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
              <label>
                Schedule date and time
                <input
                  type="datetime-local"
                  value={scheduledAt ?? ''}
                  onChange={(event) => setScheduledAt(event.target.value)}
                />
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
              <div className="audience-picker wide">
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
                    subscribers.map((subscriber) => (
                      <label className="check-row" key={subscriber.id}>
                        <input
                          type="checkbox"
                          checked={selectedSubscriberIds.includes(subscriber.id)}
                          onChange={() => setSelectedSubscriberIds((current) => toggleValue(current, subscriber.id))}
                        />
                        {subscriber.phone_number} ({subscriber.consent_status})
                      </label>
                    ))
                  ) : (
                    <p className="muted">Import or confirm subscribers first.</p>
                  )}
                </div>
              </div>
              <p className="estimate">
                Estimated cost: {formatNumber(selectedAudienceCount * (messageType === 'smart' ? 2 : 1))} credits
              </p>
              <button>Schedule campaign</button>
            </form>
            {campaign ? (
              <div className="result-strip">
                <strong>Campaign status</strong>
                <strong>{campaign.id}</strong>
                <span>{campaign.company_id}</span>
                <span>{campaign.message_type}</span>
                <span>{campaign.status}</span>
                <span>Scheduled: {campaign.scheduled_at ?? 'Now'}</span>
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
        ) : (
          <>
            <div className="campaign-board">
              <CampaignColumn title="Upcoming" campaigns={upcomingCampaigns} onEdit={() => setCampaignSubpage('create')} />
              <CampaignColumn title="Past" campaigns={pastCampaigns} onEdit={() => setCampaignSubpage('create')} />
            </div>
            <form className="form-grid follow-up-panel" onSubmit={createReminder}>
              <div className="section-heading wide">
                <span>Follow-up</span>
                <strong>Reminder from recent campaign</strong>
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
              <button>Create follow-up reminder</button>
            </form>
            {reminderCampaign ? (
              <div className="result-strip">
                <strong>{reminderCampaign.id}</strong>
                <span>{reminderCampaign.audience_rule}</span>
                <span>Estimated recipients: {reminderCampaign.estimated_recipient_count}</span>
              </div>
            ) : null}
          </>
        )}
      </>
    )
  }

  if (page === 'subscribers') {
    return (
      <>
        <PageHeader title="Subscribers" description="Manage lists, local imports, and double opt-in confirmation." />
        <div className="split-layout">
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
          <form className="panel" onSubmit={importSubscriber}>
            <div className="section-heading">
              <span>Import</span>
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
                    <div className="asset-thumb">{asset.content_type?.startsWith('image/') ? 'IMG' : 'FILE'}</div>
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
        ) : null}
      </>
    )
  }

  if (page === 'analytics') {
    return (
      <>
        <PageHeader
          title="Analytics"
          description="Review campaign performance, tracked links, redemptions, and quota consumption."
          action={<button onClick={() => void refreshPerformance()}>Refresh performance</button>}
        />
        <div className="metric-grid spaced">
          <Metric label="Messages" value={formatActivity(dashboardSummary?.message_count)} trend="Campaign delivery volume" />
          <Metric label="Clicks" value={formatActivity(performance?.click_count ?? dashboardSummary?.click_count)} trend="Tracked link engagement" />
          <Metric
            label="Redemptions"
            value={formatActivity(performance?.redemption_count ?? dashboardSummary?.redemption_count)}
            trend="Offer conversion"
          />
          <Metric label="Quota usage" value={formatActivity(dashboardSummary?.credits_used)} trend="Credits consumed" />
        </div>
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
  onEdit,
}: {
  title: string
  campaigns: CampaignListItem[]
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
              <span>{campaign.id}</span>
              <span>{campaign.status}</span>
              <span>Scheduled: {campaign.scheduled_at ?? 'Immediate'}</span>
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
        <p className="muted">No campaigns yet.</p>
      )}
    </section>
  )
}
