import { useMemo, useState } from 'react'

type KbArticle = {
  id: string
  category: string
  title: string
  summary: string
  steps: string[]
  links: { label: string; href: string }[]
}

const kbArticles: KbArticle[] = [
  {
    id: 'getting-started',
    category: 'Setup',
    title: 'Getting started with Demo Retail Co',
    summary:
      'Use the demo workspace to explore modeled audiences, campaign planning, broadcast monitoring, and reporting.',
    steps: [
      'Open the customer app and sign in as an invited user.',
      'Use Demo Retail Co to inspect the 2.65M modeled subscriber setup.',
      'Review dashboard quotas, campaigns, subscribers, content, analytics, and settings.',
    ],
    links: [
      { label: 'Open customer app', href: '/app' },
      { label: 'View features', href: '/features' },
    ],
  },
  {
    id: 'invite-access-code-sign-in',
    category: 'Setup',
    title: 'Sign in with an invite or access code',
    summary:
      'Existing users look up memberships by email. New teammates join with a role-specific access code.',
    steps: [
      'Existing Demo Retail users can look up owner@demo-retail.test.',
      'New invited users can join with access code DEMORETA-E568C9.',
      'The returned membership includes company, role, and any user credit allocation.',
    ],
    links: [{ label: 'Open sign-in', href: '/app' }],
  },
  {
    id: 'roles-permissions',
    category: 'Team',
    title: 'Roles, permissions, and budget allocations',
    summary:
      'Customer admins control who can create campaigns, manage subscribers, view analytics, and spend credits.',
    steps: [
      'Company admins have full workspace control.',
      'Campaign managers can build and schedule sends within their budget.',
      'Analyst and viewer roles keep operational actions disabled while reporting stays available.',
    ],
    links: [
      { label: 'Open settings', href: '/app' },
      { label: 'Role feature page', href: '/features/role-based-access' },
    ],
  },
  {
    id: 'inviting-teammates',
    category: 'Team',
    title: 'Invite teammates from Settings',
    summary:
      'Generate access codes for teammates and assign the role and credit limit they should receive on join.',
    steps: [
      'Go to Settings in the customer workspace.',
      'Choose an invite role such as campaign manager or regional manager.',
      'Set a user credit limit and share the generated access code with the teammate.',
    ],
    links: [{ label: 'Open customer app', href: '/app' }],
  },
  {
    id: 'budgets-credits',
    category: 'Finance',
    title: 'Understand budgets and credits',
    summary:
      'CampaignOS models company contract credits and optional user allocations before a campaign is scheduled.',
    steps: [
      'Regular SMS costs 1 credit per sample recipient.',
      'Smart SMS costs 2 credits and can include media, tracked links, and reminders.',
      'The builder shows sample cost and modeled full-audience cost before scheduling.',
    ],
    links: [{ label: 'Open campaign builder', href: '/app' }],
  },
  {
    id: 'creating-scheduling-campaigns',
    category: 'Campaigns',
    title: 'Create and schedule a campaign',
    summary:
      'Build a campaign from segments or direct sample subscribers, choose SMS type, attach Smart SMS media, and schedule.',
    steps: [
      'Choose Campaigns, then Builder.',
      'Select subscriber segments or direct sample rows.',
      'Review modeled audience, sample count, credit cost, and scheduled time before submitting.',
    ],
    links: [
      { label: 'Open customer app', href: '/app' },
      { label: 'Feature overview', href: '/features' },
    ],
  },
  {
    id: 'live-broadcast-monitor-throughput',
    category: 'Campaigns',
    title: 'Monitor broadcast throughput live',
    summary:
      'Use the live monitor to validate throughput, percent complete, ETA, provider outcomes, retries, and dead letters.',
    steps: [
      'Open /monitor or Campaigns -> Monitor after a campaign exists.',
      'Select the campaign and refresh to pull the latest broadcast monitor state.',
      'Review queued, sent, failed, retried, and dead-lettered rows before escalating delivery issues.',
    ],
    links: [
      { label: 'Open broadcast monitor', href: '/monitor' },
      { label: 'Monitor feature page', href: '/features/broadcast-monitor' },
    ],
  },
  {
    id: 'subscriber-segments-modeled-audiences',
    category: 'Audience',
    title: 'Build subscriber segments and modeled audiences',
    summary:
      'Use lists, CSV import, direct subscriber search, and consent filters to represent large subscriber universes.',
    steps: [
      'Subscriber lists can carry modeled counts such as 250,000 or 2,650,000 subscribers.',
      'Sample rows stay small so the UI remains fast during local demos.',
      'Consent filters make company-provided and double opt-in states visible before sends.',
    ],
    links: [
      { label: 'Audience feature page', href: '/features/audience-segments' },
      { label: 'Open customer app', href: '/app' },
    ],
  },
  {
    id: 'analytics-reporting',
    category: 'Reporting',
    title: 'Read analytics and reporting',
    summary:
      'Review scheduled reach, campaign history, message volume, tracked clicks, redemptions, follow-ups, and quota usage.',
    steps: [
      'Open Analytics in the customer workspace.',
      'Refresh performance after campaign activity exists.',
      'Use internal Usage for tenant rollups across companies.',
    ],
    links: [
      { label: 'Analytics feature page', href: '/features/analytics' },
      { label: 'Open internal admin', href: '/internal' },
    ],
  },
  {
    id: 'consent-compliance',
    category: 'Compliance',
    title: 'Consent and compliance basics',
    summary:
      'CampaignOS keeps subscriber consent state visible and separates company-provided imports from confirmed opt-ins.',
    steps: [
      'Filter subscribers by consent status before selecting segments.',
      'Use the public opt-in flow for double opt-in confirmation demos.',
      'Treat consent and suppression policy as required production integrations before real sends.',
    ],
    links: [{ label: 'Compliance feature page', href: '/features/compliance' }],
  },
  {
    id: 'internal-admin-tenant-ops',
    category: 'Operations',
    title: 'Internal admin and tenant operations overview',
    summary:
      'Internal operators create tenants, assign contract credits, review company health, and inspect usage rollups.',
    steps: [
      'Open /internal and sign in as ops@example.test.',
      'Create companies with monthly send limits and initial admin access codes.',
      'Use company health, usage summaries, Grafana, Tempo, and Prometheus links during operations review.',
    ],
    links: [
      { label: 'Open internal admin', href: '/internal' },
      { label: 'Feature overview', href: '/features' },
    ],
  },
  {
    id: 'troubleshooting',
    category: 'Troubleshooting',
    title: 'Troubleshooting common issues',
    summary:
      'Resolve sign-in, missing campaign, monitor, budget, and reporting problems before escalating to platform ops.',
    steps: [
      'If sign-in fails, confirm the email membership or access code was generated in Settings.',
      'If the monitor is empty, create or seed a campaign and select it in Campaigns -> Monitor.',
      'If scheduling is disabled, check role permissions and remaining user credit allocation.',
    ],
    links: [
      { label: 'Open customer app', href: '/app' },
      { label: 'Open broadcast monitor', href: '/monitor' },
    ],
  },
]

const kbCategories = ['All', ...Array.from(new Set(kbArticles.map((article) => article.category)))]

function normalize(value: string) {
  return value.trim().toLowerCase()
}

export function KnowledgeBasePage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const normalizedQuery = normalize(query)

  const filteredArticles = useMemo(
    () =>
      kbArticles.filter((article) => {
        const categoryMatches = category === 'All' || article.category === category
        const searchText = `${article.title} ${article.summary} ${article.category} ${article.steps.join(' ')}`.toLowerCase()
        const queryMatches = normalizedQuery === '' || searchText.includes(normalizedQuery)
        return categoryMatches && queryMatches
      }),
    [category, normalizedQuery],
  )

  return (
    <main className="public-product-page kb-page">
      <header className="public-product-nav">
        <a className="public-brand" href="/">
          CampaignOS
        </a>
        <nav aria-label="Knowledge base navigation">
          <a href="/features">Features</a>
          <a href="/kb">Knowledge base</a>
          <a href="/app">Customer app</a>
          <a href="/internal">Internal admin</a>
        </nav>
      </header>

      <section className="kb-hero">
        <div>
          <p className="eyebrow">Customer support</p>
          <h1>Customer knowledge base</h1>
          <p>
            Practical operating guides for Demo Retail Co users, campaign managers, analysts, and internal tenant
            operators evaluating CampaignOS.
          </p>
          <label className="kb-search">
            Search knowledge base
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search access codes, monitor, budgets, consent..."
            />
          </label>
        </div>
        <aside className="demo-helper kb-demo-helper" aria-label="Demo credential helper">
          <span>Demo credentials</span>
          <strong>Demo Retail Co</strong>
          <p>
            Customer owner: <b>owner@demo-retail.test</b>
          </p>
          <p>
            Access code: <b>DEMORETA-E568C9</b>
          </p>
          <p>
            Internal admin: <b>ops@example.test</b>
          </p>
        </aside>
      </section>

      <section className="kb-quick-ctas" aria-label="Knowledge base quick links">
        <a href="/app">Open customer app</a>
        <a href="/monitor">Open broadcast monitor</a>
        <a href="/features">View features</a>
        <a href="/internal">Open internal admin</a>
      </section>

      <section className="kb-category-bar" aria-label="Knowledge base categories">
        {kbCategories.map((item) => (
          <button className={category === item ? 'active' : 'secondary'} key={item} onClick={() => setCategory(item)}>
            {item === 'All' ? 'All articles' : item}
          </button>
        ))}
      </section>

      <section className="kb-results-heading" aria-live="polite">
        <span>
          Showing {filteredArticles.length} of {kbArticles.length} articles
        </span>
        {query || category !== 'All' ? (
          <button
            className="ghost"
            onClick={() => {
              setQuery('')
              setCategory('All')
            }}
          >
            Clear filters
          </button>
        ) : null}
      </section>

      <section className="kb-article-grid" aria-label="Knowledge base articles">
        {filteredArticles.length ? (
          filteredArticles.map((article) => (
            <article className="kb-card" key={article.id}>
              <span>{article.category}</span>
              <h2>{article.title}</h2>
              <p>{article.summary}</p>
              <ul>
                {article.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              <div className="kb-card-links">
                {article.links.map((link) => (
                  <a href={link.href} key={`${article.id}-${link.href}`}>
                    {link.label}
                  </a>
                ))}
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state kb-empty-state">
            <strong>No articles match those filters</strong>
            <p>Clear the search or choose All articles to browse the full customer knowledge base.</p>
          </div>
        )}
      </section>
    </main>
  )
}
