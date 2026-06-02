type FeatureSlug =
  | 'broadcast-monitor'
  | 'audience-segments'
  | 'role-based-access'
  | 'analytics'
  | 'compliance'

type FeatureSpotlight = {
  slug: FeatureSlug
  kicker: string
  title: string
  summary: string
  note: string
  bullets: string[]
  ctaHref: string
  ctaLabel: string
}

const featureSpotlights: FeatureSpotlight[] = [
  {
    slug: 'broadcast-monitor',
    kicker: 'Runtime operations',
    title: 'Broadcast monitor',
    summary:
      'Track queued, sent, failed, retried, and dead-lettered messages with throughput, progress, and projected ETA.',
    note: 'Monitor projected/sample broadcasts before the full modeled audience is moved.',
    bullets: ['Messages per minute and per second', 'Projected completion and ETA', 'Provider outcome counters'],
    ctaHref: '/monitor',
    ctaLabel: 'Open customer login',
  },
  {
    slug: 'audience-segments',
    kicker: 'Audience scale',
    title: 'Subscriber segments and modeled audiences',
    summary:
      'Plan campaigns against regional lists, sample subscriber rows, and modeled reach without loading millions of rows into the browser.',
    note: 'Demo Retail Co carries 2.65M modeled subscribers with representative local sample rows.',
    bullets: ['Segment cards by list', 'Consent-aware subscriber directory', 'CSV import for sample data'],
    ctaHref: '/app',
    ctaLabel: 'Open customer login',
  },
  {
    slug: 'role-based-access',
    kicker: 'Team controls',
    title: 'Role-based access, invites, and budgets',
    summary:
      'Company owners can issue access codes, assign roles, and set per-user credit allocations for campaign work.',
    note: 'Settings exposes company admin, campaign manager, regional manager, analyst, and viewer guardrails.',
    bullets: ['Invite codes carry role and budget', 'Read-only roles keep operations disabled', 'Budget context follows the user'],
    ctaHref: '/app',
    ctaLabel: 'Open customer login',
  },
  {
    slug: 'analytics',
    kicker: 'Reporting',
    title: 'Analytics and campaign reporting',
    summary:
      'Review scheduled reach, campaign volume, Smart SMS clicks, offer redemptions, follow-ups, and credit usage in one workspace.',
    note: 'Analytics combines campaign history, tracked links, redemptions, and quota usage from workspace APIs.',
    bullets: ['Campaign performance table', 'Tracked link and redemption totals', 'Quota and message activity'],
    ctaHref: '/app',
    ctaLabel: 'Open customer login',
  },
  {
    slug: 'compliance',
    kicker: 'Governance',
    title: 'TCPA-aware compliance readiness',
    summary:
      'Keep consent evidence, opt-out readiness, suppression, sender identity, audience source, and send-window checks visible before teams schedule SMS sends.',
    note: 'Built for TCPA-aware readiness, not a legal compliance guarantee.',
    bullets: [
      'Prior express written consent and audience source review',
      'STOP opt-out, suppression, and revocation checks',
      'Quiet hours, sender identity, approvals, and audit evidence',
    ],
    ctaHref: '/kb',
    ctaLabel: 'Read compliance guide',
  },
]

const capabilityRows = [
  {
    label: 'Campaign builder and scheduling',
    value: 'Segment picks, Smart SMS media, scheduling, credit estimates',
  },
  {
    label: 'Campaign filters',
    value: 'Search, status, and scheduled/created date filters for active history',
  },
  {
    label: 'Customer settings',
    value: 'Team controls, invite codes, roles, and regional credit budgets',
  },
  {
    label: 'Internal admin',
    value: 'Tenant creation, health review, usage rollups, and access-code visibility',
  },
  {
    label: 'Observability',
    value: 'Grafana dashboards, Tempo traces, Prometheus metrics, Loki log collection',
  },
]

function getSpotlight(slug?: string): FeatureSpotlight | null {
  return featureSpotlights.find((feature) => feature.slug === slug) ?? null
}

export function FeatureMarketingPage({ activeSlug }: { activeSlug?: string }) {
  const activeFeature = getSpotlight(activeSlug)
  const orderedFeatures = activeFeature
    ? [activeFeature, ...featureSpotlights.filter((feature) => feature.slug !== activeFeature.slug)]
    : featureSpotlights

  return (
    <main className="public-product-page feature-marketing">
      <header className="public-product-nav">
        <a className="public-brand" href="/">
          CampaignOS
        </a>
        <nav aria-label="Feature navigation">
          <a href="/features">Features</a>
          <a href="/kb">Knowledge base</a>
          <a href="/app">Customer login</a>
          <a href="/internal">Internal admin</a>
        </nav>
      </header>

      <section className="feature-hero">
        <div className="feature-hero-copy">
          <p className="eyebrow">{activeFeature ? 'Feature deep dive' : 'Campaign platform'}</p>
          <h1>{activeFeature ? activeFeature.title : 'CampaignOS features'}</h1>
          <p>
            Multi-tenant SMS campaign software for customer teams that need modeled audience planning, broadcast
            throughput visibility, controlled budgets, and tenant operations in one demo-ready product.
          </p>
          <div className="hero-actions">
            <a className="docs-link" href="/app">
              Open customer login
            </a>
            <a className="docs-link secondary-link" href="/kb">
              Read knowledge base
            </a>
          </div>
        </div>

        <aside className="feature-command-center" aria-label="CampaignOS capability snapshot">
          <div className="command-topline">
            <span>Demo Retail Co</span>
            <strong>2.65M modeled subscribers</strong>
          </div>
          <div className="command-progress">
            <span>Summer Preview</span>
            <strong>41.8k/min</strong>
            <i aria-hidden="true" />
          </div>
          <dl>
            <div>
              <dt>Queued</dt>
              <dd>1,125</dd>
            </div>
            <div>
              <dt>Sent</dt>
              <dd>980</dd>
            </div>
            <div>
              <dt>Credit guardrail</dt>
              <dd>Enabled</dd>
            </div>
            <div>
              <dt>Observability</dt>
              <dd>Grafana + Tempo</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="feature-check-band" aria-label="Platform operating checks">
        <div>
          <span>Modeled reach</span>
          <strong>2,650,000</strong>
          <p>Subscriber segments can represent production-scale audiences while demo rows stay small.</p>
        </div>
        <div>
          <span>Operations</span>
          <strong>Projected ETA</strong>
          <p>Broadcast monitor exposes progress, throughput, retry pressure, and failed rows.</p>
        </div>
        <div>
          <span>Governance</span>
          <strong>Roles + budgets</strong>
          <p>Access codes, permissions, and credit allocations travel with every invited user.</p>
        </div>
      </section>

      {activeFeature?.slug === 'compliance' ? (
        <section className="feature-compliance-readiness" aria-label="TCPA compliance-readiness details">
          <div>
            <p className="eyebrow">Compliance readiness</p>
            <h2>TCPA-aware controls need evidence, suppression, and operational enforcement.</h2>
            <p>
              CampaignOS can surface prior express written consent, opt-out/STOP status, suppression or revocation
              state, quiet hours, send windows, sender identity, approval history, and audience source before a send.
            </p>
          </div>
          <aside>
            <strong>Production caveat</strong>
            <p>
              This demo is not legal compliance. Real senders need legal review, carrier and CTIA policy alignment,
              and backend enforcement for consent, suppression, and send-window rules.
            </p>
          </aside>
        </section>
      ) : null}

      <section className="feature-index" aria-label="Feature overview">
        <div className="feature-section-heading">
          <p className="eyebrow">Capability map</p>
          <h2>Built around the real customer workflow.</h2>
        </div>
        <div className="feature-index-grid">
          {orderedFeatures.map((feature) => (
            <article className={feature.slug === activeFeature?.slug ? 'feature-card active' : 'feature-card'} key={feature.slug}>
              <span>{feature.kicker}</span>
              <h3>{feature.title}</h3>
              <p>{feature.summary}</p>
              <strong>{feature.note}</strong>
              <ul>
                {feature.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <div className="feature-card-actions">
                <a href={`/features/${feature.slug}`}>Feature details</a>
                <a href={feature.ctaHref}>{feature.ctaLabel}</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-depth" aria-label="Product depth">
        <div>
          <p className="eyebrow">Product depth</p>
          <h2>Campaign planning, admin controls, and platform visibility.</h2>
          <p>
            The demo is not just a landing page. Customer teams can sign in, create campaigns, schedule sends,
            filter campaign history, monitor throughput, invite teammates, and review analytics. Internal admins can
            manage tenants and inspect usage health.
          </p>
          <div className="hero-actions">
            <a className="docs-link" href="/internal">
              Open internal admin
            </a>
          </div>
        </div>
        <ul className="capability-list">
          {capabilityRows.map((row) => (
            <li key={row.label}>
              <strong>{row.label}</strong>
              <span>{row.value}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
