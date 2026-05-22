import { API_BASE_URL } from '../api/client'
import { MetricCard } from '../components/MetricCard'
import { QuotaBar } from '../components/QuotaBar'

export function MarketingPage({
  onCustomerAccess,
  onInternalAccess,
}: {
  onCustomerAccess: () => void
  onInternalAccess?: () => void
}) {
  return (
    <main className="marketing-site">
      <header className="marketing-nav">
        <strong>CampaignOS</strong>
        <nav aria-label="Public navigation">
          <a href="#platform">Platform</a>
          <a href="#pricing">Pricing</a>
          <button className="secondary" onClick={onCustomerAccess}>
            Customer login
          </button>
          {onInternalAccess ? (
            <button className="ghost" onClick={onInternalAccess}>
              Internal
            </button>
          ) : null}
        </nav>
      </header>

      <section className="marketing-hero">
        <div>
          <p className="eyebrow">Multi-tenant SMS campaign SaaS</p>
          <h1>CampaignOS</h1>
          <p>
            Contracted SMS workspaces for brands and regional teams that need credit controls, tracked links, reminders,
            and reporting without spreadsheet reconciliation.
          </p>
          <div className="hero-actions">
            <button onClick={onCustomerAccess}>Start with access code</button>
            <a className="docs-link secondary-link" href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">
              API docs
            </a>
          </div>
        </div>
        <div className="product-shot" aria-label="Product summary">
          <div className="product-shot-header">
            <span>Acme Retail</span>
            <strong>Workspace health</strong>
          </div>
          <div className="product-metrics">
            <MetricCard label="Messages this month" value="18,420" trend="Pacing 12% under quota" />
            <MetricCard label="Credits remaining" value="42,000" trend="Contract balance" />
            <MetricCard label="Reminder lift" value="+14%" trend="Tracked campaigns" tone="good" />
            <QuotaBar label="Monthly quota" used={18000} limit={50000} />
          </div>
        </div>
      </section>

      <section className="marketing-band" id="platform">
        <div>
          <span>01</span>
          <h2>Tenant setup</h2>
          <p>Internal operators create each company, assign contract credits, and issue the first admin access code.</p>
        </div>
        <div>
          <span>02</span>
          <h2>Company workspaces</h2>
          <p>Customer teams manage subscribers, campaigns, media assets, and role-specific budgets from one dashboard.</p>
        </div>
        <div>
          <span>03</span>
          <h2>Credit-aware sending</h2>
          <p>Regular and smart SMS flows account for credits before campaigns leave the platform.</p>
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div>
          <p className="eyebrow">Usage model</p>
          <h2>Simple credits for real campaign economics.</h2>
        </div>
        <div className="pricing-grid">
          <div>
            <strong>Regular SMS</strong>
            <span>1 credit per recipient segment</span>
          </div>
          <div>
            <strong>Smart SMS</strong>
            <span>2 credits with tracking and reminder support</span>
          </div>
          <div>
            <strong>Budget guardrails</strong>
            <span>Company and user-level limits block overspend</span>
          </div>
        </div>
      </section>
    </main>
  )
}
