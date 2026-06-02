type AppDesignId = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'

export function routeToAppDesign(pathname: string): AppDesignId | null {
  const match = /^\/app-designs\/([1-9]|10)\/?$/.exec(pathname)
  return match ? (match[1] as AppDesignId) : null
}

const navItems = ['Dashboard', 'Campaigns', 'Broadcast monitor', 'Subscribers', 'Analytics', 'Settings']
const tenant = 'Demo Retail Co'
const owner = 'owner@demo-retail.test'

function AppDesignLinks({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <div className={`app-design-links app-design-links-${tone}`}>
      <a href="/app">Open customer login</a>
      <a href="/app/monitor">Open real-time monitor</a>
      <a href="/internal">Internal admin</a>
    </div>
  )
}

function AppDesignResourceLinks({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <div className={`app-design-links app-design-links-${tone}`}>
      <a href="/app">Open customer login</a>
      <a href="/monitor">Open monitor</a>
      <a href="/features">Features</a>
      <a href="/kb">Knowledge base</a>
      <a href="/internal">Internal admin</a>
    </div>
  )
}

function RailNav({ active = 'Dashboard' }: { active?: string }) {
  return (
    <nav aria-label="App design navigation">
      {navItems.map((item) => (
        <span className={item === active ? 'active' : ''} key={item}>
          {item}
        </span>
      ))}
    </nav>
  )
}

function OperatorConsole() {
  const queue = [
    { label: 'Queued', value: '1,360,000', width: '82%' },
    { label: 'Sent', value: '947,300', width: '64%' },
    { label: 'Retry', value: '412', width: '18%' },
  ]

  return (
    <main className="app-design app-design-operator">
      <aside className="operator-rail">
        <div className="operator-brand">
          <span>CampaignOS</span>
          <strong>{tenant}</strong>
        </div>
        <RailNav active="Broadcast monitor" />
        <section aria-label="Role and budget">
          <span>Company owner</span>
          <strong>{owner}</strong>
          <p>4.8M credits available / all market segments</p>
        </section>
      </aside>

      <section className="operator-workspace">
        <header className="operator-topbar">
          <div>
            <span>Runtime operations</span>
            <h1>Operator Console</h1>
          </div>
          <AppDesignLinks tone="dark" />
        </header>

        <section className="operator-monitor" aria-label="Broadcast monitor surface">
          <div className="operator-monitor-copy">
            <span>Realtime Broadcast Monitor</span>
            <strong>Summer Preview is pacing across 64 workers.</strong>
            <p>ETA 18 minutes / 41.8k messages per minute / retry pressure normal.</p>
          </div>
          <div className="operator-meter-stack">
            {queue.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <i style={{ width: item.width }} />
              </div>
            ))}
          </div>
        </section>

        <div className="operator-lower-grid">
          <section aria-label="Campaigns">
            <span>Campaigns</span>
            <strong>Memorial Day Promo</strong>
            <p>Scheduled / Smart SMS / modeled audience 250k</p>
          </section>
          <section aria-label="Subscribers">
            <span>Subscribers</span>
            <strong>VIP Customers</strong>
            <p>250k modeled / 2 loaded sample rows / consent confirmed</p>
          </section>
          <section aria-label="Analytics">
            <span>Analytics</span>
            <strong>123 clicks</strong>
            <p>45 redemptions / tracked link lift ready for follow-up</p>
          </section>
          <section aria-label="Settings and team budget">
            <span>Settings</span>
            <strong>Team budget</strong>
            <p>Owner, campaign manager, analyst, viewer roles</p>
          </section>
        </div>
      </section>
    </main>
  )
}

function ExecutiveSaas() {
  return (
    <main className="app-design app-design-executive">
      <header className="executive-nav">
        <div>
          <span>CampaignOS</span>
          <strong>{tenant}</strong>
        </div>
        <RailNav active="Dashboard" />
        <AppDesignLinks />
      </header>

      <section className="executive-main">
        <div className="executive-heading">
          <span>Company owner workspace</span>
          <h1>Executive SaaS Dashboard</h1>
          <p>Revenue, reach, credit allocation, and broadcast status in one operating view.</p>
        </div>
        <aside className="executive-budget" aria-label="Role and budget">
          <span>Role and budget</span>
          <strong>Company admin</strong>
          <p>50,000 user credits / full workspace control</p>
        </aside>
      </section>

      <section className="executive-kpis" aria-label="Dashboard">
        {[
          ['Subscribers', '2.65M', 'All modeled audience'],
          ['Campaigns', '7', 'Scheduled or sent'],
          ['Credits remaining', '4.8M', 'Contract balance'],
          ['Redemptions', '45', 'Tracked offer outcomes'],
        ].map(([label, value, detail]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </section>

      <div className="executive-grid">
        <section className="executive-board" aria-label="Campaigns">
          <div>
            <span>Campaigns</span>
            <strong>Upcoming broadcasts</strong>
          </div>
          {['Summer Preview', 'VIP Loyalty Double Points', 'Winback Offer'].map((name, index) => (
            <p key={name}>
              <strong>{name}</strong>
              <span>{index === 0 ? 'scheduled / monitor ready' : 'draft / budget review'}</span>
            </p>
          ))}
        </section>
        <section className="executive-monitor" aria-label="Broadcast monitor">
          <span>Broadcast monitor</span>
          <strong>41.8k/min</strong>
          <p>64% sent / ETA 18m / no dead letters</p>
        </section>
        <section className="executive-list" aria-label="Subscribers">
          <span>Subscribers</span>
          <strong>VIP Customers</strong>
          <p>Search, consent filters, CSV import, sample pagination</p>
        </section>
        <section className="executive-list" aria-label="Analytics and settings">
          <span>Analytics / Settings</span>
          <strong>Reporting and team controls</strong>
          <p>Clicks, redemptions, access codes, roles, and credit limits</p>
        </section>
      </div>
    </main>
  )
}

function CampaignStudio() {
  const steps = ['Audience', 'Message', 'Schedule', 'Review']

  return (
    <main className="app-design app-design-studio">
      <header className="studio-shell-top">
        <div>
          <span>CampaignOS Studio</span>
          <h1>Campaign Studio Workspace</h1>
        </div>
        <AppDesignLinks />
      </header>

      <section className="studio-shell">
        <aside className="studio-sidebar">
          <strong>{tenant}</strong>
          <RailNav active="Campaigns" />
          <section aria-label="Role and budget">
            <span>Campaign manager</span>
            <p>2,000 credits assigned / regional market scope</p>
          </section>
        </aside>

        <section className="studio-canvas" aria-label="Campaigns">
          <div className="studio-steps">
            {steps.map((step, index) => (
              <span className={index === 1 ? 'active' : ''} key={step}>
                {step}
              </span>
            ))}
          </div>
          <div className="studio-builder">
            <div>
              <span>Campaign builder</span>
              <strong>Weekend Flash Sale MMS</strong>
              <p>Smart SMS / Memorial Day segment / scheduled Monday 4:00 PM</p>
            </div>
            <div className="studio-message-preview" aria-label="Broadcast monitor">
              <span>Broadcast monitor</span>
              <strong>Ready after approval</strong>
              <p>Modeled 375k / sample 3 / projected cost 6 credits</p>
            </div>
          </div>
          <section className="studio-segments" aria-label="Subscribers">
            <span>Subscribers / segments</span>
            <strong>VIP Customers + West Region</strong>
            <p>Consent status and sample rows visible before scheduling.</p>
          </section>
        </section>

        <aside className="studio-inspector" aria-label="Analytics and settings">
          <div className="studio-phone-frame">
            <span>SMS preview</span>
            <p>Flash sale: our bestsellers are back in stock for 48 hours.</p>
          </div>
          <section>
            <span>Analytics</span>
            <strong>Click tracking on</strong>
            <p>Redemption reporting and follow-up rules attached.</p>
          </section>
          <section>
            <span>Settings</span>
            <strong>Approval required</strong>
            <p>Owner can adjust budget or issue access codes.</p>
          </section>
        </aside>
      </section>
    </main>
  )
}

function DataCommandCenter() {
  const rows = [
    ['Demo Retail Co', 'Summer Preview', '947k', '412', '18m'],
    ['Acme Retail', 'Memorial Day Promo', '250k', '0', 'done'],
    ['North Market', 'Winback Offer', '83k', '28', '6m'],
  ]

  return (
    <main className="app-design app-design-command">
      <aside className="command-rail">
        <strong>CampaignOS Data</strong>
        <RailNav active="Analytics" />
        <section aria-label="Role and budget">
          <span>Internal operator</span>
          <p>Tenant usage, quota risk, and access-code visibility</p>
        </section>
      </aside>

      <section className="command-main">
        <header className="command-header">
          <div>
            <span>Tenant intelligence</span>
            <h1>Data Command Center</h1>
          </div>
          <AppDesignLinks tone="dark" />
        </header>

        <section className="command-metrics" aria-label="Dashboard">
          {['2.65M subscribers', '1.36M scheduled reach', '4.8M credits', '45% quota used'].map((item) => (
            <strong key={item}>{item}</strong>
          ))}
        </section>

        <div className="command-grid">
          <section className="command-table" aria-label="Broadcast monitor">
            <div>
              <span>Broadcast monitor</span>
              <strong>Active sends</strong>
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
                {rows.map((row) => (
                  <tr key={row.join('-')}>
                    {row.map((cell) => (
                      <td key={cell}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="command-heatmap" aria-label="Analytics">
            <span>Analytics</span>
            <strong>Quota and retry heatmap</strong>
            <div>
              {Array.from({ length: 24 }, (_, index) => (
                <i className={`heat-${(index % 5) + 1}`} key={index} />
              ))}
            </div>
          </section>

          <section className="command-list" aria-label="Campaigns">
            <span>Campaigns</span>
            <strong>Status filters</strong>
            <p>Scheduled, sent, queued, retry-watch</p>
          </section>
          <section className="command-list" aria-label="Subscribers">
            <span>Subscribers</span>
            <strong>Consent cohorts</strong>
            <p>VIP, West Region, imported, double opt-in</p>
          </section>
          <section className="command-list" aria-label="Settings">
            <span>Settings</span>
            <strong>Team access</strong>
            <p>Roles, budgets, invite codes, audit notes</p>
          </section>
        </div>
      </section>
    </main>
  )
}

function RetailOpsWorkspace() {
  return (
    <main className="app-design app-design-retail">
      <header className="retail-top">
        <div>
          <span>CampaignOS Retail</span>
          <h1>Retail Ops Workspace</h1>
        </div>
        <AppDesignLinks />
      </header>

      <section className="retail-layout">
        <aside className="retail-shift">
          <strong>{tenant}</strong>
          <RailNav active="Subscribers" />
          <section aria-label="Role and budget">
            <span>Regional manager</span>
            <p>12,000 credits / Southwest lists only</p>
          </section>
        </aside>

        <section className="retail-board" aria-label="Dashboard">
          <div className="retail-day">
            <span>Today</span>
            <strong>3 sends need review before 4:00 PM.</strong>
            <p>Segments, budget, broadcast monitor, and store-team handoff stay in one workspace.</p>
          </div>

          <div className="retail-operations">
            <section aria-label="Campaigns">
              <span>Campaigns</span>
              <strong>Summer Preview</strong>
              <p>Smart SMS / scheduled / owner approval ready</p>
            </section>
            <section aria-label="Broadcast monitor">
              <span>Broadcast monitor</span>
              <strong>947k sent</strong>
              <p>41.8k/min / ETA 18m / refresh available</p>
            </section>
            <section aria-label="Subscribers">
              <span>Subscribers</span>
              <strong>West Region</strong>
              <p>125k modeled / consent status loaded / CSV import ready</p>
            </section>
            <section aria-label="Analytics">
              <span>Analytics</span>
              <strong>45 redemptions</strong>
              <p>Click and redemption reporting for store teams</p>
            </section>
          </div>
        </section>

        <aside className="retail-settings" aria-label="Settings">
          <section>
            <span>Settings</span>
            <strong>Team and access</strong>
            <p>Issue access codes, tune role permissions, and assign credit limits.</p>
          </section>
          <section>
            <span>Budget</span>
            <strong>2,375 remaining</strong>
            <p>Regional allocation after recent campaign activity.</p>
          </section>
        </aside>
      </section>
    </main>
  )
}

function MinimalEnterpriseWorkspace() {
  const workItems = [
    ['Campaigns', 'Summer Preview', 'Scheduled Jun 1 / owner approved'],
    ['Broadcast monitor', '64 workers idle-ready', 'Projected 41.8k/min after release'],
    ['Subscribers', 'VIP Customers + West Region', '375k modeled / double opt-in filters on'],
    ['Analytics', 'Weekly executive report', 'Clicks, redemptions, and cost by segment'],
  ]

  return (
    <main className="app-design app-design-minimal">
      <aside className="minimal-sidebar">
        <div className="minimal-brand">
          <span>CampaignOS</span>
          <strong>{tenant}</strong>
        </div>
        <RailNav active="Dashboard" />
        <section aria-label="Role and budget">
          <span>Role and budget</span>
          <strong>Company owner</strong>
          <p>{owner} / 4.8M credits available</p>
        </section>
      </aside>

      <section className="minimal-workspace">
        <header className="minimal-topbar">
          <div>
            <span>Authenticated workspace</span>
            <h1>Minimal Enterprise Workspace</h1>
          </div>
          <AppDesignResourceLinks />
        </header>

        <section className="minimal-command" aria-label="Dashboard command surface">
          <div>
            <span>Dashboard</span>
            <strong>Today needs one broadcast approval and one budget review.</strong>
          </div>
          <dl>
            <div>
              <dt>Credits</dt>
              <dd>4.8M</dd>
            </div>
            <div>
              <dt>Scheduled reach</dt>
              <dd>1.36M</dd>
            </div>
            <div>
              <dt>Approval SLA</dt>
              <dd>42m</dd>
            </div>
          </dl>
        </section>

        <div className="minimal-layout">
          <section className="minimal-list" aria-label="Campaigns and broadcast monitor">
            {workItems.map(([label, title, detail]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{title}</strong>
                <p>{detail}</p>
              </article>
            ))}
          </section>

          <aside className="minimal-inspector" aria-label="Settings team budget compliance">
            <section>
              <span>Settings</span>
              <strong>Team permissions</strong>
              <p>Owner, campaign manager, analyst, and viewer roles are mapped to credit ceilings.</p>
            </section>
            <section>
              <span>Compliance</span>
              <strong>Consent guardrails active</strong>
              <p>Quiet hours, opt-out copy, and approval notes are required before send.</p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}

function RealtimeBroadcastWarRoom() {
  const stages = [
    ['Queued', '412,700', '72%'],
    ['Sent', '947,300', '64%'],
    ['Retry watch', '412', '18%'],
    ['Dead letters', '0', '2%'],
  ]

  return (
    <main className="app-design app-design-warroom">
      <aside className="warroom-rail">
        <div>
          <span>War room</span>
          <strong>{tenant}</strong>
        </div>
        <RailNav active="Broadcast monitor" />
        <section aria-label="Role and budget">
          <span>Role and budget</span>
          <strong>Operations lead</strong>
          <p>Runtime send authority / 4.8M credits / retry threshold 0.8%</p>
        </section>
      </aside>

      <section className="warroom-main">
        <header className="warroom-header">
          <div>
            <span>Runtime command surface</span>
            <h1>Realtime Broadcast War Room</h1>
          </div>
          <AppDesignResourceLinks tone="dark" />
        </header>

        <section className="warroom-monitor" aria-label="Campaigns broadcast monitor">
          <div>
            <span>Campaigns / broadcast monitor</span>
            <strong>Summer Preview is moving at 41.8k/min.</strong>
            <p>64 active workers / ETA 18m / no provider incidents / manual refresh armed.</p>
          </div>
          <div className="warroom-radar" aria-label="Dashboard">
            <b>LIVE</b>
            <i />
            <i />
            <i />
          </div>
        </section>

        <section className="warroom-stages" aria-label="Broadcast status">
          {stages.map(([label, value, width]) => (
            <article key={label}>
              <div>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
              <i style={{ width }} />
            </article>
          ))}
        </section>

        <div className="warroom-bottom">
          <section aria-label="Subscribers segments">
            <span>Subscribers</span>
            <strong>VIP Customers / West Region</strong>
            <p>Consent-filtered modeled audience: 375k.</p>
          </section>
          <section aria-label="Analytics reporting">
            <span>Analytics</span>
            <strong>Delivery curve stable</strong>
            <p>Clicks, redemptions, provider latency, and retry heat are streaming.</p>
          </section>
          <section aria-label="Settings team budget compliance">
            <span>Settings</span>
            <strong>Escalation policy</strong>
            <p>Pause rights limited to owner and operations lead while budget remains green.</p>
          </section>
        </div>
      </section>
    </main>
  )
}

function MobileRegionalManager() {
  return (
    <main className="app-design app-design-mobile">
      <section className="mobile-device" aria-label="Mobile authenticated app shell">
        <header className="mobile-statusbar">
          <span>Southwest market</span>
          <strong>2,375 credits</strong>
        </header>

        <section className="mobile-hero" aria-label="Dashboard">
          <span>Regional manager</span>
          <h1>Regional Manager Mobile Console</h1>
          <p>Three store campaigns need review before the afternoon send window.</p>
        </section>

        <nav className="mobile-tabs" aria-label="Mobile design navigation">
          {['Home', 'Sends', 'Segments', 'Reports'].map((item) => (
            <span className={item === 'Home' ? 'active' : ''} key={item}>
              {item}
            </span>
          ))}
        </nav>

        <section className="mobile-live-card" aria-label="Campaigns broadcast monitor">
          <span>Campaigns / broadcast monitor</span>
          <strong>Memorial Day Promo</strong>
          <p>947k sent / 41.8k per minute / ETA 18m</p>
        </section>

        <section className="mobile-stack">
          <article aria-label="Subscribers segments">
            <span>Subscribers</span>
            <strong>West Region</strong>
            <p>125k modeled / consent confirmed / import ready</p>
          </article>
          <article aria-label="Analytics reporting">
            <span>Analytics</span>
            <strong>45 redemptions</strong>
            <p>Store leaderboard and tracked-link report ready</p>
          </article>
          <article aria-label="Settings team budget compliance">
            <span>Settings</span>
            <strong>Team budget</strong>
            <p>Regional manager / Southwest only / compliance copy locked</p>
          </article>
        </section>
      </section>

      <aside className="mobile-companion">
        <div>
          <span>Role and budget</span>
          <strong>{tenant}</strong>
          <p>{owner} / regional manager with limited budget and local segments.</p>
        </div>
        <RailNav active="Subscribers" />
        <AppDesignResourceLinks />
      </aside>
    </main>
  )
}

function ComplianceConsentCenter() {
  const auditRows = [
    ['Campaigns', 'Winback Offer', 'Needs legal copy approval'],
    ['Subscribers', 'CSV import #1842', '2,410 rows missing source notes'],
    ['Broadcast monitor', 'Summer Preview', 'Approved / send window open'],
    ['Analytics', 'Consent decay report', 'Export ready for compliance review'],
  ]

  return (
    <main className="app-design app-design-compliance">
      <header className="compliance-topbar">
        <div>
          <span>Consent operations</span>
          <h1>Compliance Consent Command Center</h1>
        </div>
        <AppDesignResourceLinks />
      </header>

      <section className="compliance-shell">
        <aside className="compliance-nav">
          <strong>{tenant}</strong>
          <RailNav active="Settings" />
          <section aria-label="Role and budget">
            <span>Role and budget</span>
            <p>Compliance admin / budget releases require approval notes</p>
          </section>
        </aside>

        <section className="compliance-review" aria-label="Dashboard command surface">
          <div className="compliance-score">
            <span>Risk queue</span>
            <strong>7 approvals before next broadcast.</strong>
            <p>Consent evidence, quiet hours, opt-out language, and audience source are checked together.</p>
          </div>
          <div className="compliance-table" aria-label="Campaigns subscribers broadcast monitor analytics">
            {auditRows.map(([label, title, detail]) => (
              <article key={title}>
                <span>{label}</span>
                <strong>{title}</strong>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="compliance-ledger" aria-label="Settings team budget compliance">
          <section>
            <span>Compliance</span>
            <strong>Consent ledger</strong>
            <p>Double opt-in, company-provided, opt-out, and unknown source cohorts are separated.</p>
          </section>
          <section>
            <span>Team</span>
            <strong>Approval chain</strong>
            <p>Legal reviewer, company owner, and internal admin escalation are recorded.</p>
          </section>
          <section>
            <span>Budget</span>
            <strong>Hold 2250 credits</strong>
            <p>Credits unlock only after the risk queue clears.</p>
          </section>
        </aside>
      </section>
    </main>
  )
}

function AgencyMultiTenantConsole() {
  const tenants = [
    ['Demo Retail Co', 'Runtime', '1.36M reach'],
    ['Acme Retail', 'Draft', '50k limit'],
    ['North Market', 'Review', '83k reach'],
  ]

  return (
    <main className="app-design app-design-agency">
      <header className="agency-topbar">
        <div>
          <span>Agency operator</span>
          <h1>Agency Multi-tenant Console</h1>
        </div>
        <AppDesignResourceLinks tone="dark" />
      </header>

      <section className="agency-shell">
        <aside className="agency-tenants">
          <div className="agency-identity" aria-label="Role and budget">
            <span>Role and budget</span>
            <strong>Agency admin</strong>
            <p>12 customer tenants / pooled 8.4M credits / internal operator access</p>
          </div>
          <nav aria-label="Tenant switcher">
            {tenants.map(([name, status, detail], index) => (
              <span className={index === 0 ? 'active' : ''} key={name}>
                <b>{name}</b>
                <small>
                  {status} / {detail}
                </small>
              </span>
            ))}
          </nav>
        </aside>

        <section className="agency-command" aria-label="Dashboard command surface">
          <div className="agency-client-header">
            <span>Selected tenant</span>
            <strong>{tenant}</strong>
            <p>Switch accounts, inspect broadcasts, and rebalance customer budgets from one operator surface.</p>
          </div>

          <div className="agency-grid">
            <section aria-label="Campaigns broadcast monitor">
              <span>Campaigns / broadcast monitor</span>
              <strong>Summer Preview running</strong>
              <p>947k sent / 412 retries / ETA 18m / escalation owner assigned.</p>
            </section>
            <section aria-label="Subscribers segments">
              <span>Subscribers</span>
              <strong>2.65M modeled</strong>
              <p>VIP Customers, West Region, loyalty import, and opt-in cohorts.</p>
            </section>
            <section aria-label="Analytics reporting">
              <span>Analytics</span>
              <strong>Cross-tenant report</strong>
              <p>Delivery, clicks, redemptions, credit burn, and margin by client.</p>
            </section>
            <section aria-label="Settings team budget compliance">
              <span>Settings</span>
              <strong>Tenant budget controls</strong>
              <p>Invite codes, agency seats, compliance notes, and monthly send limits.</p>
            </section>
          </div>
        </section>
      </section>
    </main>
  )
}

export function AppDesignExploration({ id }: { id: AppDesignId }) {
  if (id === '1') return <OperatorConsole />
  if (id === '2') return <ExecutiveSaas />
  if (id === '3') return <CampaignStudio />
  if (id === '4') return <DataCommandCenter />
  if (id === '5') return <RetailOpsWorkspace />
  if (id === '6') return <MinimalEnterpriseWorkspace />
  if (id === '7') return <RealtimeBroadcastWarRoom />
  if (id === '8') return <MobileRegionalManager />
  if (id === '9') return <ComplianceConsentCenter />
  return <AgencyMultiTenantConsole />
}
