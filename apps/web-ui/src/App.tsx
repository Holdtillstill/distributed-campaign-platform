import { FormEvent, useEffect, useMemo, useState } from 'react'

type StatusCounts = {
  queued: number
  sent: number
  failed: number
  retried: number
  dead_lettered: number
}

type Campaign = {
  id: string
  company_id?: string
  name: string
  message_count?: number
  status_counts: StatusCounts
}

type CompanyResult = {
  company?: {
    id?: string
    name?: string
    slug?: string
  }
  admin_user?: {
    id?: string
    email?: string
  }
}

type Membership = {
  company_id: string
  company_name?: string
  role?: string
}

type SubscriberListResult = {
  id?: string
  company_id?: string
  name?: string
}

type SubscriberResult = {
  id?: string
  company_id?: string
  phone_number?: string
  source?: string
  list_id?: string
  consent_status?: string
}

type OptInResult = {
  token?: string
  company_id?: string
  phone_number?: string
  status?: string
}

type MediaAsset = {
  id?: string
  company_id?: string
  filename?: string
  content_type?: string
  url?: string
}

type CampaignLink = {
  id?: string
  token?: string
  public_url?: string
  company_id?: string
  campaign_id?: string
  subscriber_id?: string
  media_asset_id?: string
  destination_url?: string
  click_count?: number
  redeemed_count?: number
}

type LandingPayload = {
  token?: string
  destination_url?: string
  click_count?: number
  media_asset?: MediaAsset
}

type RedemptionResult = {
  token?: string
  status?: string
  redeemed_count?: number
}

type PerformanceTotals = {
  media_asset_count: number
  tracked_link_count: number
  click_count: number
  redemption_count: number
}

type ReminderCampaign = {
  id?: string
  company_id?: string
  source_campaign_id?: string
  audience_rule?: string
  message_body?: string
  status?: string
  estimated_recipient_count?: number
}

type UsageRow = {
  company_id: string
  company_name: string
  campaign_count: number
  message_count: number
  media_asset_count: number
  tracked_link_count: number
  click_count: number
  redemption_count: number
  reminder_count: number
}

type SystemCheck = {
  path: string
  label: string
  state: 'checking' | 'ok' | 'error'
  detail: string
}

const API_BASE_URL = window.__APP_CONFIG__?.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL ?? '/api'
const DEMO_RECIPIENTS = ['+15550001001', '+15550001002', '+15550001003']

function statusTotal(counts: StatusCounts): number {
  return Object.values(counts).reduce((total, count) => total + count, 0)
}

function terminalTotal(counts: StatusCounts): number {
  return counts.sent + counts.failed + counts.dead_lettered
}

export default function App() {
  const [activeCompanyId, setActiveCompanyId] = useState('')
  const [companyName, setCompanyName] = useState('Acme Co')
  const [companySlug, setCompanySlug] = useState('acme')
  const [adminEmail, setAdminEmail] = useState('admin@example.com')
  const [companyResult, setCompanyResult] = useState<CompanyResult | null>(null)
  const [membershipEmail, setMembershipEmail] = useState('admin@example.com')
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [listName, setListName] = useState('Primary list')
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
  const [mediaAsset, setMediaAsset] = useState<MediaAsset | null>(null)
  const [trackedCampaignId, setTrackedCampaignId] = useState('')
  const [trackedSubscriberId, setTrackedSubscriberId] = useState('')
  const [trackedMediaAssetId, setTrackedMediaAssetId] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('https://example.com/spring')
  const [campaignLinks, setCampaignLinks] = useState<CampaignLink[]>([])
  const [campaignLink, setCampaignLink] = useState<CampaignLink | null>(null)
  const [trackedToken, setTrackedToken] = useState('')
  const [landingPayload, setLandingPayload] = useState<LandingPayload | null>(null)
  const [redemption, setRedemption] = useState<RedemptionResult | null>(null)
  const [performance, setPerformance] = useState<PerformanceTotals | null>(null)
  const [reminderSourceCampaignId, setReminderSourceCampaignId] = useState('')
  const [reminderAudienceRule, setReminderAudienceRule] = useState('not_clicked')
  const [reminderMessageBody, setReminderMessageBody] = useState('Still interested?')
  const [reminderCampaigns, setReminderCampaigns] = useState<ReminderCampaign[]>([])
  const [reminderCampaign, setReminderCampaign] = useState<ReminderCampaign | null>(null)
  const [usageFromDate, setUsageFromDate] = useState('2026-05-01')
  const [usageToDate, setUsageToDate] = useState('2026-05-21')
  const [usageRows, setUsageRows] = useState<UsageRow[]>([])
  const [campaignName, setCampaignName] = useState('Portfolio demo campaign')
  const [messageBody, setMessageBody] = useState('Hello from the Kubernetes campaign platform')
  const [recipients, setRecipients] = useState(DEMO_RECIPIENTS.join('\n'))
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([
    { path: '/healthz', label: 'Campaign API liveness', state: 'checking', detail: 'Checking /healthz' },
    { path: '/readyz', label: 'Campaign API readiness', state: 'checking', detail: 'Checking /readyz' },
    { path: '/metrics', label: 'Prometheus metrics', state: 'checking', detail: 'Checking /metrics' },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scopeError, setScopeError] = useState<string | null>(null)

  const progress = useMemo(() => {
    if (!campaign) return 0
    const total = statusTotal(campaign.status_counts)
    if (total === 0) return 0
    return Math.round((terminalTotal(campaign.status_counts) / total) * 100)
  }, [campaign])

  async function refreshSystemStatus() {
    const checks = await Promise.all([
      fetch(`${API_BASE_URL}/healthz`).then((response) => toSystemCheck(response, '/healthz', 'Campaign API liveness')),
      fetch(`${API_BASE_URL}/readyz`).then((response) => toSystemCheck(response, '/readyz', 'Campaign API readiness')),
      fetch(`${API_BASE_URL}/metrics`).then((response) => toSystemCheck(response, '/metrics', 'Prometheus metrics')),
    ])
    setSystemChecks(checks)
  }

  function toSystemCheck(response: Response, path: string, label: string): SystemCheck {
    if (!response.ok) {
      return { path, label, state: 'error', detail: `${response.status} ${response.statusText}` }
    }
    return { path, label, state: 'ok', detail: `${path} responded ${response.status}` }
  }

  async function refreshCampaign(campaignId: string) {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`)
    if (!response.ok) throw new Error(`Campaign status request failed: ${response.status}`)
    setCampaign(await response.json())
  }

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setScopeError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/admin/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Admin': 'true' },
        body: JSON.stringify({ name: companyName, slug: companySlug, admin_email: adminEmail }),
      })

      if (!response.ok) throw new Error(`Create company failed: ${response.status}`)
      const result = (await response.json()) as CompanyResult
      setCompanyResult(result)
      if (result.company?.id) setActiveCompanyId(result.company.id)
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function lookupMemberships(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setScopeError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/me/memberships`, {
        headers: { 'X-User-Email': membershipEmail },
      })

      if (!response.ok) throw new Error(`Membership lookup failed: ${response.status}`)
      const result = (await response.json()) as { memberships?: Membership[] }
      setMemberships(result.memberships ?? [])
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function createSubscriberList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setScopeError(null)

    try {
      const companyId = activeCompanyId.trim()
      if (!companyId) throw new Error('Select an active company before creating a list')

      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/subscriber-lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: listName }),
      })

      if (!response.ok) throw new Error(`Create list failed: ${response.status}`)
      setSubscriberList(await response.json())
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function importSubscriber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setScopeError(null)

    try {
      const companyId = activeCompanyId.trim()
      if (!companyId) throw new Error('Select an active company before importing a subscriber')

      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: subscriberPhone,
          source: subscriberSource,
          list_id: subscriberList?.id ?? '',
        }),
      })

      if (!response.ok) throw new Error(`Import subscriber failed: ${response.status}`)
      const result = (await response.json()) as SubscriberResult
      setSubscriber(result)
      if (result.id) setTrackedSubscriberId(result.id)
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function startOptIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setScopeError(null)

    try {
      const companyId = activeCompanyId.trim()
      if (!companyId) throw new Error('Select an active company before starting opt-in')

      const response = await fetch(`${API_BASE_URL}/public/opt-ins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, phone_number: optInPhone, source: optInSource }),
      })

      if (!response.ok) throw new Error(`Start opt-in failed: ${response.status}`)
      const result = (await response.json()) as OptInResult
      setOptIn(result)
      if (result.token) setConfirmToken(result.token)
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function confirmOptIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setScopeError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/public/opt-ins/${confirmToken}/confirm`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error(`Confirm opt-in failed: ${response.status}`)
      setConfirmResult(await response.json())
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  function activeCompanyOrThrow(action: string): string {
    const companyId = activeCompanyId.trim()
    if (!companyId) throw new Error(`Select an active company before ${action}`)
    return companyId
  }

  async function addMediaAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setScopeError(null)

    try {
      const companyId = activeCompanyOrThrow('adding media')
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/media-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: mediaFilename, content_type: mediaContentType, url: mediaUrl }),
      })

      if (!response.ok) throw new Error(`Add media asset failed: ${response.status}`)
      const result = (await response.json()) as MediaAsset
      setMediaAsset(result)
      setMediaAssets((current) => [result, ...current.filter((asset) => asset.id !== result.id)])
      if (result.id) setTrackedMediaAssetId(result.id)
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function refreshMediaAssets() {
    setScopeError(null)

    try {
      const companyId = activeCompanyOrThrow('loading media')
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/media-assets`)
      if (!response.ok) throw new Error(`Media asset list failed: ${response.status}`)
      setMediaAssets(await response.json())
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function createTrackedLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setScopeError(null)

    try {
      const companyId = activeCompanyOrThrow('creating a tracked link')
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

      if (!response.ok) throw new Error(`Create tracked link failed: ${response.status}`)
      const result = (await response.json()) as CampaignLink
      setCampaignLink(result)
      setCampaignLinks((current) => [result, ...current.filter((link) => link.id !== result.id)])
      if (result.token) setTrackedToken(result.token)
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function refreshCampaignLinks() {
    setScopeError(null)

    try {
      const companyId = activeCompanyOrThrow('loading tracked links')
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/campaign-links`)
      if (!response.ok) throw new Error(`Tracked link list failed: ${response.status}`)
      setCampaignLinks(await response.json())
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function openTrackedLink() {
    setScopeError(null)

    try {
      const token = trackedToken.trim()
      if (!token) throw new Error('Enter a tracked token before opening it')
      const response = await fetch(`${API_BASE_URL}/r/${token}`)
      if (!response.ok) throw new Error(`Open tracked link failed: ${response.status}`)
      setLandingPayload(await response.json())
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function redeemTrackedLink() {
    setScopeError(null)

    try {
      const token = trackedToken.trim()
      if (!token) throw new Error('Enter a tracked token before redeeming it')
      const response = await fetch(`${API_BASE_URL}/r/${token}/redeem`, { method: 'POST' })
      if (!response.ok) throw new Error(`Redeem tracked link failed: ${response.status}`)
      setRedemption(await response.json())
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function refreshPerformance() {
    setScopeError(null)

    try {
      const companyId = activeCompanyOrThrow('loading performance')
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/campaign-performance`)
      if (!response.ok) throw new Error(`Campaign performance failed: ${response.status}`)
      setPerformance(await response.json())
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function createReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setScopeError(null)

    try {
      const companyId = activeCompanyOrThrow('creating a reminder')
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/reminder-campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_campaign_id: reminderSourceCampaignId,
          audience_rule: reminderAudienceRule,
          message_body: reminderMessageBody,
        }),
      })

      if (!response.ok) throw new Error(`Create reminder failed: ${response.status}`)
      const result = (await response.json()) as ReminderCampaign
      setReminderCampaign(result)
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function refreshReminders() {
    setScopeError(null)

    try {
      const companyId = activeCompanyOrThrow('loading reminders')
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/reminder-campaigns`)
      if (!response.ok) throw new Error(`Reminder list failed: ${response.status}`)
      setReminderCampaigns(await response.json())
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function loadUsage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setScopeError(null)

    try {
      const params = new URLSearchParams({ from: usageFromDate, to: usageToDate })
      const response = await fetch(`${API_BASE_URL}/admin/usage?${params.toString()}`, {
        headers: { 'X-Internal-Admin': 'true' },
      })

      if (!response.ok) throw new Error(`Usage dashboard failed: ${response.status}`)
      setUsageRows(await response.json())
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'unknown error')
    }
  }

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const recipientList = recipients
      .split(/\n|,/)
      .map((recipient) => recipient.trim())
      .filter(Boolean)

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (activeCompanyId.trim()) headers['X-Company-Id'] = activeCompanyId.trim()

      const response = await fetch(`${API_BASE_URL}/campaigns`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: campaignName, body: messageBody, recipients: recipientList }),
      })

      if (!response.ok) throw new Error(`Create campaign failed: ${response.status}`)
      const result = (await response.json()) as Campaign
      setCampaign(result)
      setTrackedCampaignId(result.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    void refreshSystemStatus()
  }, [])

  useEffect(() => {
    if (!campaign?.id || progress === 100) return
    const timer = window.setInterval(() => void refreshCampaign(campaign.id), 2_000)
    return () => window.clearInterval(timer)
  }, [campaign?.id, progress])

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Distributed Campaign Platform</p>
          <h1>Kubernetes campaign delivery demo</h1>
          <p>
            Create a campaign, publish work through NATS JetStream, and watch the dispatcher update message
            delivery state in Postgres.
          </p>
        </div>
        <a className="docs-link" href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">
          API docs
        </a>
      </section>

      <section className="panel">
        <div className="section-heading">
          <span>Company scope</span>
          <strong>{activeCompanyId ? `Active ${activeCompanyId}` : 'No company selected'}</strong>
        </div>
        <label>
          Active company id
          <input value={activeCompanyId} onChange={(event) => setActiveCompanyId(event.target.value)} />
        </label>
        {scopeError ? <p className="error">{scopeError}</p> : null}
      </section>

      <section className="grid">
        <form className="panel" onSubmit={createCompany}>
          <div className="section-heading">
            <span>Internal admin</span>
            <strong>Create company</strong>
          </div>
          <label>
            Company name
            <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
          </label>
          <label>
            Company slug
            <input value={companySlug} onChange={(event) => setCompanySlug(event.target.value)} />
          </label>
          <label>
            Admin email
            <input type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} />
          </label>
          <button>Create company</button>
          {companyResult ? (
            <div className="result-block">
              <span>Company id: {companyResult.company?.id ?? 'unknown'}</span>
              <span>Admin user: {companyResult.admin_user?.id ?? 'unknown'}</span>
              <span>Admin email: {companyResult.admin_user?.email ?? adminEmail}</span>
            </div>
          ) : null}
        </form>

        <form className="panel" onSubmit={lookupMemberships}>
          <div className="section-heading">
            <span>Membership lookup</span>
            <strong>{memberships.length ? `${memberships.length} found` : 'By user email'}</strong>
          </div>
          <label>
            User email
            <input type="email" value={membershipEmail} onChange={(event) => setMembershipEmail(event.target.value)} />
          </label>
          <button>Lookup memberships</button>
          {memberships.length ? (
            <ul className="membership-list">
              {memberships.map((membership) => {
                const companyLabel = membership.company_name ?? membership.company_id
                return (
                  <li aria-label={companyLabel} key={`${membership.company_id}-${membership.role ?? 'member'}`}>
                    <div>
                      <strong>{companyLabel}</strong>
                      <span>{membership.company_id}</span>
                      {membership.role ? <span>{membership.role}</span> : null}
                    </div>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => setActiveCompanyId(membership.company_id)}
                    >
                      Select {companyLabel}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </form>
      </section>

      <section className="grid three-column">
        <form className="panel" onSubmit={createSubscriberList}>
          <div className="section-heading">
            <span>Subscriber list</span>
            <strong>Create</strong>
          </div>
          <label>
            Subscriber list name
            <input value={listName} onChange={(event) => setListName(event.target.value)} />
          </label>
          <button>Create list</button>
          {subscriberList ? (
            <div className="result-block">
              <span>List id: {subscriberList.id}</span>
              <span>{subscriberList.name}</span>
            </div>
          ) : null}
        </form>

        <form className="panel" onSubmit={importSubscriber}>
          <div className="section-heading">
            <span>Subscriber import</span>
            <strong>Company provided</strong>
          </div>
          <label>
            Subscriber phone number
            <input value={subscriberPhone} onChange={(event) => setSubscriberPhone(event.target.value)} />
          </label>
          <label>
            Subscriber source
            <input value={subscriberSource} onChange={(event) => setSubscriberSource(event.target.value)} />
          </label>
          <button>Import subscriber</button>
          {subscriber ? (
            <div className="result-block">
              <span>Subscriber id: {subscriber.id}</span>
              <span>{subscriber.phone_number}</span>
              <span>{subscriber.consent_status}</span>
            </div>
          ) : null}
        </form>

        <div className="panel">
          <form onSubmit={startOptIn}>
            <div className="section-heading">
              <span>Double opt-in</span>
              <strong>Public flow</strong>
            </div>
            <label>
              Opt-in phone number
              <input value={optInPhone} onChange={(event) => setOptInPhone(event.target.value)} />
            </label>
            <label>
              Opt-in source
              <input value={optInSource} onChange={(event) => setOptInSource(event.target.value)} />
            </label>
            <button>Start opt-in</button>
          </form>
          {optIn ? (
            <div className="result-block">
              <span>Token: {optIn.token}</span>
              <span>Status: {optIn.status}</span>
            </div>
          ) : null}
          <form className="stacked-form" onSubmit={confirmOptIn}>
            <label>
              Confirmation token
              <input value={confirmToken} onChange={(event) => setConfirmToken(event.target.value)} />
            </label>
            <button>Confirm opt-in</button>
          </form>
          {confirmResult ? (
            <div className="result-block">
              <span>Token: {confirmResult.token}</span>
              <span>Status: {confirmResult.status}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <span>Media & engagement</span>
          <strong>{performance ? `${performance.click_count} clicks` : 'Tracked links'}</strong>
        </div>
        <div className="grid engagement-grid">
          <form onSubmit={addMediaAsset}>
            <label>
              Media filename
              <input value={mediaFilename} onChange={(event) => setMediaFilename(event.target.value)} />
            </label>
            <label>
              Media content type
              <input value={mediaContentType} onChange={(event) => setMediaContentType(event.target.value)} />
            </label>
            <label>
              Media url
              <input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} />
            </label>
            <button>Add media asset</button>
            <button className="secondary inline-action" type="button" onClick={() => void refreshMediaAssets()}>
              Refresh media assets
            </button>
            {mediaAsset ? (
              <div className="result-block">
                <span>Media id: {mediaAsset.id}</span>
                <span>{mediaAsset.filename}</span>
                <span>{mediaAsset.url}</span>
              </div>
            ) : null}
            {mediaAssets.length ? (
              <ul className="compact-list">
                {mediaAssets.map((asset) => (
                  <li key={asset.id ?? asset.url}>
                    <strong>{asset.filename}</strong>
                    <span>{asset.id}</span>
                    <span>{asset.url}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </form>

          <form onSubmit={createTrackedLink}>
            <label>
              Tracked campaign id
              <input value={trackedCampaignId} onChange={(event) => setTrackedCampaignId(event.target.value)} />
            </label>
            <label>
              Tracked subscriber id
              <input value={trackedSubscriberId} onChange={(event) => setTrackedSubscriberId(event.target.value)} />
            </label>
            <label>
              Tracked media asset id
              <input value={trackedMediaAssetId} onChange={(event) => setTrackedMediaAssetId(event.target.value)} />
            </label>
            <label>
              Destination url
              <input value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} />
            </label>
            <button>Create tracked link</button>
            <button className="secondary inline-action" type="button" onClick={() => void refreshCampaignLinks()}>
              Refresh tracked links
            </button>
            {campaignLink ? (
              <div className="result-block">
                <span>Token: {campaignLink.token}</span>
                <span>{campaignLink.public_url}</span>
              </div>
            ) : null}
            {campaignLinks.length ? (
              <ul className="compact-list">
                {campaignLinks.map((link) => (
                  <li key={link.id ?? link.token}>
                    <strong>{link.token}</strong>
                    <span>{link.destination_url}</span>
                    <span>Clicks: {link.click_count ?? 0}</span>
                    <span>Redeemed: {link.redeemed_count ?? 0}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </form>
        </div>

        <div className="engagement-actions">
          <label>
            Tracked token
            <input value={trackedToken} onChange={(event) => setTrackedToken(event.target.value)} />
          </label>
          <button className="secondary" type="button" onClick={() => void openTrackedLink()}>
            Open tracked link
          </button>
          <button className="secondary" type="button" onClick={() => void redeemTrackedLink()}>
            Redeem tracked link
          </button>
          <button className="secondary" type="button" onClick={() => void refreshPerformance()}>
            Refresh performance
          </button>
        </div>

        {landingPayload ? (
          <div className="result-block">
            <span>Landing token: {landingPayload.token}</span>
            <span>{landingPayload.destination_url}</span>
            <span>Click count: {landingPayload.click_count ?? 0}</span>
            {landingPayload.media_asset?.filename ? <span>{landingPayload.media_asset.filename}</span> : null}
          </div>
        ) : null}
        {redemption ? (
          <div className="result-block">
            <span>Redeem token: {redemption.token}</span>
            <span>Status: {redemption.status}</span>
            <span>Redeemed count: {redemption.redeemed_count ?? 0}</span>
          </div>
        ) : null}
        {performance ? (
          <div className="stats engagement-stats">
            <Stat label="Media assets" value={performance.media_asset_count} />
            <Stat label="Tracked links" value={performance.tracked_link_count} />
            <Stat label="Clicks" value={performance.click_count} />
            <Stat label="Redemptions" value={performance.redemption_count} />
          </div>
        ) : null}
      </section>

      <section className="grid">
        <form className="panel" onSubmit={createReminder}>
          <div className="section-heading">
            <span>Reminder campaigns</span>
            <strong>{reminderCampaign ? `${reminderCampaign.estimated_recipient_count ?? 0} estimated` : 'Audience estimate'}</strong>
          </div>
          <label>
            Reminder source campaign id
            <input
              value={reminderSourceCampaignId}
              onChange={(event) => setReminderSourceCampaignId(event.target.value)}
            />
          </label>
          <label>
            Reminder audience rule
            <select value={reminderAudienceRule} onChange={(event) => setReminderAudienceRule(event.target.value)}>
              <option value="not_clicked">not_clicked</option>
              <option value="clicked_not_redeemed">clicked_not_redeemed</option>
            </select>
          </label>
          <label>
            Reminder copy
            <textarea value={reminderMessageBody} onChange={(event) => setReminderMessageBody(event.target.value)} />
          </label>
          <button>Create reminder</button>
          <button className="secondary inline-action" type="button" onClick={() => void refreshReminders()}>
            Refresh reminders
          </button>
          {reminderCampaign ? (
            <div className="result-block">
              <span>Reminder id: {reminderCampaign.id}</span>
              <span>Estimated recipients: {reminderCampaign.estimated_recipient_count ?? 0}</span>
            </div>
          ) : null}
          {reminderCampaigns.length ? (
            <ul className="compact-list">
              {reminderCampaigns.map((reminder) => (
                <li key={reminder.id ?? `${reminder.source_campaign_id}-${reminder.audience_rule}`}>
                  <strong>{reminder.id}</strong>
                  <span>{reminder.audience_rule}</span>
                  <span>Source: {reminder.source_campaign_id}</span>
                  <span>Estimated recipients: {reminder.estimated_recipient_count ?? 0}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </form>

        <form className="panel" onSubmit={loadUsage}>
          <div className="section-heading">
            <span>Internal admin</span>
            <strong>{usageRows.length ? `${usageRows.length} tenants` : 'Usage dashboard'}</strong>
          </div>
          <label>
            Usage from date
            <input type="date" value={usageFromDate} onChange={(event) => setUsageFromDate(event.target.value)} />
          </label>
          <label>
            Usage to date
            <input type="date" value={usageToDate} onChange={(event) => setUsageToDate(event.target.value)} />
          </label>
          <button>Load usage</button>
          {usageRows.length ? (
            <ul className="compact-list usage-list">
              {usageRows.map((row) => (
                <li key={row.company_id}>
                  <strong>{row.company_name}</strong>
                  <span>{row.company_id}</span>
                  <span>Campaigns: {row.campaign_count}</span>
                  <span>Messages: {row.message_count}</span>
                  <span>Media assets: {row.media_asset_count}</span>
                  <span>Tracked links: {row.tracked_link_count}</span>
                  <span>Clicks: {row.click_count}</span>
                  <span>Redemptions: {row.redemption_count}</span>
                  <span>Reminders: {row.reminder_count}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      </section>

      <section className="grid">
        <form className="panel" onSubmit={createCampaign}>
          <div className="section-heading">
            <span>Create campaign</span>
            <strong>Demo input</strong>
          </div>
          <label>
            Campaign name
            <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} />
          </label>
          <label>
            Message body
            <textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
          </label>
          <label>
            Recipients, one per line
            <textarea value={recipients} onChange={(event) => setRecipients(event.target.value)} />
          </label>
          <button disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create campaign'}</button>
          {error ? <p className="error">{error}</p> : null}
        </form>

        <section className="panel">
          <div className="section-heading">
            <span>Campaign status</span>
            <strong>{campaign ? `${progress}% complete` : 'Waiting for campaign'}</strong>
          </div>
          {campaign ? (
            <>
              <h2>{campaign.name}</h2>
              <p className="campaign-id">{campaign.id}</p>
              {campaign.company_id ? <p className="campaign-id">Company: {campaign.company_id}</p> : null}
              <div className="progress"><span style={{ width: `${progress}%` }} /></div>
              <div className="stats">
                <Stat label="Queued" value={campaign.status_counts.queued} />
                <Stat label="Sent" value={campaign.status_counts.sent} />
                <Stat label="Failed" value={campaign.status_counts.failed} />
                <Stat label="Retried" value={campaign.status_counts.retried} />
                <Stat label="Dead-lettered" value={campaign.status_counts.dead_lettered} />
              </div>
            </>
          ) : (
            <p className="muted">Submit a campaign to see live status polling.</p>
          )}
        </section>
      </section>

      <section className="panel">
        <div className="section-heading">
          <span>System status</span>
          <button className="secondary" onClick={() => void refreshSystemStatus()}>Refresh checks</button>
        </div>
        <div className="checks">
          {systemChecks.map((check) => (
            <div className={`check ${check.state}`} key={check.path}>
              <strong>{check.label}</strong>
              <span>{check.detail}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
