import { useEffect, useState } from 'react'

import { API_BASE_URL, API_DOCS_URL, isStaticPortfolioHost, responseLooksApiBacked } from '../api/client'

export function MarketingPage({
  onCustomerAccess,
  onInternalAccess,
}: {
  onCustomerAccess: () => void
  onInternalAccess?: () => void
}) {
  const [apiConnected, setApiConnected] = useState(() => !isStaticPortfolioHost())
  const staticPortfolioHost = isStaticPortfolioHost()
  const requestOnly = staticPortfolioHost || !apiConnected

  useEffect(() => {
    let cancelled = false

    if (isStaticPortfolioHost()) {
      setApiConnected(false)
      return
    }

    fetch(`${API_BASE_URL}/readyz`, { cache: 'no-store' })
      .then((response) => {
        if (!cancelled) setApiConnected(responseLooksApiBacked(response))
      })
      .catch(() => {
        if (!cancelled) setApiConnected(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="marketing-site">
      <header className="marketing-nav">
        <strong>
          <span aria-hidden="true" />
          CampaignOS
        </strong>
        <nav aria-label="Public navigation">
          <a href="#platform">Platform</a>
          <a href="/features">Features</a>
          <a href="/kb">Knowledge base</a>
          <a href="https://bozhi.dev/privacy.html">Privacy</a>
          {requestOnly ? <a className="nav-cta" href="/app">Open workspace</a> : <button onClick={onCustomerAccess}>Customer login</button>}
          {onInternalAccess ? (
            <button className="ghost" onClick={onInternalAccess}>
              Internal
            </button>
          ) : null}
        </nav>
      </header>

      <section className="marketing-hero" aria-label="CampaignOS campaign control plane">
        <div className="marketing-hero-copy">
          <p className="eyebrow">CampaignOS workspace</p>
          <h1>CampaignOS</h1>
          <p>Campaign builder, media library, broadcast monitor, tenant admin, and role-aware budgets in one v2 command surface.</p>
          <div className="hero-actions">
            {requestOnly ? <a className="docs-link" href="/app">Open workspace</a> : <button onClick={onCustomerAccess}>Customer login</button>}
            <a className="docs-link secondary-link" href="/features">
              Feature map
            </a>
          </div>
          <div className="marketing-tertiary-links" aria-label="Secondary resources">
            <a href="/kb">Knowledge base</a>
            <a href="/features/broadcast-monitor">Broadcast monitor</a>
            {apiConnected ? (
              <a className="docs-link secondary-link" href={API_DOCS_URL} target="_blank" rel="noreferrer">
                API docs
              </a>
            ) : (
              <span className="docs-link docs-link-static" aria-label="API docs unavailable on the public host">
                API docs offline
              </span>
            )}
          </div>
          <div className={apiConnected ? 'api-mode-banner api-mode-live' : 'api-mode-banner'} aria-live="polite">
            <span>{apiConnected ? 'API connected' : 'Public preview'}</span>
            <strong>{apiConnected ? 'Workflows are available.' : 'Workspace is open.'}</strong>
          </div>
        </div>

        <div className="campaign-flow-visual" aria-label="CampaignOS campaign flow preview">
          <section className="visual-card visual-card-main" aria-label="Workspace command preview">
            <div className="visual-card-top">
              <span>Next scheduled send</span>
              <strong>Seattle VIP Double Points</strong>
            </div>
            <div className="workspace-chips" aria-label="Workspace routing">
              <span>Demo Retail Co</span>
              <span>Customer Company Admin</span>
              <span>All Markets</span>
            </div>
            <div className="broadcast-meter" aria-label="Credit meter">
              <div>
                <span>Monthly send quota</span>
                <strong>2,250 / 4,800,000</strong>
              </div>
              <i aria-hidden="true" />
            </div>
            <dl className="visual-stats" aria-label="Campaign preview metrics">
              <div>
                <dt>Modeled reach</dt>
                <dd>2.65M</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>Scheduled</dd>
              </div>
              <div>
                <dt>Clicks</dt>
                <dd>41,820</dd>
              </div>
            </dl>
          </section>

          <section className="visual-card visual-card-live" aria-label="Broadcast monitor state">
            <span>Broadcast monitor</span>
            <strong>35%</strong>
            <p>Spring Clearance live with sent, queued, failed, and ETA signals.</p>
            <div className="live-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </section>

          <section className="visual-card visual-card-sms" aria-label="SMS preview">
            <span>MMS preview</span>
            <p>Double points open Friday. Tap for your VIP preview pass.</p>
            <small>Media asset, tracked link, and reminder rule attached</small>
          </section>

          <section className="visual-card visual-card-route" aria-label="Tenant routing">
            <span>Access</span>
            <strong>Scope locked to customer company</strong>
            <small>SaaS internal admin stays separate</small>
          </section>
        </div>
      </section>

      <section className="marketing-check-strip" aria-label="Platform operating checks">
        <div>
          <span>Audience</span>
          <strong>2.65M subscribers</strong>
          <p>Modeled reach and sample rows stay explicit.</p>
        </div>
        <div>
          <span>Send flow</span>
          <strong>Broadcast monitor</strong>
          <p>Audience, message, media, schedule, and review.</p>
        </div>
        <div>
          <span>Access</span>
          <strong>Roles + budgets</strong>
          <p>Access codes carry role, expiry, and credit scope.</p>
        </div>
        <div>
          <span>Operations</span>
          <strong>Internal admin</strong>
          <p>Tenant health, usage, handoff, and observability links.</p>
        </div>
      </section>

      <section className="marketing-workflow" id="platform" aria-label="CampaignOS workflow">
        <div className="marketing-section-copy">
          <p className="eyebrow">Platform flow</p>
          <h2>Tenant setup to live monitor.</h2>
          <p>Internal operators create customers. Customer teams plan, schedule, monitor, and report without crossing company scope.</p>
        </div>
        <div className="workflow-lane">
          <article>
            <span>01</span>
            <h3>Tenant setup</h3>
            <p>Create a workspace, assign contract credits, and hand off the first customer admin access code.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Customer login</h3>
            <p>Invited teams enter a role-aware workspace for subscribers, campaigns, media, analytics, and settings.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Credit-aware send</h3>
            <p>Regular and Smart SMS estimate sample cost, modeled reach, media, and follow-up readiness.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Monitor and report</h3>
            <p>Operators watch throughput, failures, retries, and campaign reporting.</p>
          </article>
        </div>
      </section>

      <section className="marketing-depth" aria-label="Feature and help links">
        <div className="marketing-section-copy">
          <p className="eyebrow">Routes</p>
          <h2>Public routes echo the workspace.</h2>
          <p>Feature notes, help articles, app routes, and admin routes now share the same v2 operating language.</p>
        </div>
        <div className="depth-link-grid">
          <a href="/features">
            <span>Feature map</span>
            <strong>Segments, roles, analytics, compliance readiness</strong>
          </a>
          <a href="/kb">
            <span>Knowledge base</span>
            <strong>Access codes, scheduling, monitor, budgets</strong>
          </a>
          <a href="/monitor">
            <span>Broadcast monitor</span>
            <strong>Throughput and provider outcomes by campaign</strong>
          </a>
          <a href="/internal">
            <span>Internal admin</span>
            <strong>Tenant setup, usage rollups, observability links</strong>
          </a>
        </div>
      </section>

      <section className="pricing-section" id="runtime">
        <div className="marketing-section-copy">
          <p className="eyebrow">Boundary</p>
          <h2>Preview routes. API actions run locally.</h2>
          <p>Public routes stay open. Dispatch behavior uses the local stack.</p>
        </div>
        <div className="pricing-grid">
          <div>
            <span>Public host</span>
            <strong>Static UI</strong>
            <p>Marketing, features, help, and workspace preview remain available.</p>
          </div>
          <div>
            <span>Local stack</span>
            <strong>API-backed</strong>
            <p>Workspace login, campaign data, monitor, content, and admin views.</p>
          </div>
          <div>
            <span>Provider</span>
            <strong>Simulator</strong>
            <p>No paid messaging provider is called from the public demo.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
