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
  name: string
  message_count?: number
  status_counts: StatusCounts
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

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const recipientList = recipients
      .split(/\n|,/)
      .map((recipient) => recipient.trim())
      .filter(Boolean)

    try {
      const response = await fetch(`${API_BASE_URL}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: campaignName, body: messageBody, recipients: recipientList }),
      })

      if (!response.ok) throw new Error(`Create campaign failed: ${response.status}`)
      setCampaign(await response.json())
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
