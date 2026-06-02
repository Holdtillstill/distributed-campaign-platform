const marketingExplorations = ['/1', '/2', '/3', '/4', '/5']
const appExplorations = Array.from({ length: 10 }, (_, index) => `/app-designs/${index + 1}`)
const productionRoutes = ['/app', '/monitor', '/internal', '/kb', '/features']

const recommendations = [
  {
    surface: 'Customer login / workspace',
    route: '/app',
    direction: '/app-designs/6 Minimal Enterprise Workspace',
    reason: 'Calm role-aware workspace with budget posture, audience readiness, reporting, and next actions.',
  },
  {
    surface: 'Broadcast monitor',
    route: '/monitor',
    direction: '/app-designs/7 Realtime Broadcast War Room',
    reason: 'Operational surface for queue, sent, failed, retry, dead-letter, throughput, ETA, and refresh state.',
  },
  {
    surface: 'Internal admin',
    route: '/internal',
    direction: '/app-designs/10 Agency Multi-tenant Console',
    reason: 'Cross-tenant scanability for health, quotas, access-code handoff, and operator decisions.',
  },
  {
    surface: 'KB and features',
    route: '/kb',
    secondaryRoute: '/features',
    direction: 'Current Intercom-like public support surfaces',
    reason: 'Approachable customer education and product details stay available outside the authenticated shell.',
  },
]

function LinkList({ label, routes }: { label: string; routes: string[] }) {
  return (
    <section className="design-review-link-group" aria-label={label}>
      <div className="section-heading">
        <span>Review</span>
        <strong>{label}</strong>
      </div>
      <div>
        {routes.map((route) => (
          <a href={route} key={route}>
            {route}
          </a>
        ))}
      </div>
    </section>
  )
}

export function DesignReviewPage() {
  return (
    <main className="design-review-page">
      <header className="design-review-hero">
        <nav aria-label="Design review navigation">
          <a href="/app">Customer login</a>
          <a href="/monitor">Monitor</a>
          <a href="/internal">Internal</a>
          <a href="/features">Features</a>
          <a href="/kb">KB</a>
        </nav>
        <p className="eyebrow">Research-backed design direction</p>
        <h1>Recommended production composition</h1>
        <p>
          CampaignOS should use a composite direction: enterprise command surface for everyday customer work,
          war-room clarity for runtime broadcasts, and agency-style scanability for internal tenant operations.
        </p>
      </header>

      <section className="design-review-recommendations" aria-label="Recommended composition">
        {recommendations.map((item) => (
          <article key={item.surface}>
            <span>{item.surface}</span>
            <h2>{item.direction}</h2>
            <p>{item.reason}</p>
            <a href={item.route}>Open {item.route}</a>
            {'secondaryRoute' in item ? <a href={item.secondaryRoute}>Open {item.secondaryRoute}</a> : null}
          </article>
        ))}
      </section>

      <section className="design-review-rationale" aria-label="Research rationale">
        <div>
          <span>Product signals</span>
          <strong>Activation, orchestration, delivery, and reporting.</strong>
        </div>
        <p>
          The customer workspace follows customer-engagement patterns around segments, campaigns, journeys, budget,
          and analytics. The monitor follows messaging-platform patterns around deliverability, throughput, retries,
          and troubleshooting. Internal admin follows multi-tenant operations patterns around health, quotas, access
          codes, and handoff.
        </p>
      </section>

      <div className="design-review-links">
        <LinkList label="Production routes" routes={productionRoutes} />
        <LinkList label="Marketing explorations" routes={marketingExplorations} />
        <LinkList label="App design explorations" routes={appExplorations} />
      </div>
    </main>
  )
}
