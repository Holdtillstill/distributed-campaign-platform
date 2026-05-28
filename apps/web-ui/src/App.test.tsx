import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'

const SESSION_KEY = 'campaign-platform-session'

const okJson = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: true,
    status,
    statusText: 'OK',
    json: () => Promise.resolve(body),
  } as Response)

const notFoundJson = (body: unknown) =>
  Promise.resolve({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    json: () => Promise.resolve(body),
  } as Response)

function mockFetch() {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'

    if (url.endsWith('/admin/companies') && method === 'POST') {
      return okJson(
        {
          id: 'company-1',
          name: 'Acme Retail',
          slug: 'acme-retail',
          monthly_send_limit: 50000,
          credit_balance: 50000,
          access_code: 'ACME-1234',
          admin_user: { id: 'user-1', email: 'admin@acme.test', role: 'customer_admin' },
        },
        201,
      )
    }

    if (url.endsWith('/admin/usage?from=2026-05-01&to=2026-05-21')) {
      return okJson([
        {
          company_id: 'company-1',
          company_name: 'Acme Retail',
          campaign_count: 3,
          message_count: 12,
          media_asset_count: 1,
          tracked_link_count: 2,
          click_count: 4,
          redemption_count: 1,
          reminder_count: 1,
        },
      ])
    }

    if (url.endsWith('/admin/company-health?from=2026-05-22&to=2026-06-21')) {
      return okJson([
        {
          company_id: 'company-1',
          company_name: 'Acme Retail',
          subscriber_count: 1200,
          campaign_count: 14,
          scheduled_reach: 850,
          credits_remaining: 9200,
          monthly_send_limit: 10000,
          quota_usage: 0.85,
          active_access_code: 'ACME-1234',
        },
        {
          company_id: 'company-demo',
          company_name: 'Demo Retail Co',
          subscriber_count: 2450,
          campaign_count: 7,
          scheduled_reach: 1125,
          credits_remaining: 44000,
          monthly_send_limit: 50000,
          quota_usage: 0.225,
          active_access_code: 'DEMO-2026',
        },
      ])
    }

    if (url.endsWith('/admin/dashboard-summary')) {
      return okJson({
        company_count: 10,
        active_company_count: 9,
        total_credit_balance: 92000,
        active_access_code_count: 6,
      })
    }

    if (url.endsWith('/healthz')) {
      return okJson({ status: 'ok', service: 'campaign-api' })
    }

    if (url.endsWith('/readyz')) {
      return okJson({ status: 'ready', service: 'campaign-api' })
    }

    if (url.endsWith('/metrics')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('campaign_api_service_info 1'),
      } as Response)
    }

    if (url.endsWith('/observability/trace-smoke')) {
      return okJson({
        status: 'ok',
        service: 'campaign-api',
        trace_id: '0'.repeat(32),
        span_id: '0'.repeat(16),
        sampled: false,
      })
    }

    if (url.endsWith('/signup/access-code') && method === 'POST') {
      return okJson(
        {
          role: 'company_user',
          email: 'owner@acme.test',
          company_id: 'company-1',
          company_name: 'Acme Retail',
          membership_role: 'customer_admin',
          credit_limit: null,
        },
        201,
      )
    }

    if (url.endsWith('/me/memberships')) {
      const email = (init?.headers as Record<string, string> | undefined)?.['X-User-Email']
      if (email === 'missing@acme.test') return okJson([])
      return okJson([
        {
          company_id: 'company-1',
          company_name: 'Acme Retail',
          company_slug: 'acme-retail',
          role: 'customer_admin',
          credit_limit: 50000,
          credits_used: 0,
        },
      ])
    }

    if (url.endsWith('/companies/company-1/dashboard-summary')) {
      return okJson({
        company_id: 'company-1',
        company_name: 'Acme Retail',
        monthly_send_limit: 50000,
        credit_balance: 42000,
        subscriber_count: 123,
        campaign_count: 4,
        message_count: 1000,
        credits_used: 8000,
        click_count: 123,
        redemption_count: 45,
      })
    }

    if (url.endsWith('/companies/company-1/campaign-performance')) {
      return okJson({
        media_asset_count: 1,
        tracked_link_count: 1,
        click_count: 123,
        redemption_count: 45,
      })
    }

    if (url.endsWith('/companies/company-1/media-assets') && method === 'POST') {
      return okJson({
        id: 'media-1',
        company_id: 'company-1',
        filename: 'coupon.png',
        content_type: 'image/png',
        url: 'https://cdn.example/coupon.png',
      })
    }

    if (url.endsWith('/companies/company-1/media-assets')) {
      return okJson([
        {
          id: 'media-1',
          company_id: 'company-1',
          filename: 'coupon.png',
          content_type: 'image/png',
          url: 'https://cdn.example/coupon.png',
        },
      ])
    }

    if (url.endsWith('/companies/company-1/campaigns')) {
      return okJson([
        {
          id: 'campaign-upcoming',
          company_id: 'company-1',
          name: 'Memorial Day Promo',
          message_type: 'smart',
          status: 'scheduled',
          scheduled_at: '2026-05-25T16:00:00Z',
          created_at: '2026-05-22T05:00:00Z',
          message_count: 2,
          credit_cost: 4,
          reminder_count: 0,
        },
        {
          id: 'campaign-past',
          company_id: 'company-1',
          name: 'Spring Launch',
          message_type: 'regular',
          status: 'sent',
          scheduled_at: '2026-05-20T16:00:00Z',
          created_at: '2026-05-20T15:00:00Z',
          message_count: 10,
          credit_cost: 10,
          reminder_count: 1,
        },
      ])
    }

    if (url.endsWith('/companies/company-demo/campaigns')) {
      return okJson([
        {
          id: 'demo-upcoming',
          company_id: 'company-demo',
          name: 'Summer Preview',
          message_type: 'smart',
          status: 'scheduled',
          scheduled_at: '2026-06-01T17:30:00Z',
          created_at: '2026-05-22T05:00:00Z',
          message_count: 1125,
          credit_cost: 2250,
          reminder_count: 0,
        },
        {
          id: 'demo-past',
          company_id: 'company-demo',
          name: 'Spring Clearance',
          message_type: 'regular',
          status: 'sent',
          scheduled_at: '2026-05-18T18:00:00Z',
          created_at: '2026-05-17T15:00:00Z',
          message_count: 980,
          credit_cost: 980,
          reminder_count: 1,
        },
      ])
    }

    if (url.endsWith('/companies/company-1/campaign-links') && method === 'POST') {
      return okJson({
        id: 'link-1',
        token: 'spring-token',
        public_url: '/r/spring-token',
        company_id: 'company-1',
        campaign_id: 'campaign-1',
        subscriber_id: 'subscriber-1',
        media_asset_id: 'media-1',
        destination_url: 'https://example.com/spring',
        click_count: 0,
        redeemed_count: 0,
      })
    }

    if (url.endsWith('/companies/company-1/campaign-links')) {
      return okJson([
        {
          id: 'link-1',
          token: 'spring-token',
          public_url: '/r/spring-token',
          company_id: 'company-1',
          campaign_id: 'campaign-1',
          subscriber_id: 'subscriber-1',
          media_asset_id: 'media-1',
          destination_url: 'https://example.com/spring',
          click_count: 1,
          redeemed_count: 1,
        },
      ])
    }

    if (url.endsWith('/companies/company-1/subscriber-lists') && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { name?: string }
      return okJson({ id: body.name === 'Phoenix VIP' ? 'list-phoenix-vip' : 'list-1', company_id: 'company-1', name: body.name ?? 'VIP List', subscriber_count: 0 }, 201)
    }

    if (url.endsWith('/companies/company-1/subscriber-lists') && method === 'GET') {
      return okJson([
        { id: 'list-vip', company_id: 'company-1', name: 'VIP Customers', subscriber_count: 2 },
        { id: 'list-west', company_id: 'company-1', name: 'West Region', subscriber_count: 1 },
      ])
    }

    if (url.endsWith('/companies/company-1/subscribers') && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        phone_number?: string
        source?: string
        list_id?: string
      }
      return okJson({
        id: `subscriber-${body.phone_number?.slice(-4) ?? '1'}`,
        company_id: 'company-1',
        phone_number: body.phone_number ?? '+15550001010',
        source: body.source ?? 'import',
        list_id: body.list_id ?? 'list-1',
        marketing_status: 'imported',
        consent_status: 'company_provided',
      })
    }

    if (url.endsWith('/companies/company-1/subscribers') && method === 'GET') {
      return okJson([
        {
          id: 'subscriber-1',
          company_id: 'company-1',
          phone_number: '+15550001001',
          marketing_status: 'confirmed',
          consent_status: 'double_opt_in_confirmed',
          list_id: 'list-vip',
          source: 'loyalty',
          region: 'Phoenix',
          created_at: '2026-05-20T15:00:00Z',
        },
        {
          id: 'subscriber-2',
          company_id: 'company-1',
          phone_number: '+15550001002',
          marketing_status: 'imported',
          consent_status: 'company_provided',
          list_id: 'list-west',
          source: 'csv_import',
          region: 'West',
          created_at: '2026-05-21T15:00:00Z',
        },
      ])
    }

    if (url.endsWith('/public/opt-ins') && method === 'POST') {
      return okJson({
        subscriber_id: 'subscriber-2',
        company_id: 'company-1',
        phone_number: '+15550001011',
        status: 'pending_confirmation',
        confirmation_token: 'opt-token-1',
      })
    }

    if (url.endsWith('/public/opt-ins/opt-token-1/confirm') && method === 'POST') {
      return okJson({
        subscriber_id: 'subscriber-2',
        company_id: 'company-1',
        phone_number: '+15550001011',
        status: 'confirmed',
      })
    }

    if (url.endsWith('/campaigns') && method === 'POST') {
      return okJson(
        {
          id: 'campaign-1',
          company_id: 'company-1',
          name: 'Memorial Day Promo',
          message_type: 'smart',
          status: 'scheduled',
          scheduled_at: '2026-05-25T16:00:00Z',
          audience_count: 3,
          message_count: 2,
          credit_cost: 4,
          remaining_credits: 41996,
          tracked_links: [
            {
              subscriber_id: 'subscriber-1',
              media_asset_id: 'media-1',
              public_url: '/r/spring-token-1',
            },
            {
              subscriber_id: 'subscriber-2',
              media_asset_id: 'media-1',
              public_url: '/r/spring-token-2',
            },
          ],
          status_counts: { queued: 2, sent: 0, failed: 0, retried: 0, dead_lettered: 0 },
        },
        201,
      )
    }

    if (url.endsWith('/companies/company-1/reminder-campaigns') && method === 'POST') {
      return okJson({
        id: 'reminder-1',
        company_id: 'company-1',
        source_campaign_id: 'campaign-1',
        audience_rule: 'clicked_not_redeemed',
        message_body: 'Still interested?',
        status: 'draft',
        estimated_recipient_count: 2,
      })
    }

    if (url.endsWith('/companies/company-1/reminder-campaigns')) {
      return okJson([
        {
          id: 'reminder-1',
          company_id: 'company-1',
          source_campaign_id: 'campaign-1',
          audience_rule: 'clicked_not_redeemed',
          message_body: 'Still interested?',
          status: 'draft',
          estimated_recipient_count: 2,
        },
      ])
    }

    if (url.endsWith('/companies/company-1/access-codes') && method === 'POST') {
      return okJson(
        { code: 'ACME-MGR1', company_id: 'company-1', role: 'campaign_manager', credit_limit: 2000 },
        201,
      )
    }

    if (url.endsWith('/companies/company-1/users') && method === 'GET') {
      return okJson([
        {
          user_id: 'user-1',
          email: 'owner@acme.test',
          display_name: 'Acme Owner',
          role: 'customer_admin',
          credit_limit: 50000,
          credits_used: 125,
        },
      ])
    }

    if (url.endsWith('/companies/company-1/users/owner%40acme.test') && method === 'PATCH') {
      return okJson({
        user_id: 'user-1',
        email: 'owner@acme.test',
        display_name: 'Acme Owner',
        role: 'regional_manager',
        credit_limit: 2500,
        credits_used: 125,
      })
    }

    if (url.endsWith('/signup/access-code') && method === 'POST') {
      return notFoundJson({ detail: 'access code not found' })
    }

    return Promise.reject(new Error(`Unexpected request: ${method} ${url}`))
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function loginAsInternalAdmin(user: ReturnType<typeof userEvent.setup>) {
  await user.clear(screen.getByLabelText(/admin email/i))
  await user.type(screen.getByLabelText(/admin email/i), 'ops@example.test')
  await user.click(screen.getByRole('button', { name: /login as internal admin/i }))
}

async function signupAsCompanyUser(user: ReturnType<typeof userEvent.setup>) {
  await user.clear(screen.getByLabelText(/work email/i))
  await user.type(screen.getByLabelText(/work email/i), 'owner@acme.test')
  await user.clear(screen.getByLabelText(/full name/i))
  await user.type(screen.getByLabelText(/full name/i), 'Acme Owner')
  await user.clear(screen.getByLabelText(/access code/i))
  await user.type(screen.getByLabelText(/access code/i), 'ACME-1234')
  await user.click(screen.getByRole('button', { name: /sign up with access code/i }))
}

describe('App', () => {
  afterEach(() => {
    window.localStorage.clear()
    window.history.pushState(null, '', '/')
    vi.unstubAllGlobals()
  })

  it('shows a customer-facing marketing site on the main URL', () => {
    mockFetch()

    render(<App />)

    expect(screen.getByRole('heading', { name: /CampaignOS/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Regular SMS/i)).not.toHaveLength(0)
    expect(screen.queryByRole('button', { name: /login as internal admin/i })).not.toBeInTheDocument()
  })

  it('shows company login and signup choices from the customer app surface', async () => {
    mockFetch()
    const user = userEvent.setup()

    render(<App />)
    await user.click(screen.getByRole('button', { name: /customer login/i }))

    expect(screen.getByRole('button', { name: /sign up with access code/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /find my companies/i })).toBeInTheDocument()
  })

  it('shows customer access on /app even with an internal admin session', async () => {
    mockFetch()
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'internal_admin', email: 'ops@example.test' }))
    window.history.pushState(null, '', '/app')

    render(<App />)

    expect(screen.getByRole('heading', { name: /sign in to your campaign workspace/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up with access code/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^companies$/i })).not.toBeInTheDocument()
  })

  it('lets internal admin log in and see admin nav only', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/internal')
    render(<App />)
    await loginAsInternalAdmin(user)

    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /companies/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /usage/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /campaigns/i })).not.toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? '{}')).toMatchObject({
      role: 'internal_admin',
      email: 'ops@example.test',
    })
  })

  it('loads actual admin dashboard company totals from the backend', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/internal')
    render(<App />)
    await loginAsInternalAdmin(user)

    expect(await screen.findAllByText(/active companies/i)).not.toHaveLength(0)
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getAllByText('92,000')).not.toHaveLength(0)
  })

  it('renders internal admin company health with scheduled reach and quota risk', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/internal')
    render(<App />)
    await loginAsInternalAdmin(user)

    expect(await screen.findByText(/tenant health/i)).toBeInTheDocument()
    expect(screen.getByText(/scheduled reach next 30 days/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Acme Retail/i)).not.toHaveLength(0)
    expect(screen.getAllByText('1,200')).not.toHaveLength(0)
    expect(screen.getAllByText('850')).not.toHaveLength(0)
    expect(screen.getByText('ACME-1234')).toBeInTheDocument()
  })

  it('surfaces observability links and a trace smoke check for internal admins', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/internal')
    render(<App />)
    await loginAsInternalAdmin(user)

    expect(await screen.findByRole('link', { name: /grafana/i })).toHaveAttribute('href', 'http://127.0.0.1:3000')
    expect(screen.getByRole('link', { name: /tempo/i })).toHaveAttribute('href', 'http://127.0.0.1:3000/explore')
    expect(screen.getByRole('link', { name: /prometheus/i })).toHaveAttribute('href', 'http://127.0.0.1:9090')

    await user.click(screen.getByRole('button', { name: /refresh checks/i }))

    expect(await screen.findByText('/observability/trace-smoke responded 200')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/observability/trace-smoke')
  })

  it('shows internal admin layout and company health table scaffold', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/internal')
    render(<App />)
    await loginAsInternalAdmin(user)
    await user.click(screen.getByRole('button', { name: /^companies$/i }))

    expect(screen.getByLabelText(/admin navigation/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^companies$/i })).toBeInTheDocument()
    expect(screen.getByText(/existing companies/i)).toBeInTheDocument()
    expect(screen.getByText(/monthly limit/i)).toBeInTheDocument()
    expect(screen.getByText(/scheduled reach/i)).toBeInTheDocument()
    expect(screen.getAllByText(/access code/i)).not.toHaveLength(0)
  })

  it('opens a company detail workspace from Review with Demo Retail Co health fields', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/internal')
    render(<App />)
    await loginAsInternalAdmin(user)
    await user.click(screen.getByRole('button', { name: /^companies$/i }))

    const demoRow = await screen.findByRole('row', { name: /Demo Retail Co/i })
    await user.click(within(demoRow).getByRole('button', { name: /review demo retail co/i }))

    expect(await screen.findByRole('heading', { name: /Demo Retail Co workspace/i })).toBeInTheDocument()
    expect(screen.getByText('company-demo')).toBeInTheDocument()
    expect(screen.getAllByText('2,450')).not.toHaveLength(0)
    expect(screen.getAllByText('1,125')).not.toHaveLength(0)
    expect(screen.getAllByText('44,000')).not.toHaveLength(0)
    expect(screen.getAllByText('50,000')).not.toHaveLength(0)
    expect(screen.getAllByText(/23% used/i)).not.toHaveLength(0)
    expect(screen.getAllByText('DEMO-2026')).not.toHaveLength(0)
    expect(screen.getByText(/Summer Preview/i)).toBeInTheDocument()
    expect(screen.getByText(/Operator notes have not been added/i)).toBeInTheDocument()
  })

  it('lets internal admin create a company and displays quota plus access code', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/internal')
    render(<App />)
    await loginAsInternalAdmin(user)
    await user.click(screen.getByRole('button', { name: /companies/i }))
    await user.clear(screen.getByLabelText(/company name/i))
    await user.type(screen.getByLabelText(/company name/i), 'Acme Retail')
    await user.clear(screen.getByLabelText(/company slug/i))
    await user.type(screen.getByLabelText(/company slug/i), 'acme-retail')
    await user.clear(screen.getByLabelText(/initial admin email/i))
    await user.type(screen.getByLabelText(/initial admin email/i), 'admin@acme.test')
    await user.clear(screen.getByLabelText(/monthly send limit/i))
    await user.type(screen.getByLabelText(/monthly send limit/i), '50000')
    await user.clear(screen.getByLabelText(/contract credits/i))
    await user.type(screen.getByLabelText(/contract credits/i), '50000')
    await user.click(screen.getByRole('button', { name: /create company/i }))

    expect(await screen.findByText(/give this code to the initial company admin/i)).toBeInTheDocument()
    expect(screen.getAllByText(/ACME-1234/i)).not.toHaveLength(0)
    expect(screen.getAllByText(/50,000/)).not.toHaveLength(0)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/companies',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Internal-Admin': 'true' }),
        body: JSON.stringify({
          name: 'Acme Retail',
          slug: 'acme-retail',
          admin_email: 'admin@acme.test',
          monthly_send_limit: 50000,
          credit_balance: 50000,
        }),
      }),
    )
  })

  it('signs up a company user with an access code and lands in the company app', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)

    expect(await screen.findByRole('heading', { name: /company dashboard/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Acme Retail/)).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: /campaigns/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /companies/i })).not.toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? '{}')).toMatchObject({
      role: 'company_user',
      email: 'owner@acme.test',
      companyId: 'company-1',
      companyName: 'Acme Retail',
    })
  })

  it('shows quota bar and quick actions on company dashboard without Not set', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)

    expect(await screen.findByRole('heading', { name: /company dashboard/i })).toBeInTheDocument()
    expect(screen.queryByText(/not set/i)).not.toBeInTheDocument()
    expect(screen.getByText(/monthly send quota/i)).toBeInTheDocument()
    expect(screen.getByText(/create campaign/i)).toBeInTheDocument()
    expect(screen.getByText(/import subscribers/i)).toBeInTheDocument()
    expect(screen.getByText(/upload media/i)).toBeInTheDocument()
    expect(screen.getByText(/view analytics/i)).toBeInTheDocument()
  })

  it('logs company users in by email membership lookup', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await user.clear(screen.getByLabelText(/login email/i))
    await user.type(screen.getByLabelText(/login email/i), 'owner@acme.test')
    await user.click(screen.getByRole('button', { name: /find my companies/i }))
    const membership = await screen.findByRole('listitem', { name: /acme retail/i })
    await user.click(within(membership).getByRole('button', { name: /open acme retail/i }))

    expect(await screen.findByRole('heading', { name: /company dashboard/i })).toBeInTheDocument()
    expect(screen.getByText(/owner@acme.test/)).toBeInTheDocument()
  })

  it('shows a helpful login message when no memberships exist', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await user.clear(screen.getByLabelText(/login email/i))
    await user.type(screen.getByLabelText(/login email/i), 'missing@acme.test')
    await user.click(screen.getByRole('button', { name: /find my companies/i }))

    expect(await screen.findByText(/No companies found/i)).toBeInTheDocument()
  })

  it('switches company user pages one at a time', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)

    await user.click(screen.getByRole('button', { name: /campaigns/i }))
    expect(screen.getByRole('heading', { name: /campaigns/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /subscribers/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^subscribers$/i }))
    expect(screen.getByRole('heading', { name: /subscribers/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /campaigns/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /content library/i }))
    expect(screen.getByRole('heading', { name: /content library/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /subscribers/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /analytics/i }))
    expect(screen.getByRole('heading', { name: /analytics/i })).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /reminders/i })).not.toBeInTheDocument()
  })

  it('schedules campaigns from subscriber segments instead of raw phone numbers', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /campaigns/i }))
    expect(await screen.findByRole('heading', { name: /upcoming/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/campaign name/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /create campaign/i }))
    expect(await screen.findByText(/VIP Customers/)).toBeInTheDocument()
    expect(await screen.findByText(/\+15550001001/)).toBeInTheDocument()
    await user.clear(screen.getByLabelText(/campaign name/i))
    await user.type(screen.getByLabelText(/campaign name/i), 'Memorial Day Promo')
    await user.clear(screen.getByLabelText(/message body/i))
    await user.type(screen.getByLabelText(/message body/i), 'Launch copy')
    await user.selectOptions(screen.getByLabelText(/message type/i), 'smart')
    await user.selectOptions(screen.getByLabelText(/smart sms media/i), 'media-1')
    await user.click(screen.getByLabelText(/VIP Customers/i))
    await user.click(screen.getByLabelText(/\+15550001002/i))
    await user.clear(screen.getByLabelText(/schedule date and time/i))
    await user.type(screen.getByLabelText(/schedule date and time/i), '2026-05-25T16:00')
    await user.click(screen.getByRole('button', { name: /schedule campaign/i }))

    expect(await screen.findAllByText(/campaign-1/i)).not.toHaveLength(0)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/campaigns',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Company-Id': 'company-1',
          'X-User-Email': 'owner@acme.test',
        }),
        body: JSON.stringify({
          name: 'Memorial Day Promo',
          body: 'Launch copy',
          message_type: 'smart',
          media_asset_id: 'media-1',
          subscriber_list_ids: ['list-vip'],
          subscriber_ids: ['subscriber-2'],
          scheduled_at: '2026-05-25T16:00',
        }),
      }),
    )
  })

  it('keeps follow-up reminders out of the campaign overview until the Follow-ups tab is selected', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /campaigns/i }))

    expect(await screen.findByRole('heading', { name: /upcoming/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Memorial Day Promo/i)).not.toHaveLength(0)
    expect(screen.getByRole('heading', { name: /past/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Spring Launch/i)).not.toHaveLength(0)
    expect(screen.queryByLabelText(/follow-up source campaign/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /follow-ups/i }))

    expect(screen.getByLabelText(/follow-up source campaign/i)).toBeInTheDocument()
  })

  it('shows subscriber segment cards, a selected subscriber table, and imports pasted CSV rows', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /^subscribers$/i }))

    expect(await screen.findAllByText(/VIP Customers/i)).not.toHaveLength(0)
    expect(screen.getByRole('table', { name: /subscriber directory/i })).toBeInTheDocument()
    expect(screen.getByText('+15550001001')).toBeInTheDocument()
    expect(screen.getByText(/double_opt_in_confirmed/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /West Region/i }))
    expect(screen.queryByText('+15550001001')).not.toBeInTheDocument()
    expect(screen.getByText('+15550001002')).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/paste csv subscribers/i))
    await user.type(
      screen.getByLabelText(/paste csv subscribers/i),
      'phone_number,list_name,region,source\n+15550001003,Phoenix VIP,Phoenix,trade_show\n+15550001004,Phoenix VIP,Phoenix,pos',
    )
    await user.click(screen.getByRole('button', { name: /import csv/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/companies/company-1/subscriber-lists',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Phoenix VIP' }),
        }),
      )
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/companies/company-1/subscribers',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ phone_number: '+15550001003', source: 'trade_show', list_id: 'list-phoenix-vip' }),
        }),
      )
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/companies/company-1/subscribers',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ phone_number: '+15550001004', source: 'pos', list_id: 'list-phoenix-vip' }),
        }),
      )
    })
    expect(await screen.findByText(/Imported 2 subscribers/i)).toBeInTheDocument()
  })

  it('lists media assets and supports url plus upload-style content entry', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /content library/i }))

    expect(await screen.findAllByText(/coupon.png/i)).not.toHaveLength(0)
    await user.clear(screen.getByLabelText(/media filename/i))
    await user.type(screen.getByLabelText(/media filename/i), 'menu.png')
    await user.clear(screen.getByLabelText(/media url/i))
    await user.type(screen.getByLabelText(/media url/i), 'https://cdn.example/menu.png')
    await user.click(screen.getByRole('button', { name: /add url media/i }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/companies/company-1/media-assets',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          filename: 'menu.png',
          content_type: 'image/png',
          url: 'https://cdn.example/menu.png',
        }),
      }),
    )
    expect(screen.getByLabelText(/upload media file/i)).toBeInTheDocument()
  })

  it('shows realistic content template cards with suggested SMS copy', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /content library/i }))

    expect(await screen.findByText(/Memorial Day 30% Off Hero/i)).toBeInTheDocument()
    expect(screen.getByText(/VIP Loyalty Double Points/i)).toBeInTheDocument()
    expect(screen.getByText(/Weekend Flash Sale MMS/i)).toBeInTheDocument()
    expect(screen.getByText(/Winback Offer/i)).toBeInTheDocument()
    expect(screen.getByText(/Use code MEMORIAL30/i)).toBeInTheDocument()
  })

  it('uses a content template to move into the campaign builder with copy and media prefilled', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /content library/i }))

    const flashSaleCard = await screen.findByRole('article', { name: /Weekend Flash Sale MMS/i })
    await user.click(within(flashSaleCard).getByRole('button', { name: /use template/i }))

    expect(await screen.findByRole('heading', { name: /campaigns/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /builder/i })).toHaveClass('active')
    expect(screen.getByLabelText(/campaign name/i)).toHaveValue('Weekend Flash Sale MMS')
    expect(screen.getByLabelText(/message body/i)).toHaveValue(
      'Flash sale: our bestsellers are back in stock for 48 hours. Tap to shop before sizes sell out.',
    )
    expect(screen.getByLabelText(/message type/i)).toHaveValue('smart')
    expect(screen.getByLabelText(/smart sms media/i)).toHaveValue('media-1')
  })

  it('renders company analytics summaries from loaded tenant data', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /^analytics$/i }))

    expect(await screen.findByRole('heading', { name: /analytics/i })).toBeInTheDocument()
    expect(screen.getByText(/Scheduled reach/i)).toBeInTheDocument()
    expect(screen.getByText(/Subscriber lists/i)).toBeInTheDocument()
    expect(screen.getByText(/Message volume/i)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /campaign analytics summary/i })).toBeInTheDocument()
    expect(screen.getByText(/Memorial Day Promo/i)).toBeInTheDocument()
    expect(screen.getByText(/May 25, 2026/i)).toBeInTheDocument()
  })

  it('renders internal usage top tenant and scheduled reach summaries', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/internal')
    render(<App />)
    await loginAsInternalAdmin(user)
    await user.click(screen.getByRole('button', { name: /usage/i }))
    await user.click(screen.getByRole('button', { name: /load usage/i }))

    expect(await screen.findByText(/Top tenant by message volume/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Acme Retail/i)).not.toHaveLength(0)
    expect(screen.getAllByText(/Scheduled reach next 30 days/i)).not.toHaveLength(0)
    expect(screen.getByText('1,975')).toBeInTheDocument()
    expect(screen.getByText(/Highest quota usage/i)).toBeInTheDocument()
  })

  it('lets company admins create access codes and adjust team budgets', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.selectOptions(screen.getByLabelText(/invite role/i), 'campaign_manager')
    await user.clear(screen.getAllByLabelText(/user credit limit/i)[0])
    await user.type(screen.getAllByLabelText(/user credit limit/i)[0], '2000')
    await user.click(screen.getByRole('button', { name: /create user access code/i }))

    expect(await screen.findByText(/ACME-MGR1/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /refresh team/i }))
    expect(await screen.findAllByText(/owner@acme.test/)).not.toHaveLength(0)
    await user.clear(screen.getByLabelText(/user email/i))
    await user.type(screen.getByLabelText(/user email/i), 'owner@acme.test')
    await user.selectOptions(screen.getByLabelText(/user role/i), 'regional_manager')
    await user.clear(screen.getAllByLabelText(/user credit limit/i)[1])
    await user.type(screen.getAllByLabelText(/user credit limit/i)[1], '2500')
    await user.click(screen.getByRole('button', { name: /update user permissions/i }))

    expect(await screen.findByText(/regional_manager/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/companies/company-1/access-codes',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ role: 'campaign_manager', credit_limit: 2000 }),
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/companies/company-1/users/owner%40acme.test',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ role: 'regional_manager', credit_limit: 2500 }),
      }),
    )
  })

  it('clears the local session on logout', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)
    await waitFor(() => expect(window.localStorage.getItem(SESSION_KEY)).not.toBeNull())
    await user.click(screen.getByRole('button', { name: /logout/i }))

    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull()
    expect(screen.getByRole('heading', { name: /sign in to your campaign workspace/i })).toBeInTheDocument()
  })
})
