import { API_BASE_URL } from '../api/client'

type ExplorationId = '1' | '2' | '3' | '4' | '5'

export function routeToExploration(pathname: string): ExplorationId | null {
  const match = /^\/([1-5])\/?$/.exec(pathname)
  return match ? (match[1] as ExplorationId) : null
}

const facts = {
  tenant: 'Demo Retail Co',
  modeledSubscribers: '2.65M modeled subscribers',
  monitor: 'broadcast monitor',
  throughput: '41.8k/min',
}

const links = [
  { href: '/app', label: 'Open customer login' },
  { href: '/internal', label: 'Internal console' },
  { href: `${API_BASE_URL}/docs`, label: 'API docs' },
]

function CtaLinks({ tone = 'light' }: { tone?: 'light' | 'dark' | 'studio' | 'data' }) {
  return (
    <div className={`exploration-ctas exploration-ctas-${tone}`}>
      {links.map((link) => (
        <a key={link.href} href={link.href}>
          {link.label}
        </a>
      ))}
    </div>
  )
}

function TrustMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="premium-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

function PremiumFintech() {
  return (
    <main className="exploration exploration-premium">
      <header className="premium-nav">
        <a href="/" aria-label="CampaignOS home">
          CampaignOS
        </a>
        <nav aria-label="Premium exploration navigation">
          <a href="#trust">Trust layer</a>
          <a href="#monitor">Broadcast monitor</a>
          <a href="/app">Sign in</a>
        </nav>
      </header>

      <section className="premium-hero">
        <div className="premium-copy">
          <p className="exploration-kicker">Premium SMS infrastructure for serious retail teams</p>
          <h1>Revenue-grade SMS, modeled before it moves.</h1>
          <p>
            CampaignOS gives customer teams and internal operators one polished SaaS surface for role-based campaign
            control, subscriber intelligence, and audited broadcast delivery.
          </p>
          <CtaLinks />
        </div>
        <figure className="premium-ledger" aria-label="Premium campaign trust ledger">
          <div className="premium-ledger-top">
            <span>{facts.tenant}</span>
            <strong>Enterprise delivery posture</strong>
          </div>
          <div className="premium-balance">
            <span>Audience model</span>
            <strong>{facts.modeledSubscribers}</strong>
          </div>
          <div className="premium-ledger-grid">
            <TrustMetric label="Broadcast state" value="Healthy" detail="0.04% retry pressure" />
            <TrustMetric label="Throughput" value={facts.throughput} detail="Modeled SMS/minute" />
            <TrustMetric label="Observability" value="Tempo + Grafana" detail="Trace smoke checks online" />
            <TrustMetric label="Access model" value="RBAC" detail="Internal and customer roles" />
          </div>
        </figure>
      </section>

      <section className="premium-trust-band" id="trust" aria-label="Premium trust capabilities">
        <div>
          <span>01</span>
          <strong>Credit-aware send authority</strong>
          <p>Budget limits, company credits, and user roles gate campaigns before queue creation.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Subscriber search at scale</strong>
          <p>Filter lists, consent, source, and region with pagination that keeps operators moving.</p>
        </div>
        <div>
          <span>03</span>
          <strong>Executive-ready observability</strong>
          <p>Prometheus metrics, Tempo traces, and Grafana dashboards stay close to the product surface.</p>
        </div>
      </section>

      <section className="premium-monitor" id="monitor" aria-label="Premium broadcast monitor">
        <div>
          <p className="exploration-kicker">Broadcast monitor</p>
          <h2>Every send gets a financial control plane.</h2>
        </div>
        <div className="premium-monitor-card">
          <div className="premium-monitor-row">
            <span>Queued</span>
            <strong>1,360,000</strong>
            <i style={{ width: '82%' }} />
          </div>
          <div className="premium-monitor-row">
            <span>Sent</span>
            <strong>947,300</strong>
            <i style={{ width: '61%' }} />
          </div>
          <div className="premium-monitor-row">
            <span>Retry</span>
            <strong>412</strong>
            <i style={{ width: '12%' }} />
          </div>
        </div>
      </section>
    </main>
  )
}

function OpsStat({ label, value, state }: { label: string; value: string; state: 'ok' | 'warn' | 'cool' }) {
  return (
    <div className={`ops-stat ops-stat-${state}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function DarkCommandCenter() {
  return (
    <main className="exploration exploration-ops">
      <section className="ops-hero">
        <div className="ops-terminal" aria-label="Operator terminal">
          <div className="ops-window-bar">
            <span />
            <span />
            <span />
            <strong>broadcast-monitor.demo-retail</strong>
          </div>
          <div className="ops-log">
            <p>
              <span>12:04:22</span> attach tenant={facts.tenant}
            </p>
            <p>
              <span>12:04:23</span> audience model={facts.modeledSubscribers}
            </p>
            <p>
              <span>12:04:24</span> queue shards=64 throughput={facts.throughput}
            </p>
            <p>
              <span>12:04:25</span> sample_runtime status=green mock_trace=sampled
            </p>
          </div>
        </div>

        <div className="ops-copy">
          <p className="exploration-kicker">Dark operator command center</p>
          <h1>The broadcast floor for SMS operators.</h1>
          <p>
            A serious operations surface for watching throughput, queue pressure, failed sends, and tenant risk while
            customer campaigns keep moving.
          </p>
          <CtaLinks tone="dark" />
        </div>

        <aside className="ops-live-panel" aria-label="Broadcast throughput panel">
          <div className="ops-pulse">
            <span />
            <strong>Runtime</strong>
          </div>
          <div className="ops-throughput">
            <span>Throughput</span>
            <strong>{facts.throughput}</strong>
            <small>{facts.monitor}</small>
          </div>
          <div className="ops-gridline" />
          <div className="ops-stats">
            <OpsStat label="Queued" value="412k" state="cool" />
            <OpsStat label="Failed" value="0.03%" state="ok" />
            <OpsStat label="Retry" value="1,284" state="warn" />
          </div>
        </aside>
      </section>

      <section className="ops-board" aria-label="Operator board">
        {['gateway-a', 'gateway-b', 'gateway-c', 'gateway-d', 'worker-east', 'worker-west'].map((node, index) => (
          <div key={node}>
            <span>{node}</span>
            <strong>{index === 2 ? 'retry-watch' : 'nominal'}</strong>
            <i style={{ height: `${44 + index * 8}px` }} />
          </div>
        ))}
      </section>
    </main>
  )
}

function StoryScene({
  label,
  title,
  copy,
  stat,
}: {
  label: string
  title: string
  copy: string
  stat: string
}) {
  return (
    <section className="story-scene">
      <p>{label}</p>
      <h2>{title}</h2>
      <div>
        <strong>{stat}</strong>
        <span>{copy}</span>
      </div>
    </section>
  )
}

function CinematicStory() {
  return (
    <main className="exploration exploration-story">
      <section className="story-hero">
        <div className="story-marquee" aria-hidden="true">
          <span>model</span>
          <span>queue</span>
          <span>monitor</span>
          <span>trace</span>
        </div>
        <div className="story-copy">
          <p>CampaignOS for {facts.tenant}</p>
          <h1>Millions of messages. One composed release.</h1>
          <CtaLinks tone="dark" />
        </div>
      </section>

      <StoryScene
        label="Act I"
        title="The audience becomes visible."
        stat="2.65M"
        copy="Modeled subscribers are filtered by consent, list, source, and region before the send is allowed to exist."
      />
      <StoryScene
        label="Act II"
        title="The campaign leaves with restraint."
        stat="64"
        copy="Queue partitions pace the broadcast while the broadcast monitor reports sent, retry, and dead-letter state."
      />
      <StoryScene
        label="Act III"
        title="The system explains itself."
        stat="100%"
        copy="Tempo traces, Grafana panels, and API docs keep operators and executives aligned on what happened."
      />
    </main>
  )
}

function StudioTemplate({ name, tone, copy }: { name: string; tone: string; copy: string }) {
  return (
    <article className={`studio-template studio-template-${tone}`} aria-label={name}>
      <span>{tone}</span>
      <strong>{name}</strong>
      <p>{copy}</p>
    </article>
  )
}

function CreativeStudio() {
  return (
    <main className="exploration exploration-studio">
      <header className="studio-nav">
        <a href="/">CampaignOS Studio</a>
        <CtaLinks tone="studio" />
      </header>

      <section className="studio-hero">
        <div className="studio-poster">
          <span>Demo Retail Co</span>
          <strong>SUMMER DROP</strong>
          <p>VIP loyalty preview, double points, tracked links, and timed reminder lift.</p>
        </div>
        <div className="studio-copy">
          <p className="exploration-kicker">Creative campaign studio</p>
          <h1>Build the campaign before the clock starts.</h1>
          <p>
            Give marketers a beautiful place to shape SMS copy, attach media, pick subscriber lists, and preview reach
            before the operations layer takes over.
          </p>
        </div>
        <aside className="studio-phone" aria-label="SMS content preview">
          <div>
            <span>SMS preview</span>
            <strong>Demo Retail Co</strong>
          </div>
          <p>Summer preview is open. Tap for early access and save your favorite looks before Friday.</p>
          <small>{facts.modeledSubscribers} available after filters</small>
        </aside>
      </section>

      <section className="studio-workbench" aria-label="Campaign workbench">
        <div className="studio-workbench-copy">
          <span>Templates</span>
          <strong>Campaigns that still feel composed at scale.</strong>
        </div>
        <div className="studio-template-grid">
          <StudioTemplate
            name="VIP Loyalty Double Points"
            tone="lime"
            copy="Segmented loyalty send with smart SMS tracking and reminder-ready links."
          />
          <StudioTemplate
            name="Weekend Flash Sale MMS"
            tone="coral"
            copy="Media-forward campaign for limited windows, inventory drops, and tracked redemptions."
          />
          <StudioTemplate
            name="Winback Offer"
            tone="ink"
            copy="Filtered subscriber search, campaign status filters, and restrained follow-up pressure."
          />
        </div>
      </section>

      <section className="studio-ribbon" aria-label="Studio product capabilities">
        <span>{facts.monitor}</span>
        <span>campaign filters</span>
        <span>media library</span>
        <span>subscriber pagination</span>
      </section>
    </main>
  )
}

function HeatCell({ intensity }: { intensity: 1 | 2 | 3 | 4 | 5 }) {
  return <span className={`data-heat-cell data-heat-${intensity}`} />
}

function EnterpriseControlRoom() {
  const heat = [2, 4, 5, 3, 1, 4, 3, 5, 2, 2, 4, 5, 3, 1, 5, 4, 2, 3, 5, 4]

  return (
    <main className="exploration exploration-data">
      <header className="data-header">
        <div>
          <span>Enterprise data control room</span>
          <h1>Command every tenant, risk, and broadcast.</h1>
        </div>
        <CtaLinks tone="data" />
      </header>

      <section className="data-console" aria-label="Enterprise control room dashboard">
        <div className="data-exec-strip">
          <div>
            <span>Modeled subscribers</span>
            <strong>2,650,000</strong>
            <small>{facts.tenant}</small>
          </div>
          <div>
            <span>Scheduled reach</span>
            <strong>1,360,000</strong>
            <small>Next 30 days</small>
          </div>
          <div>
            <span>Broadcast status</span>
            <strong>Runtime</strong>
            <small>{facts.monitor}</small>
          </div>
          <div>
            <span>Observability</span>
            <strong>Tempo/Grafana</strong>
            <small>Trace smoke passing</small>
          </div>
        </div>

        <div className="data-main-grid">
          <section className="data-risk-map" aria-label="Tenant risk heatmap">
            <div className="data-panel-title">
              <span>Tenant risk</span>
              <strong>Quota and retry pressure</strong>
            </div>
            <div className="data-heatmap">
              {heat.map((intensity, index) => (
                <HeatCell key={`${intensity}-${index}`} intensity={intensity as 1 | 2 | 3 | 4 | 5} />
              ))}
            </div>
            <div className="data-risk-legend" aria-label="Tenant risk legend">
              <span><i className="data-heat-1" /> low</span>
              <span><i className="data-heat-3" /> watch</span>
              <span><i className="data-heat-5" /> urgent</span>
            </div>
          </section>

          <section className="data-broadcast-table" aria-label="Broadcast monitor table">
            <div className="data-panel-title">
              <span>Broadcast monitor</span>
              <strong>Active campaigns</strong>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Campaign</th>
                  <th>Sent</th>
                  <th>Retry</th>
                  <th>ETA</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Demo Retail Co</td>
                  <td>Summer Preview</td>
                  <td>947k</td>
                  <td>412</td>
                  <td>18m</td>
                </tr>
                <tr>
                  <td>Acme Retail</td>
                  <td>Memorial Day Promo</td>
                  <td>250k</td>
                  <td>0</td>
                  <td>done</td>
                </tr>
                <tr>
                  <td>North Market</td>
                  <td>Winback Offer</td>
                  <td>83k</td>
                  <td>28</td>
                  <td>6m</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="data-observe" aria-label="Observability status">
            <div className="data-panel-title">
              <span>Observability</span>
              <strong>Production signals</strong>
            </div>
            <div className="data-signal-list">
              <p>
                <span>Prometheus scrape</span>
                <strong>OK</strong>
              </p>
              <p>
                <span>Tempo trace smoke</span>
                <strong>OK</strong>
              </p>
              <p>
                <span>Grafana send board</span>
                <strong>online</strong>
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

export function DesignExploration({ id }: { id: ExplorationId }) {
  if (id === '1') return <PremiumFintech />
  if (id === '2') return <DarkCommandCenter />
  if (id === '3') return <CinematicStory />
  if (id === '4') return <CreativeStudio />
  return <EnterpriseControlRoom />
}
