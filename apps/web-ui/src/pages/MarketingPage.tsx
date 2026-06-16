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
    <main className="campaignos-redesign dark marketing-site marketing-site-v2">
      <header className="marketing-nav">
        <a className="marketing-brand" href="/" aria-label="CampaignOS home">
          <span aria-hidden="true" />
          CampaignOS
        </a>
        <nav aria-label="Public navigation">
          <a href="#platform">Platform</a>
          <a href="/features">Features</a>
          <a href="/kb">Knowledge base</a>
          <a href="https://bozhi.dev/privacy.html">Privacy</a>
          {requestOnly ? <a className="nav-cta" href="/app">Open workspace</a> : <button onClick={onCustomerAccess}>Customer login</button>}
          <a
            className="operator-demo-link"
            href="/internal"
            onClick={(event) => {
              if (!onInternalAccess) return
              event.preventDefault()
              onInternalAccess()
            }}
          >
            SaaS admin demo
          </a>
        </nav>
      </header>

      <section className="marketing-hero" aria-label="CampaignOS campaign control plane">
        <div className="marketing-hero-copy">
          <p className="eyebrow">Messaging operations workspace</p>
          <h1>CampaignOS</h1>
          <p>Campaign builder, media library, broadcast monitor, tenant admin, and role-aware budgets in one UI.</p>
          <div className="hero-actions">
            {requestOnly ? <a className="docs-link" href="/app">Open workspace</a> : <button onClick={onCustomerAccess}>Customer login</button>}
            <a
              className="docs-link secondary-link"
              href="/internal"
              onClick={(event) => {
                if (!onInternalAccess) return
                event.preventDefault()
                onInternalAccess()
              }}
            >
              SaaS admin demo
            </a>
          </div>
          <div className="marketing-tertiary-links" aria-label="Secondary resources">
            <a href="/features">Feature map</a>
            <a href="/kb">Knowledge base</a>
            <a href="/features/broadcast-monitor">Broadcast monitor</a>
            {apiConnected ? (
              <a className="docs-link secondary-link" href={API_DOCS_URL} target="_blank" rel="noreferrer">
                API docs
              </a>
            ) : (
              <a className="docs-link secondary-link" href="/features">
                Product tour
              </a>
            )}
          </div>
          <div className={apiConnected ? 'api-mode-banner api-mode-live' : 'api-mode-banner'} aria-live="polite">
            <span>{apiConnected ? 'Workspace online' : 'Demo workspace'}</span>
            <strong>{apiConnected ? 'Ready for live workflows.' : 'Create or open a company.'}</strong>
          </div>
          <dl className="landing-hero-facts" aria-label="Public demo summary">
            <div>
              <dt>Demo tenant</dt>
              <dd>Demo Retail Co</dd>
            </div>
            <div>
              <dt>Subscribers</dt>
              <dd>2.65M</dd>
            </div>
            <div>
              <dt>Credits</dt>
              <dd>4.8M</dd>
            </div>
          </dl>
        </div>

        <div className="campaign-flow-visual" aria-label="CampaignOS campaign flow preview">
          <div className="landing-console-topbar" aria-label="Workspace context">
            <span>Demo Retail Co</span>
            <strong>Customer Company Admin</strong>
            <span>All Markets</span>
          </div>

          <section className="landing-send-card" aria-label="Next scheduled campaign">
            <span className="landing-send-icon" aria-hidden="true" />
            <div>
              <span>Next scheduled send</span>
              <strong>Seattle VIP Double Points</strong>
              <p>
                Jun 15, 2026 - 10:00 AM <code>2,650,000 reach</code> <code>950 sample msgs</code>
              </p>
            </div>
            <div className="landing-send-actions">
              <span>Scheduled</span>
              <a href="/app">View campaigns</a>
            </div>
          </section>

          <div className="landing-metric-row" aria-label="Workspace metrics">
            <article>
              <span>Subscribers</span>
              <strong>2.65M</strong>
              <p>All lists</p>
              <small>+12.4% MoM</small>
            </article>
            <article>
              <span>Active campaigns</span>
              <strong>3</strong>
              <p>2 scheduled - 1 queued</p>
            </article>
            <article>
              <span>Credits remaining</span>
              <strong>4,797,750</strong>
              <p>of 4,800,000</p>
            </article>
          </div>

          <div className="landing-console-grid">
            <section className="landing-quota-card" aria-label="Monthly send quota">
              <div className="landing-panel-heading">
                <span>Monthly send quota</span>
                <strong>Jun 2026</strong>
              </div>
              <div className="broadcast-meter" aria-label="Credit meter">
                <div>
                  <span>Messages sent</span>
                  <strong>2,250 / 4,800,000</strong>
                </div>
                <i aria-hidden="true" />
              </div>
              <dl className="visual-stats" aria-label="Campaign preview metrics">
                <div>
                  <dt>Used</dt>
                  <dd>2,250</dd>
                </div>
                <div>
                  <dt>Modeled reach</dt>
                  <dd>2,650,000</dd>
                </div>
                <div>
                  <dt>Limit</dt>
                  <dd>4,800,000</dd>
                </div>
              </dl>
            </section>

            <section className="visual-card-live" aria-label="Broadcast monitor state">
              <div className="landing-panel-heading">
                <span>Broadcast monitor</span>
                <strong>Live</strong>
              </div>
              <p>Spring Clearance</p>
              <strong>35%</strong>
              <div className="live-bars" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <dl className="landing-monitor-stats">
                <div>
                  <dt>Sent</dt>
                  <dd>330</dd>
                </div>
                <div>
                  <dt>Queued</dt>
                  <dd>620</dd>
                </div>
                <div>
                  <dt>Failed</dt>
                  <dd>0</dd>
                </div>
              </dl>
            </section>
          </div>

          <div className="landing-console-lower">
            <section className="visual-card-sms" aria-label="SMS preview">
              <span>SMS preview</span>
              <p>Double points open Friday. Tap for your VIP preview pass.</p>
              <small>Tracked link + reminder rule attached</small>
            </section>

            <section className="visual-card-route" aria-label="Tenant routing">
              <span>Access</span>
              <strong>Role budget checked</strong>
              <small>Owner, manager, analyst, viewer</small>
            </section>
          </div>
        </div>
      </section>

      <section className="marketing-check-strip" aria-label="Platform operating checks">
        <div>
          <span>Modeled reach</span>
          <strong>2.65M subscribers</strong>
          <p>Plan sends against full lists while reviewing a practical sample.</p>
        </div>
        <div>
          <span>Builder</span>
          <strong>Broadcast monitor</strong>
          <p>Audience, message, media, schedule, and estimate.</p>
        </div>
        <div>
          <span>Access</span>
          <strong>Roles + budgets</strong>
          <p>Access codes carry role and credit scope.</p>
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
          <h2>Tenant setup to broadcast review.</h2>
          <p>Internal operators create customers. Customer teams plan, schedule, monitor, and report.</p>
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
          <p className="eyebrow">Workspace</p>
          <h2>Every role has a clear starting point.</h2>
          <p>Customer teams, company admins, and internal operators each land where their work starts.</p>
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
            <strong>Throughput and delivery outcomes by campaign</strong>
          </a>
          <a href="/internal">
            <span>Internal admin</span>
            <strong>Tenant setup, usage rollups, observability links</strong>
          </a>
        </div>
      </section>

      <section className="pricing-section" id="runtime">
        <div className="marketing-section-copy">
          <p className="eyebrow">Get started</p>
          <h2>Open a customer workspace or create one.</h2>
          <p>Use the seeded retailer, join with an access code, or set up a new customer company.</p>
        </div>
        <div className="pricing-grid">
          <div>
            <span>Customer teams</span>
            <strong>Plan campaigns</strong>
            <p>Build audiences, schedule SMS/MMS, monitor sends, and review performance.</p>
          </div>
          <div>
            <span>Company admins</span>
            <strong>Manage access</strong>
            <p>Invite teammates, issue access codes, assign budgets, and keep consent settings current.</p>
          </div>
          <div>
            <span>Internal admins</span>
            <strong>Run the platform</strong>
            <p>Create customer companies, adjust limits, review usage, and check tenant health.</p>
            <a
              href="/internal"
              onClick={(event) => {
                if (!onInternalAccess) return
                event.preventDefault()
                onInternalAccess()
              }}
            >
              Open SaaS admin demo
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
