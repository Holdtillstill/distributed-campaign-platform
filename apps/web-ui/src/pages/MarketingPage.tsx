import { useEffect, useState } from 'react'

import { API_BASE_URL, API_DOCS_URL, responseLooksApiBacked } from '../api/client'

export function MarketingPage({
  onCustomerAccess,
  onInternalAccess,
}: {
  onCustomerAccess: () => void
  onInternalAccess?: () => void
}) {
  const [apiConnected, setApiConnected] = useState(false)

  useEffect(() => {
    let cancelled = false

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
          <a href="#pricing">Pricing</a>
          <button onClick={onCustomerAccess}>
            Customer login
          </button>
          {onInternalAccess ? (
            <button className="ghost" onClick={onInternalAccess}>
              Internal
            </button>
          ) : null}
        </nav>
      </header>

      <section className="marketing-hero" aria-label="CampaignOS campaign control plane">
        <div className="marketing-hero-copy">
          <p className="eyebrow">CampaignOS</p>
          <h1>Orchestrate every customer message before it moves.</h1>
          <p>
            A premium SMS campaign control plane for tenant workspaces, credit-aware scheduling, tracked Smart SMS,
            follow-ups, and live broadcast reporting without spreadsheet reconciliation.
          </p>
          <div className="hero-actions">
            <button onClick={onCustomerAccess}>Customer login</button>
            <a className="docs-link secondary-link" href="/features">
              Feature tour
            </a>
          </div>
          <div className="marketing-tertiary-links" aria-label="Secondary resources">
            <a href="/kb">Knowledge base</a>
            {apiConnected ? (
              <a className="docs-link secondary-link" href={API_DOCS_URL} target="_blank" rel="noreferrer">
                API docs
              </a>
            ) : (
              <span className="docs-link docs-link-static" aria-label="API docs available during runtime demos">
                API docs by request
              </span>
            )}
          </div>
          <div className={apiConnected ? 'api-mode-banner api-mode-live' : 'api-mode-banner'} aria-live="polite">
            <span>{apiConnected ? 'API connected' : 'Static portfolio host'}</span>
            <strong>{apiConnected ? 'Runtime workflows are available.' : 'API demo by request.'}</strong>
          </div>
        </div>

        <div className="campaign-flow-visual" aria-label="CampaignOS live campaign flow preview">
          <div className="flow-orbit flow-orbit-one" aria-hidden="true" />
          <div className="flow-orbit flow-orbit-two" aria-hidden="true" />

          <section className="visual-card visual-card-main" aria-label="Workspace command preview">
            <div className="visual-card-top">
              <span>Demo Retail Co</span>
              <strong>Summer Preview</strong>
            </div>
            <div className="workspace-chips" aria-label="Workspace routing">
              <span>Phoenix VIP</span>
              <span>West Region</span>
              <span>Smart SMS</span>
            </div>
            <div className="broadcast-meter" aria-label="Credit meter">
              <div>
                <span>Credits reserved</span>
                <strong>2,250 / 4.8M</strong>
              </div>
              <i aria-hidden="true" />
            </div>
            <dl className="visual-stats" aria-label="Campaign preview metrics">
              <div>
                <dt>Modeled audience</dt>
                <dd>1.36M</dd>
              </div>
              <div>
                <dt>Sample rows</dt>
                <dd>1,125</dd>
              </div>
              <div>
                <dt>Follow-ups</dt>
                <dd>Ready</dd>
              </div>
            </dl>
          </section>

          <section className="visual-card visual-card-live" aria-label="Live broadcast state">
            <span className="live-dot">Live monitor</span>
            <strong>41.8k/min</strong>
            <p>ETA recalculating as queued messages move through provider outcomes.</p>
            <div className="live-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </section>

          <section className="visual-card visual-card-sms" aria-label="SMS preview">
            <span>SMS preview</span>
            <p>Summer preview starts now. Your VIP early access is open through Friday.</p>
            <small>Tracked link + reminder rule attached</small>
          </section>

          <section className="visual-card visual-card-route" aria-label="Tenant routing">
            <span>Tenant routing</span>
            <strong>Role budget checked</strong>
            <small>Owner to campaign manager to analyst</small>
          </section>
        </div>
      </section>

      <section className="marketing-check-strip" aria-label="Platform operating checks">
        <div>
          <span>Modeled reach</span>
          <strong>2.65M subscribers</strong>
          <p>Production-scale audiences stay readable with representative sample rows.</p>
        </div>
        <div>
          <span>Live ops</span>
          <strong>Broadcast monitor</strong>
          <p>Queue, sent, failed, retry, dead-letter, throughput, and ETA stay visible.</p>
        </div>
        <div>
          <span>Governance</span>
          <strong>Roles + budgets</strong>
          <p>Access codes, role scopes, and credit allocations travel with each user.</p>
        </div>
        <div>
          <span>Readiness</span>
          <strong>TCPA-aware checks</strong>
          <p>Consent, STOP suppression, sender identity, send windows, and audit evidence.</p>
        </div>
      </section>

      <section className="marketing-workflow" id="platform" aria-label="CampaignOS workflow">
        <div className="marketing-section-copy">
          <p className="eyebrow">Platform flow</p>
          <h2>From tenant setup to live reporting, every handoff has context.</h2>
          <p>
            Internal operators issue access, customer teams plan audiences, and CampaignOS keeps budget, readiness, and
            delivery state attached to the work.
          </p>
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
            <p>Regular and Smart SMS estimate sample cost, modeled reach, media requirements, and follow-up readiness.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Monitor and report</h3>
            <p>Operators watch throughput and review honest scheduled, projected, and tracked campaign reporting.</p>
          </article>
        </div>
      </section>

      <section className="marketing-depth" aria-label="Feature and help links">
        <div className="marketing-section-copy">
          <p className="eyebrow">Product depth</p>
          <h2>Built for the daily campaign room, not a static demo.</h2>
          <p>
            CampaignOS connects the public feature tour, customer knowledge base, live monitor, internal admin, and API
            documentation to the same workflow story.
          </p>
        </div>
        <div className="depth-link-grid">
          <a href="/features">
            <span>Feature tour</span>
            <strong>Segments, roles, analytics, compliance readiness</strong>
          </a>
          <a href="/kb">
            <span>Knowledge base</span>
            <strong>Access codes, scheduling, monitor, budgets</strong>
          </a>
          <a href="/monitor">
            <span>Live monitor</span>
            <strong>Throughput and provider outcomes by campaign</strong>
          </a>
          <a href="/internal">
            <span>Internal admin</span>
            <strong>Tenant setup, usage rollups, observability links</strong>
          </a>
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div className="marketing-section-copy">
          <p className="eyebrow">Usage model</p>
          <h2>Simple credits for real campaign economics.</h2>
          <p>Credits make sample sends, Smart SMS enrichment, and budget guardrails visible before scheduling.</p>
        </div>
        <div className="pricing-grid">
          <div>
            <span>Regular SMS</span>
            <strong>1 credit</strong>
            <p>Per sample recipient with modeled reach shown separately.</p>
          </div>
          <div>
            <span>Smart SMS</span>
            <strong>2 credits</strong>
            <p>Includes media, tracked links, and reminder support.</p>
          </div>
          <div>
            <span>Budget guardrails</span>
            <strong>Role aware</strong>
            <p>Company and user-level limits block overspend before campaigns leave the builder.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
