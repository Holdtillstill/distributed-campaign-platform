import { useMemo, useState } from 'react'

type KbArticle = {
  id: string
  category: string
  title: string
  summary: string
  appliesTo: string
  productArea: string
  workflowStage: string
  demoContext: string
  details: string[]
  steps: string[]
  callout: {
    label: string
    title: string
    body: string
    facts: { label: string; value: string }[]
  }
  links: { label: string; href: string }[]
}

const kbArticles: KbArticle[] = [
  {
    id: 'getting-started',
    category: 'Setup',
    title: 'Getting started with Demo Retail Co',
    summary:
      'Use the demo workspace to explore modeled audiences, campaign planning, broadcast monitoring, and reporting.',
    appliesTo: 'Owners, admins, campaign managers',
    productArea: 'Customer workspace',
    workflowStage: 'Workspace orientation',
    demoContext: 'Demo Retail Co seed data',
    details: [
      'Demo Retail Co is the safest path through the product because it has seeded audiences, campaigns, media, and tenant settings. Start here when you want to understand how the customer workspace behaves without creating new data first.',
      'The workspace is intentionally modeled at a large scale while the local sample rows stay smaller. That lets you inspect million-scale planning, quota pressure, and monitor behavior without waiting for a full production send.',
    ],
    steps: [
      'Open Customer login and sign in as an invited user.',
      'Use Demo Retail Co to inspect the 2.65M modeled subscriber setup.',
      'Review dashboard quotas, campaigns, subscribers, content, analytics, and settings.',
    ],
    callout: {
      label: 'Demo shape',
      title: 'Large-audience behavior with local sample rows',
      body: 'The workspace keeps planning numbers large enough to show quota pressure while keeping loaded rows small enough for fast local demos.',
      facts: [
        { label: 'Tenant', value: 'Demo Retail Co' },
        { label: 'Modeled reach', value: '2.65M' },
        { label: 'Seeded scope', value: 'Audiences, campaigns, media' },
      ],
    },
    links: [
      { label: 'Open customer login', href: '/app' },
      { label: 'View features', href: '/features' },
    ],
  },
  {
    id: 'invite-access-code-sign-in',
    category: 'Setup',
    title: 'Sign in with an invite or access code',
    summary:
      'Existing users look up memberships by email. New teammates join with a role-specific access code.',
    appliesTo: 'Invited customer users',
    productArea: 'Customer login',
    workflowStage: 'Access handoff',
    demoContext: 'Invite/access-code auth',
    details: [
      'The demo auth flow is invite and access-code based. It does not pretend to be password or OAuth login, so the important operating question is whether the user has an active membership or a valid code.',
      'Each membership carries the company, role, and optional credit allocation that the workspace uses to enable or disable actions. If a teammate cannot schedule or invite, check their role first, then check their user credit limit.',
    ],
    steps: [
      'When the demo API is running, existing Demo Retail users can look up owner@demo-retail.test.',
      'Seeded demo users can join with access code DEMORETA-E568C9.',
      'The returned membership includes company, role, and any user credit allocation.',
    ],
    callout: {
      label: 'Access record',
      title: 'Membership controls the workspace surface',
      body: 'The sign-in response is not just identity; it determines company scope, role-based permissions, and optional spend limits.',
      facts: [
        { label: 'Existing user', value: 'owner@demo-retail.test' },
        { label: 'Access code', value: 'DEMORETA-E568C9' },
        { label: 'Membership includes', value: 'Company, role, allocation' },
      ],
    },
    links: [{ label: 'Open customer login', href: '/app' }],
  },
  {
    id: 'roles-permissions',
    category: 'Team',
    title: 'Roles, permissions, and budget allocations',
    summary:
      'Customer admins control who can create campaigns, manage subscribers, view analytics, and spend credits.',
    appliesTo: 'Owners, admins, reporting roles',
    productArea: 'Settings and permissions',
    workflowStage: 'Team governance',
    demoContext: 'Role-aware workspace controls',
    details: [
      'Roles are meant to make the same workspace credible for owners, campaign managers, analysts, and viewers. Owners and admins can manage team access; operators can work inside their permission scope; reporting roles stay read-only.',
      'Budget allocation is layered. The company has a pooled contract balance, and individual users may also have a credit cap. The campaign builder checks both so a user cannot spend beyond their allocation or the company balance.',
    ],
    steps: [
      'Company admins have full workspace control.',
      'Campaign managers can build and schedule sends within their budget.',
      'Analyst and viewer roles keep operational actions disabled while reporting stays available.',
    ],
    callout: {
      label: 'Permission model',
      title: 'Authority and spend are separate checks',
      body: 'A user can have access to a workspace without having permission or allocation for every action inside it.',
      facts: [
        { label: 'Owner/admin', value: 'Team and tenant control' },
        { label: 'Campaign manager', value: 'Build and schedule within budget' },
        { label: 'Analyst/viewer', value: 'Reporting-first access' },
      ],
    },
    links: [
      { label: 'Open customer login', href: '/app' },
      { label: 'Role feature page', href: '/features/role-based-access' },
    ],
  },
  {
    id: 'inviting-teammates',
    category: 'Team',
    title: 'Invite teammates from Settings',
    summary:
      'Generate access codes for teammates and assign the role and credit limit they should receive on join.',
    appliesTo: 'Owners and admins',
    productArea: 'Settings',
    workflowStage: 'Team onboarding',
    demoContext: 'Generated access codes',
    details: [
      'Settings is the customer-side handoff point for team access. A company owner can issue a code that includes the invited role and the user credit limit that should apply as soon as the teammate joins.',
      'Use separate codes for different job scopes. A regional campaign manager should not receive the same access profile as a reporting-only stakeholder, and a budgeted operator should have a clear allocation before scheduling campaigns.',
    ],
    steps: [
      'Go to Settings in the customer workspace.',
      'Choose an invite role such as campaign manager or regional manager.',
      'Set a user credit limit and share the generated access code with the teammate.',
    ],
    callout: {
      label: 'Invite payload',
      title: 'Access codes carry operating scope',
      body: 'Codes should be treated as scoped handoffs because they determine the new user role and any user-level credit allocation.',
      facts: [
        { label: 'Code includes', value: 'Company and role' },
        { label: 'Optional guard', value: 'User credit limit' },
        { label: 'Best fit', value: 'One code per job scope' },
      ],
    },
    links: [{ label: 'Open customer login', href: '/app' }],
  },
  {
    id: 'budgets-credits',
    category: 'Finance',
    title: 'Understand budgets and credits',
    summary:
      'CampaignOS models company contract credits and optional user allocations before a campaign is scheduled.',
    appliesTo: 'Admins and campaign managers',
    productArea: 'Budgets and campaign builder',
    workflowStage: 'Pre-send review',
    demoContext: 'Credits plus monthly reach quota',
    details: [
      'Credits represent the spend model for loaded sample rows in this local demo. Regular SMS uses one credit per sample recipient; Smart SMS uses two credits because it can include media, tracked links, and follow-up workflows.',
      'Monthly send quota is separate from credit spend. The quota guard looks at scheduled modeled reach in the selected calendar month, while credit balance protects the sample-send cost and contract balance.',
    ],
    steps: [
      'Regular SMS costs 1 credit per sample recipient.',
      'Smart SMS costs 2 credits and can include media, tracked links, and reminders.',
      'The new campaign flow shows sample cost and modeled full-audience cost before scheduling.',
    ],
    callout: {
      label: 'Quota math',
      title: 'Quota and credits answer different questions',
      body: 'Quota limits modeled scheduled reach for a month. Credits represent the sample-send spend model and user/company allocation checks.',
      facts: [
        { label: 'Monthly quota', value: 'Modeled reach' },
        { label: 'Regular SMS', value: '1 credit per sample row' },
        { label: 'Smart SMS', value: '2 credits per sample row' },
      ],
    },
    links: [{ label: 'Open new campaign', href: '/app/campaigns/new' }],
  },
  {
    id: 'creating-scheduling-campaigns',
    category: 'Campaigns',
    title: 'Create and schedule a campaign',
    summary:
      'Build a campaign from segments or direct sample subscribers, choose SMS type, attach Smart SMS media, and schedule.',
    appliesTo: 'Campaign managers and admins',
    productArea: 'Campaign builder',
    workflowStage: 'Campaign creation',
    demoContext: 'Segments, samples, schedule guard',
    details: [
      'The campaign builder is organized around audience, message, schedule, and review. Segment selection carries the modeled audience count, while the sample rows provide local messages for fast testing and monitor demos.',
      'Before scheduling, compare modeled reach, sample cost, company balance, user allocation, and the selected schedule window. If the requested modeled reach would exceed the monthly quota, the API blocks the schedule and returns the available reach for that quota period.',
    ],
    steps: [
      'Choose Campaigns, then New campaign.',
      'Select subscriber segments or direct sample rows.',
      'Review modeled audience, sample count, credit cost, and scheduled time before submitting.',
    ],
    callout: {
      label: 'Builder review',
      title: 'The review step is the scheduling gate',
      body: 'A credible send flow should pause on audience, spend, quota period, and schedule before any broadcast is accepted.',
      facts: [
        { label: 'Audience', value: 'Segments or sample rows' },
        { label: 'Spend check', value: 'Company and user credits' },
        { label: 'Quota check', value: 'Monthly modeled reach' },
      ],
    },
    links: [
      { label: 'Open customer login', href: '/app' },
      { label: 'Feature overview', href: '/features' },
    ],
  },
  {
    id: 'broadcast-monitor-throughput',
    category: 'Campaigns',
    title: 'Monitor broadcast throughput',
    summary:
      'Use the broadcast monitor to validate throughput, percent complete, ETA, delivery outcomes, retries, and dead letters.',
    appliesTo: 'Operators and campaign managers',
    productArea: 'Broadcast monitor',
    workflowStage: 'Post-schedule monitoring',
    demoContext: 'Loaded sample delivery states',
    details: [
      'The monitor is the operational view for a campaign after rows exist. It separates queued, sent, failed, retried, and dead-lettered outcomes so a campaign operator can tell whether the job is progressing or needs escalation.',
      'For demo campaigns with modeled reach, the monitor may show a smaller loaded sample count than the modeled audience. That is expected locally; use the modeled count for planning and quota context, and the sample rows for delivery-state behavior.',
    ],
    steps: [
      'Open /monitor or Campaigns -> Monitor after a campaign exists.',
      'Select the campaign and refresh to pull the latest broadcast monitor state.',
      'Review queued, sent, failed, retried, and dead-lettered rows before escalating delivery issues.',
    ],
    callout: {
      label: 'Monitor strip',
      title: 'Delivery states should explain what changed',
      body: 'The monitor is strongest when each count has an operational meaning instead of reading like a generic progress widget.',
      facts: [
        { label: 'Normal flow', value: 'Queued to sent' },
        { label: 'Escalation path', value: 'Failed, retried, dead-lettered' },
        { label: 'Local demo', value: 'Sample rows drive state' },
      ],
    },
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
    appliesTo: 'Audience managers and admins',
    productArea: 'Subscribers',
    workflowStage: 'Audience preparation',
    demoContext: 'Directory plus modeled segments',
    details: [
      'Subscriber lists can represent large modeled segments such as regional VIPs or holiday promo audiences. The directory shows loaded sample subscribers for inspection, while segment cards keep the modeled counts visible for planning.',
      'Consent status matters before any send. Use the filters to review company-provided, imported, confirmed, and double opt-in records, then keep opted-out subscribers suppressed before a campaign is scheduled.',
    ],
    steps: [
      'Subscriber lists can carry modeled counts such as 250,000 or 2,650,000 subscribers.',
      'Sample rows stay small so the UI remains fast during local demos.',
      'Consent filters make company-provided and double opt-in states visible before sends.',
    ],
    callout: {
      label: 'Audience model',
      title: 'Directory rows and segment counts serve different jobs',
      body: 'The directory is for inspection and consent checks; modeled segment counts are for planning large-audience campaigns.',
      facts: [
        { label: 'Directory', value: 'Loaded sample subscribers' },
        { label: 'Segments', value: 'Modeled planning counts' },
        { label: 'Consent', value: 'Filter before scheduling' },
      ],
    },
    links: [
      { label: 'Audience feature page', href: '/features/audience-segments' },
      { label: 'Open customer login', href: '/app' },
    ],
  },
  {
    id: 'analytics-reporting',
    category: 'Reporting',
    title: 'Read analytics and reporting',
    summary:
      'Review scheduled reach, campaign history, message volume, tracked clicks, redemptions, follow-ups, and quota usage.',
    appliesTo: 'Analysts, admins, internal operators',
    productArea: 'Analytics',
    workflowStage: 'Reporting review',
    demoContext: 'Planning metrics plus honest empty states',
    details: [
      'Analytics combines planning and performance signals. Scheduled reach, campaign count, message volume, and monthly quota reach explain the workspace posture before performance events exist.',
      'Clicks and redemptions only become meaningful after Smart SMS tracking reports activity. Until then, empty performance charts should read as honest empty states rather than implied engagement.',
    ],
    steps: [
      'Open Analytics in the customer workspace.',
      'Refresh performance after campaign activity exists.',
      'Use internal Usage for tenant rollups across companies.',
    ],
    callout: {
      label: 'Reporting split',
      title: 'Planning metrics can exist before tracked engagement',
      body: 'Scheduled reach and campaign volume are real planning signals even when click and redemption charts are intentionally empty.',
      facts: [
        { label: 'Planning', value: 'Scheduled reach, campaign count' },
        { label: 'Performance', value: 'Clicks and redemptions' },
        { label: 'Tenant ops', value: 'Internal usage rollups' },
      ],
    },
    links: [
      { label: 'Analytics feature page', href: '/features/analytics' },
      { label: 'Open internal admin', href: '/internal' },
    ],
  },
  {
    id: 'consent-compliance',
    category: 'Compliance',
    title: 'TCPA-aware consent and compliance readiness',
    summary:
      'CampaignOS keeps TCPA-aware SMS readiness visible by separating consent sources, opt-in evidence, suppression, send windows, and approval records.',
    appliesTo: 'Admins, operators, reviewers',
    productArea: 'Compliance readiness',
    workflowStage: 'Pre-send review',
    demoContext: 'Workflow shape, not legal approval',
    details: [
      'Compliance readiness is a product workflow, not a legal guarantee. The app should make consent source, opt-out state, suppression checks, quiet hours, sender identity, and approval records visible before a user schedules outreach.',
      'Production sending still needs legal review, carrier policy alignment, and backend enforcement. Treat the demo controls as the shape of the workflow a production implementation would harden.',
    ],
    steps: [
      'Capture prior express written consent evidence before telemarketing or advertising SMS sends under TCPA-oriented workflows.',
      'Make opt-out and STOP handling visible, then route revoked numbers into suppression lists before audience selection.',
      'Review quiet hours, send windows, sender identity, message purpose, and audience source before scheduling.',
      'Keep audit evidence for approvals, audience source, consent source, and suppression/revocation checks.',
      'Treat this as compliance-readiness only: production senders still need legal review, carrier policy alignment, and backend enforcement before real sends.',
    ],
    callout: {
      label: 'Readiness checklist',
      title: 'The UI should surface evidence before send',
      body: 'This demo describes the controls a production implementation would harden; it does not present legal clearance as automatic.',
      facts: [
        { label: 'Consent', value: 'Source and opt-in evidence' },
        { label: 'Suppression', value: 'STOP and revoked numbers' },
        { label: 'Review', value: 'Quiet hours and sender identity' },
      ],
    },
    links: [{ label: 'Compliance feature page', href: '/features/compliance' }],
  },
  {
    id: 'internal-admin-tenant-ops',
    category: 'Operations',
    title: 'Internal admin and tenant operations overview',
    summary:
      'Internal operators create tenants, assign contract credits, review company health, and inspect usage rollups.',
    appliesTo: 'Internal operators',
    productArea: 'Internal admin',
    workflowStage: 'Tenant operations',
    demoContext: 'Cross-tenant health and usage',
    details: [
      'The internal console is for cross-tenant operations. It should help an operator see tenant health, quota pressure, credit balance, active access-code handoff, and usage rollups without entering the customer workspace as that user.',
      'Company health uses scheduled reach against monthly send limits so operators can spot quota-watch tenants before schedules fail. Usage reporting is broader and covers campaign, message, media, tracking, and reminder totals.',
    ],
    steps: [
      'Open /internal and sign in as ops@example.test.',
      'Create companies with monthly send limits and initial admin access codes.',
      'Use company health, usage summaries, Grafana, Tempo, and Prometheus links during operations review.',
    ],
    callout: {
      label: 'Tenant command',
      title: 'Internal views should explain tenant posture quickly',
      body: 'Operators need health, quota pressure, active handoff codes, and usage context without impersonating a customer user.',
      facts: [
        { label: 'Health', value: 'Scheduled reach vs limit' },
        { label: 'Handoff', value: 'Admin access code' },
        { label: 'Rollups', value: 'Usage across product areas' },
      ],
    },
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
    appliesTo: 'Customer admins and support operators',
    productArea: 'Support triage',
    workflowStage: 'Issue resolution',
    demoContext: 'Local demo diagnosis',
    details: [
      'Most local demo problems come from missing membership context, an empty seeded object, or a role/budget restriction. Start with the user role and company id, then check whether the relevant campaigns, lists, media assets, or monitor rows exist.',
      'If a schedule fails, read the returned error before changing data. A quota error means the modeled reach would exceed the monthly limit; a credit error means sample-send cost exceeds the company balance or user allocation.',
    ],
    steps: [
      'If sign-in fails, confirm the email membership or access code was generated in Settings.',
      'If the monitor is empty, create or seed a campaign and select it in Campaigns -> Monitor.',
      'If scheduling is disabled, check role permissions and remaining user credit allocation.',
    ],
    callout: {
      label: 'Triage order',
      title: 'Check identity, data, then guards',
      body: 'The fastest path is to confirm membership and seeded data before changing campaign or tenant settings.',
      facts: [
        { label: 'First check', value: 'Membership and role' },
        { label: 'Second check', value: 'Seeded object exists' },
        { label: 'Guard checks', value: 'Quota and credits' },
      ],
    },
    links: [
      { label: 'Open customer login', href: '/app' },
      { label: 'Open broadcast monitor', href: '/monitor' },
    ],
  },
]

const kbCategories = ['All', ...Array.from(new Set(kbArticles.map((article) => article.category)))]
const kbStartPaths = [
  {
    label: 'Sign in',
    description: 'Invite and access-code flow',
    articleId: 'invite-access-code-sign-in',
  },
  {
    label: 'New campaign',
    description: 'Audience, message, schedule, review',
    articleId: 'creating-scheduling-campaigns',
  },
  {
    label: 'Quota and credits',
    description: 'Modeled reach and spend checks',
    articleId: 'budgets-credits',
  },
  {
    label: 'Broadcast monitor',
    description: 'Throughput, retries, dead letters',
    articleId: 'broadcast-monitor-throughput',
  },
]

function normalize(value: string) {
  return value.trim().toLowerCase()
}

export function KnowledgeBasePage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [selectedArticleId, setSelectedArticleId] = useState(kbArticles[0].id)
  const normalizedQuery = normalize(query)

  const filteredArticles = useMemo(
    () =>
      kbArticles.filter((article) => {
        const categoryMatches = category === 'All' || article.category === category
        const searchText = `${article.title} ${article.summary} ${article.category} ${article.appliesTo} ${
          article.productArea
        } ${article.workflowStage} ${article.demoContext} ${article.callout.title} ${
          article.callout.body
        } ${article.callout.facts.map((fact) => `${fact.label} ${fact.value}`).join(' ')} ${article.details.join(
          ' ',
        )} ${article.steps.join(' ')}`.toLowerCase()
        const queryMatches = normalizedQuery === '' || searchText.includes(normalizedQuery)
        return categoryMatches && queryMatches
      }),
    [category, normalizedQuery],
  )
  const selectedArticle = filteredArticles.find((article) => article.id === selectedArticleId) ?? filteredArticles[0]

  function selectArticle(articleId: string) {
    setSelectedArticleId(articleId)
  }

  function openStartPath(articleId: string) {
    setQuery('')
    setCategory('All')
    selectArticle(articleId)
  }

  return (
    <main className="public-product-page kb-page">
      <header className="public-product-nav">
        <a className="public-brand" href="/">
          CampaignOS
        </a>
        <nav aria-label="Knowledge base navigation">
          <a href="/features">Features</a>
          <a href="/kb">Knowledge base</a>
          <a href="/app">Customer login</a>
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
        <aside className="demo-helper kb-demo-helper" aria-label="Seeded demo access helper">
          <span>Seeded demo access</span>
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
        <a href="/app">Open customer login</a>
        <a href="/monitor">Open broadcast monitor</a>
        <a href="/features">View features</a>
        <a href="/internal">Open internal admin</a>
      </section>

      <section className="kb-start-paths" aria-label="Recommended knowledge base paths">
        <div>
          <span>Start here</span>
          <strong>Pick the workflow you are trying to understand.</strong>
        </div>
        <div className="kb-start-path-grid">
          {kbStartPaths.map((path) => (
            <button
              className={selectedArticle?.id === path.articleId && category === 'All' && normalizedQuery === '' ? 'active' : ''}
              type="button"
              key={path.articleId}
              onClick={() => openStartPath(path.articleId)}
            >
              <strong>{path.label}</strong>
              <small>{path.description}</small>
            </button>
          ))}
        </div>
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

      <section className="kb-article-layout" aria-label="Knowledge base articles">
        {filteredArticles.length ? (
          <>
            <label className="kb-article-picker">
              Choose article
              <select value={selectedArticle?.id ?? ''} onChange={(event) => selectArticle(event.target.value)}>
                {filteredArticles.map((article) => (
                  <option value={article.id} key={article.id}>
                    {article.category}: {article.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="kb-guide-list" aria-label="Knowledge base guide list">
              {filteredArticles.map((article) => (
                <article className={selectedArticle?.id === article.id ? 'kb-guide-row active' : 'kb-guide-row'} key={article.id}>
                  <button type="button" onClick={() => selectArticle(article.id)}>
                    <span>{article.category}</span>
                    <strong>{article.title}</strong>
                  </button>
                </article>
              ))}
            </div>
            {selectedArticle ? (
              <article className="kb-article-detail" aria-label={`${selectedArticle.title} article`} key={selectedArticle.id}>
                <div className="kb-article-kicker">
                  <span>{selectedArticle.category}</span>
                  <small>Operational guide</small>
                </div>
                <h2>{selectedArticle.title}</h2>
                <p className="kb-article-summary">{selectedArticle.summary}</p>
                <dl className="kb-article-context" aria-label="Article context">
                  <div>
                    <dt>Applies to</dt>
                    <dd>{selectedArticle.appliesTo}</dd>
                  </div>
                  <div>
                    <dt>Product area</dt>
                    <dd>{selectedArticle.productArea}</dd>
                  </div>
                  <div>
                    <dt>Workflow stage</dt>
                    <dd>{selectedArticle.workflowStage}</dd>
                  </div>
                  <div>
                    <dt>Demo context</dt>
                    <dd>{selectedArticle.demoContext}</dd>
                  </div>
                </dl>
                <div className="kb-article-body">
                  {selectedArticle.details.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <aside className="kb-insight-panel" aria-label={`${selectedArticle.title} product context`}>
                  <div>
                    <span>{selectedArticle.callout.label}</span>
                    <strong>{selectedArticle.callout.title}</strong>
                    <p>{selectedArticle.callout.body}</p>
                  </div>
                  <dl>
                    {selectedArticle.callout.facts.map((fact) => (
                      <div key={`${selectedArticle.id}-${fact.label}`}>
                        <dt>{fact.label}</dt>
                        <dd>{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                </aside>
                <div className="kb-step-panel">
                  <strong>Recommended workflow</strong>
                  <ol>
                    {selectedArticle.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
                {selectedArticle.links.length ? (
                  <div className="kb-related-actions" aria-label="Related actions">
                    <strong>Related actions</strong>
                    <div>
                      {selectedArticle.links.map((link) => (
                        <a href={link.href} key={`${selectedArticle.id}-${link.href}`}>
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ) : null}
          </>
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
