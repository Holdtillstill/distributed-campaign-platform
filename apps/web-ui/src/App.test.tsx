import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

function failedJson(body: unknown, status = 503) {
  return Promise.resolve({
    ok: false,
    status,
    statusText: 'Service Unavailable',
    json: () => Promise.resolve(body),
  } as Response)
}

const htmlAppShell = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'text/html' }),
    json: () => Promise.reject(new SyntaxError("Unexpected token '<'")),
    text: () => Promise.resolve('<!doctype html><html><body>Distributed Campaign Platform</body></html>'),
  } as Response)

function mockFetch({
  companyCampaigns,
  mediaAssets,
  monitorError = false,
  monitorResponses,
}: {
  companyCampaigns?: unknown[]
  mediaAssets?: unknown[]
  monitorError?: boolean
  monitorResponses?: Record<string, unknown>
} = {}) {
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
          subscriber_count: 2650000,
          campaign_count: 7,
          scheduled_reach: 1360000,
          credits_remaining: 4800000,
          monthly_send_limit: 4800000,
          quota_usage: 0.2833,
          active_access_code: 'DEMORETA-E568C9',
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
          credit_limit: 50000,
          credits_used: 125,
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
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        filename?: string
        content_type?: string
        url?: string
      }
      return okJson({
        id: 'media-1',
        company_id: 'company-1',
        filename: body.filename ?? 'coupon.png',
        content_type: body.content_type ?? 'image/png',
        url: body.url ?? 'https://cdn.example/coupon.png',
      })
    }

    if (url.endsWith('/companies/company-1/media-assets')) {
      return okJson(mediaAssets ?? [
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
      if (companyCampaigns) return okJson(companyCampaigns)
      return okJson([
        {
          id: 'campaign-upcoming',
          company_id: 'company-1',
          name: 'Memorial Day Promo',
          body: 'Memorial Day discount copy with MEMORIAL30 for weekend shoppers.',
          message_type: 'smart',
          status: 'scheduled',
          scheduled_at: '2026-05-25T16:00:00Z',
          created_at: '2026-05-22T05:00:00Z',
          message_count: 2,
          audience_count: 250000,
          audience_mode: 'projected_sample',
          credit_cost: 4,
          reminder_count: 0,
        },
        {
          id: 'campaign-past',
          company_id: 'company-1',
          name: 'Spring Launch',
          body: 'Spring clearance launch copy for loyalty members.',
          message_type: 'regular',
          status: 'sent',
          scheduled_at: '2026-05-20T16:00:00Z',
          created_at: '2026-05-20T15:00:00Z',
          message_count: 10,
          audience_count: 10,
          audience_mode: 'actual',
          credit_cost: 10,
          reminder_count: 1,
        },
        {
          id: 'campaign-cart',
          company_id: 'company-1',
          name: 'Cart Rescue',
          body: 'Abandoned cart reminder with free shipping today.',
          message_type: 'regular',
          status: 'queued',
          scheduled_at: null,
          created_at: '2026-05-23T15:00:00Z',
          message_count: 8,
          audience_count: 8,
          audience_mode: 'actual',
          credit_cost: 8,
          reminder_count: 0,
        },
      ])
    }

    if (url.endsWith('/companies/company-demo/campaigns')) {
      return okJson([
        {
          id: 'demo-upcoming',
          company_id: 'company-demo',
          name: 'Summer Preview',
          body: 'Summer preview copy for Demo Retail Co.',
          message_type: 'smart',
          status: 'scheduled',
          scheduled_at: '2026-06-01T17:30:00Z',
          created_at: '2026-05-22T05:00:00Z',
          message_count: 1125,
          audience_count: 1360000,
          audience_mode: 'projected_sample',
          credit_cost: 2250,
          reminder_count: 0,
        },
        {
          id: 'demo-past',
          company_id: 'company-demo',
          name: 'Spring Clearance',
          body: 'Spring clearance copy for Demo Retail Co.',
          message_type: 'regular',
          status: 'sent',
          scheduled_at: '2026-05-18T18:00:00Z',
          created_at: '2026-05-17T15:00:00Z',
          message_count: 980,
          audience_count: 980,
          audience_mode: 'actual',
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
      return okJson(
        {
          id: body.name === 'Phoenix VIP' ? 'list-phoenix-vip' : 'list-1',
          company_id: 'company-1',
          name: body.name ?? 'VIP List',
          subscriber_count: 0,
          sample_subscriber_count: 0,
          estimated_subscriber_count: 0,
        },
        201,
      )
    }

    if (url.endsWith('/companies/company-1/subscriber-lists') && method === 'GET') {
      return okJson([
        {
          id: 'list-vip',
          company_id: 'company-1',
          name: 'VIP Customers',
          subscriber_count: 250000,
          sample_subscriber_count: 2,
          estimated_subscriber_count: 250000,
        },
        {
          id: 'list-west',
          company_id: 'company-1',
          name: 'West Region',
          subscriber_count: 125000,
          sample_subscriber_count: 1,
          estimated_subscriber_count: 125000,
        },
      ])
    }

    if (url.startsWith('/api/companies/company-1/subscribers/search') && method === 'GET') {
      const parsedUrl = new URL(url, 'http://localhost')
      const listId = parsedUrl.searchParams.get('list_id')
      const consentStatus = parsedUrl.searchParams.get('consent_status')
      const query = parsedUrl.searchParams.get('q')?.toLowerCase() ?? ''
      const limit = Number(parsedUrl.searchParams.get('limit') ?? '25')
      const offset = Number(parsedUrl.searchParams.get('offset') ?? '0')
      const rows = [
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
        ...Array.from({ length: 10 }, (_, index) => {
          const suffix = String(index + 3).padStart(2, '0')
          return {
            id: `subscriber-vip-${suffix}`,
            company_id: 'company-1',
            phone_number: `+155500010${suffix}`,
            marketing_status: 'confirmed',
            consent_status: 'double_opt_in_confirmed',
            list_id: 'list-vip',
            source: 'loyalty',
            region: 'Phoenix',
            created_at: '2026-05-22T15:00:00Z',
          }
        }),
      ].filter((row) => {
        if (listId && row.list_id !== listId) return false
        if (consentStatus && row.consent_status !== consentStatus) return false
        if (query && !`${row.phone_number} ${row.source}`.toLowerCase().includes(query)) return false
        return true
      })
      return okJson({
        rows: rows.slice(offset, offset + limit),
        total: rows.length,
        limit,
        offset,
      })
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

    if (url.includes('/campaigns/') && url.endsWith('/broadcast-monitor') && method === 'GET') {
      if (monitorError) return failedJson({ detail: 'monitor offline' })
      const campaignId = url.match(/\/campaigns\/([^/]+)\/broadcast-monitor$/)?.[1]
      if (campaignId && monitorResponses?.[campaignId]) return okJson(monitorResponses[campaignId])
    }

    if (url.endsWith('/campaigns/campaign-upcoming/broadcast-monitor') && method === 'GET') {
      if (monitorError) return failedJson({ detail: 'monitor offline' })
      return okJson({
        campaign_id: 'campaign-upcoming',
        company_id: 'company-1',
        campaign_name: 'Memorial Day Promo',
        status: 'scheduled',
        total_audience: 250000,
        modeled_audience: 250000,
        sample_message_count: 2,
        mode: 'projected/sample',
        queued: 1,
        sent: 1,
        failed: 0,
        retried: 0,
        dead_lettered: 0,
        percent_complete: 50,
        throughput_per_second: 0.5,
        messages_per_minute: 30,
        eta_seconds: 499998,
        projected_completion_at: '2026-05-31T12:00:00Z',
        started_at: '2026-05-28T12:00:00Z',
        last_updated: '2026-05-28T12:02:00Z',
      })
    }

    if (url.endsWith('/campaigns/campaign-1/broadcast-monitor') && method === 'GET') {
      return okJson({
        campaign_id: 'campaign-1',
        company_id: 'company-1',
        campaign_name: 'Memorial Day Promo',
        status: 'scheduled',
        total_audience: 250002,
        modeled_audience: 250002,
        sample_message_count: 3,
        mode: 'projected/sample',
        queued: 3,
        sent: 0,
        failed: 0,
        retried: 0,
        dead_lettered: 0,
        percent_complete: 0,
        throughput_per_second: 0,
        messages_per_minute: 0,
        eta_seconds: null,
        projected_completion_at: null,
        started_at: null,
        last_updated: null,
      })
    }

    if (url.endsWith('/campaigns') && method === 'POST') {
      const requestBody = JSON.parse(String(init?.body ?? '{}')) as { name?: string }
      if (requestBody.name === 'Quota Demo') {
        return failedJson(
          {
            detail: {
              message: 'monthly send quota exceeded',
              requested_reach: 250000,
              scheduled_reach: 2900000,
              monthly_send_limit: 3000000,
              available_reach: 100000,
              quota_period_start: '2026-05-01T00:00:00+00:00',
              quota_period_end: '2026-06-01T00:00:00+00:00',
            },
          },
          409,
        )
      }
      return okJson(
        {
          id: 'campaign-1',
          company_id: 'company-1',
          name: 'Memorial Day Promo',
          message_type: 'smart',
          status: 'scheduled',
          scheduled_at: '2026-05-25T16:00:00Z',
          audience_count: 250002,
          message_count: 3,
          sample_message_count: 3,
          audience_mode: 'projected_sample',
          credit_cost: 6,
          remaining_credits: 41994,
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
          status_counts: { queued: 3, sent: 0, failed: 0, retried: 0, dead_lettered: 0 },
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

function storeCompanySession(overrides: Record<string, unknown> = {}) {
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      role: 'company_user',
      email: 'owner@acme.test',
      companyId: 'company-1',
      companyName: 'Acme Retail',
      membershipRole: 'customer_admin',
      creditLimit: 50000,
      creditsUsed: 125,
      ...overrides,
    }),
  )
}

function storeInternalSession() {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'internal_admin', email: 'ops@example.test' }))
}

describe('App', () => {
  afterEach(() => {
    window.localStorage.clear()
    window.history.pushState(null, '', '/')
    delete window.__APP_CONFIG__
    vi.unstubAllGlobals()
  })

  it('shows a customer-facing marketing site on the main URL', async () => {
    mockFetch()

    render(<App />)

    expect(screen.getByRole('heading', { name: /^CampaignOS$/i })).toBeInTheDocument()
    expect(screen.getAllByText(/CampaignOS/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /^Features$/i })).toHaveAttribute('href', '/features')
    expect(screen.getAllByRole('link', { name: /^Knowledge base$/i })[0]).toHaveAttribute('href', '/kb')
    expect(screen.getAllByRole('button', { name: /^Customer login$/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Feature map/i })[0]).toHaveAttribute('href', '/features')
    expect(await screen.findByText(/API connected/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /API docs/i })).toHaveAttribute('href', '/api/docs')
    expect(screen.getByLabelText(/CampaignOS campaign flow preview/i)).toHaveTextContent(/Modeled reach/i)
    expect(screen.getByLabelText(/CampaignOS campaign flow preview/i)).toHaveTextContent(/Broadcast monitor/i)
    expect(screen.getAllByText(/Static UI/i)).not.toHaveLength(0)
    expect(screen.queryByRole('button', { name: /login as internal admin/i })).not.toBeInTheDocument()
  })

  it('labels the static portfolio host when the API route returns the app shell', async () => {
    vi.stubGlobal('fetch', vi.fn(() => htmlAppShell()))

    render(<App />)

    expect(await screen.findByText(/Static preview/i)).toBeInTheDocument()
    expect(screen.getByText(/Login forms need the local stack/i)).toBeInTheDocument()
    expect(screen.getByText(/API docs by request/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /API docs/i })).not.toBeInTheDocument()
  })

  it('does not probe the API on the static portfolio build', async () => {
    window.__APP_CONFIG__ = { staticPortfolioHost: true }
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(screen.getByText(/Static preview/i)).toBeInTheDocument()
    expect(screen.getByText(/Login forms need the local stack/i)).toBeInTheDocument()
    expect(screen.getByText(/API docs by request/i)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('renders the feature marketing route with real product capabilities and CTAs', () => {
    mockFetch()

    window.history.pushState(null, '', '/features')
    render(<App />)

    expect(screen.getByRole('heading', { name: /CampaignOS features/i })).toBeInTheDocument()
    expect(screen.getAllByText(/2.65M modeled subscribers/i)).not.toHaveLength(0)
    expect(screen.getAllByText(/Broadcast monitor/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Subscriber segments and modeled audiences/i)).toBeInTheDocument()
    expect(screen.getByText(/Role-based access, invites, and budgets/i)).toBeInTheDocument()
    expect(screen.getByText(/Analytics and campaign reporting/i)).toBeInTheDocument()
    expect(screen.getByText(/TCPA-aware compliance readiness/i)).toBeInTheDocument()
    expect(screen.getByText(/Grafana dashboards, Tempo traces, Prometheus metrics, Loki log collection/i)).toBeInTheDocument()
    const featureLoginLinks = screen.getAllByRole('link', { name: /^Open customer login$/i })
    expect(featureLoginLinks.some((link) => link.getAttribute('href') === '/app')).toBe(true)
    expect(featureLoginLinks.some((link) => link.getAttribute('href') === '/monitor')).toBe(true)
    expect(screen.getByRole('link', { name: /^Read knowledge base$/i })).toHaveAttribute('href', '/kb')
    expect(screen.getByRole('link', { name: /Open internal admin/i })).toHaveAttribute('href', '/internal')
  })

  it('renders focused feature subroutes without breaking public navigation', () => {
    mockFetch()

    window.history.pushState(null, '', '/features/broadcast-monitor')
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: /Broadcast monitor/i })).toBeInTheDocument()
    expect(screen.getByText(/Feature deep dive/i)).toBeInTheDocument()
    expect(screen.getByText(/Track queued, sent, failed, retried, and dead-lettered messages/i)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /^Open customer login$/i }).some((link) => link.getAttribute('href') === '/monitor')).toBe(true)
    expect(screen.getByRole('link', { name: /^Knowledge base$/i })).toHaveAttribute('href', '/kb')
  })

  it('renders the design review index with recommended composition and all review options', () => {
    mockFetch()

    window.history.pushState(null, '', '/design-review')
    render(<App />)

    expect(screen.getByRole('heading', { name: /Recommended production composition/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Customer login/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Customer login \/ workspace/i)).toBeInTheDocument()
    expect(screen.getByText(/\/app-designs\/6 Minimal Enterprise Workspace/i)).toBeInTheDocument()
    expect(screen.getByText(/\/app-designs\/7 Realtime Broadcast War Room/i)).toBeInTheDocument()
    expect(screen.getByText(/\/app-designs\/10 Agency Multi-tenant Console/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Research rationale/i)).toHaveTextContent(/Activation, orchestration, delivery, and reporting/i)
    expect(screen.getByRole('link', { name: '/app' })).toHaveAttribute('href', '/app')
    expect(screen.getByRole('link', { name: '/monitor' })).toHaveAttribute('href', '/monitor')
    expect(screen.getByRole('link', { name: '/internal' })).toHaveAttribute('href', '/internal')
    expect(screen.getByRole('link', { name: '/1' })).toHaveAttribute('href', '/1')
    expect(screen.getByRole('link', { name: '/app-designs/10' })).toHaveAttribute('href', '/app-designs/10')
  })

  it('renders the customer knowledge base with category filters, search, articles, and CTAs', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/kb')
    render(<App />)

    expect(screen.getByRole('heading', { name: /Customer knowledge base/i })).toBeInTheDocument()
    expect(screen.getAllByText(/owner@demo-retail.test/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/DEMORETA-E568C9/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/ops@example.test/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Getting started with Demo Retail Co/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Sign in with an invite or access code/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Create and schedule a campaign/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Monitor broadcast throughput/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Internal admin and tenant operations overview/i).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /^Open customer login$/i })[0]).toHaveAttribute('href', '/app')
    expect(screen.getAllByRole('link', { name: /^Open broadcast monitor$/i })[0]).toHaveAttribute('href', '/monitor')
    expect(screen.getAllByRole('link', { name: /^View features$/i })[0]).toHaveAttribute('href', '/features')
    expect(screen.getAllByRole('link', { name: /^Open internal admin$/i })[0]).toHaveAttribute('href', '/internal')

    const articles = screen.getByLabelText(/Knowledge base articles/i)
    await user.type(screen.getByLabelText(/Search knowledge base/i), 'broadcast')

    expect(within(articles).getAllByText(/Monitor broadcast throughput/i).length).toBeGreaterThan(0)
    expect(within(articles).queryByText(/Invite teammates from Settings/i)).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText(/Search knowledge base/i))
    await user.click(screen.getByRole('button', { name: /^Compliance$/i }))

    expect(within(articles).getAllByText(/TCPA-aware consent and compliance readiness/i).length).toBeGreaterThan(0)
    expect(within(articles).getByText(/prior express written consent/i)).toBeInTheDocument()
    expect(within(articles).getByText(/opt-out and STOP handling/i)).toBeInTheDocument()
    expect(within(articles).getByText(/quiet hours, send windows, sender identity/i)).toBeInTheDocument()
    expect(within(articles).getAllByText(/legal review, carrier policy alignment, and backend enforcement/i).length).toBeGreaterThan(0)
    expect(within(articles).queryByText(/Create and schedule a campaign/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Clear filters/i }))
    expect(within(articles).getAllByText(/Troubleshooting common issues/i).length).toBeGreaterThan(0)
  })

  it('renders the compliance feature route with TCPA-aware readiness and caveats', () => {
    mockFetch()

    window.history.pushState(null, '', '/features/compliance')
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: /TCPA-aware compliance readiness/i })).toBeInTheDocument()
    expect(screen.getAllByText(/prior express written consent/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/STOP opt-out, suppression, and revocation checks/i)).toBeInTheDocument()
    expect(screen.getAllByText(/quiet hours, send windows, sender identity/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/not legal compliance/i)).toBeInTheDocument()
    expect(screen.getByText(/carrier and CTIA policy alignment/i)).toBeInTheDocument()
  })

  it('renders five unique portfolio-grade design explorations on /1 through /5', () => {
    const explorations = [
      {
        route: '/1',
        heading: 'Revenue-grade SMS, modeled before it moves.',
        keyContent: [/Demo Retail Co/i, /2.65M modeled subscribers/i, /Tempo \+ Grafana/i],
      },
      {
        route: '/2',
        heading: 'The broadcast floor for SMS operators.',
        keyContent: [/Demo Retail Co/i, /41.8k\/min/i, /broadcast monitor/i],
      },
      {
        route: '/3',
        heading: 'Millions of messages. One composed release.',
        keyContent: [/CampaignOS for Demo Retail Co/i, /2.65M/i, /Tempo traces/i],
      },
      {
        route: '/4',
        heading: 'Build the campaign before the clock starts.',
        keyContent: [/Demo Retail Co/i, /media library/i, /subscriber pagination/i],
      },
      {
        route: '/5',
        heading: 'Command every tenant, risk, and broadcast.',
        keyContent: [/Demo Retail Co/i, /2,650,000/i, /Tempo\/Grafana/i],
      },
    ]

    const renderedHeadings = new Set<string>()

    for (const exploration of explorations) {
      window.history.pushState(null, '', exploration.route)
      const { unmount } = render(<App />)

      expect(screen.getByRole('heading', { name: exploration.heading })).toBeInTheDocument()
      renderedHeadings.add(exploration.heading)
      for (const content of exploration.keyContent) {
        expect(screen.getAllByText(content).length).toBeGreaterThan(0)
      }
      expect(screen.getByRole('link', { name: /open customer login/i })).toHaveAttribute('href', '/app')
      expect(screen.getByRole('link', { name: /internal console/i })).toHaveAttribute('href', '/internal')
      expect(screen.getByRole('link', { name: /api docs/i })).toHaveAttribute('href', '/api/docs')

      unmount()
    }

    expect(renderedHeadings.size).toBe(5)
  })

  it('renders five unique full-app design explorations on /app-designs/1 through /app-designs/5', () => {
    const appDesigns = [
      {
        route: '/app-designs/1',
        heading: 'Operator Console',
        activeSurface: /Realtime Broadcast Monitor/i,
      },
      {
        route: '/app-designs/2',
        heading: 'Executive SaaS Dashboard',
        activeSurface: /Role and budget/i,
      },
      {
        route: '/app-designs/3',
        heading: 'Campaign Studio Workspace',
        activeSurface: /Campaign builder/i,
      },
      {
        route: '/app-designs/4',
        heading: 'Data Command Center',
        activeSurface: /Active sends/i,
      },
      {
        route: '/app-designs/5',
        heading: 'Retail Ops Workspace',
        activeSurface: /3 sends need review/i,
      },
    ]

    const renderedHeadings = new Set<string>()

    for (const design of appDesigns) {
      window.history.pushState(null, '', design.route)
      const { unmount } = render(<App />)

      expect(screen.getByRole('heading', { name: design.heading })).toBeInTheDocument()
      renderedHeadings.add(design.heading)
      expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Campaigns/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Broadcast monitor/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Subscribers/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Analytics/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Settings/i).length).toBeGreaterThan(0)
      expect(screen.getByText(design.activeSurface)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /open customer login/i })).toHaveAttribute('href', '/app')
      expect(screen.getByRole('link', { name: /open real-time monitor/i })).toHaveAttribute('href', '/app/monitor')
      expect(screen.getByRole('link', { name: /internal admin/i })).toHaveAttribute('href', '/internal')

      unmount()
    }

    expect(renderedHeadings.size).toBe(5)
  })

  it('renders five more unique authenticated app design explorations on /app-designs/6 through /app-designs/10', () => {
    const appDesigns = [
      {
        route: '/app-designs/6',
        heading: 'Minimal Enterprise Workspace',
        keyContent: [/Today needs one broadcast approval/i, /Consent guardrails active/i],
      },
      {
        route: '/app-designs/7',
        heading: 'Realtime Broadcast War Room',
        keyContent: [/Summer Preview is moving at 41.8k\/min/i, /Escalation policy/i],
      },
      {
        route: '/app-designs/8',
        heading: 'Regional Manager Mobile Console',
        keyContent: [/Southwest market/i, /Store leaderboard/i],
      },
      {
        route: '/app-designs/9',
        heading: 'Compliance Consent Command Center',
        keyContent: [/7 approvals before next broadcast/i, /Consent ledger/i],
      },
      {
        route: '/app-designs/10',
        heading: 'Agency Multi-tenant Console',
        keyContent: [/12 customer tenants/i, /Cross-tenant report/i],
      },
    ]

    const renderedHeadings = new Set<string>()

    for (const design of appDesigns) {
      window.history.pushState(null, '', design.route)
      const { unmount } = render(<App />)

      expect(screen.getByRole('heading', { name: design.heading })).toBeInTheDocument()
      renderedHeadings.add(design.heading)
      expect(screen.getAllByText(/Role and budget/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Campaigns/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Broadcast monitor/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Subscribers/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Analytics/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Settings/i).length).toBeGreaterThan(0)
      for (const content of design.keyContent) {
        expect(screen.getAllByText(content).length).toBeGreaterThan(0)
      }
      expect(screen.getByRole('link', { name: /open customer login/i })).toHaveAttribute('href', '/app')
      expect(screen.getByRole('link', { name: /^Open monitor$/i })).toHaveAttribute('href', '/monitor')
      expect(screen.getByRole('link', { name: /^Features$/i })).toHaveAttribute('href', '/features')
      expect(screen.getByRole('link', { name: /^Knowledge base$/i })).toHaveAttribute('href', '/kb')
      expect(screen.getByRole('link', { name: /^Internal admin$/i })).toHaveAttribute('href', '/internal')

      unmount()
    }

    expect(renderedHeadings.size).toBe(5)
  })

  it('shows company login and signup choices from the customer login surface', async () => {
    mockFetch()
    const user = userEvent.setup()

    render(<App />)
    await user.click(screen.getAllByRole('button', { name: /customer login/i })[0])

    expect(screen.getByRole('button', { name: /sign up with access code/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /find my companies/i })).toBeInTheDocument()
    expect(screen.getByText(/invite-based workspace access/i)).toBeInTheDocument()
    expect(screen.getByText(/owner@demo-retail.test/i)).toBeInTheDocument()
    expect(screen.getByText(/DEMORETA-E568C9/i)).toBeInTheDocument()
  })

  it('shows customer access first when the monitor deep link is opened signed out', () => {
    mockFetch()

    window.history.pushState(null, '', '/app/monitor')
    render(<App />)

    expect(screen.getByRole('heading', { name: /sign in to your campaign workspace/i })).toBeInTheDocument()
    expect(screen.getByText(/owner@demo-retail.test/i)).toBeInTheDocument()
  })

  it('labels the existing-user lookup and access-code signup inputs without relying on placeholders', () => {
    mockFetch()

    window.history.pushState(null, '', '/app')
    render(<App />)

    expect(screen.getByLabelText(/login email.*email lookup input/i)).toHaveAttribute(
      'placeholder',
      'you@example.test',
    )
    expect(screen.getByLabelText(/access code.*signup input/i)).toHaveAttribute(
      'placeholder',
      'ACME-7KQ9',
    )
  })

  it('shows a clear API-unavailable message when the static host returns the HTML app shell', async () => {
    vi.stubGlobal('fetch', vi.fn(() => htmlAppShell()))
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await user.type(screen.getByLabelText(/login email.*email lookup input/i), 'owner@demo-retail.test')
    await user.click(screen.getByRole('button', { name: /find my companies/i }))

    expect(await screen.findByText(/Campaign API is not connected for this static portfolio host/i)).toBeInTheDocument()
  })

  it('disables access forms on the configured static portfolio host', () => {
    window.__APP_CONFIG__ = { staticPortfolioHost: true }

    window.history.pushState(null, '', '/app')
    render(<App />)

    expect(screen.getByText(/Workspace forms need a running Campaign API/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /contact for walkthrough/i })).toHaveAttribute(
      'href',
      'https://bozhi.dev/#contact',
    )
    expect(screen.getByRole('button', { name: /find my companies/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /sign up with access code/i })).toBeDisabled()
    expect(screen.getByLabelText(/login email.*email lookup input/i)).toBeDisabled()
  })

  it('explains invite workspace access and renders membership role plus budget cards', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    expect(screen.getAllByText(/Existing invited user/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/New invited teammate/i)).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/login email/i))
    await user.type(screen.getByLabelText(/login email/i), 'owner@acme.test')
    await user.click(screen.getByRole('button', { name: /find my companies/i }))

    const membership = await screen.findByRole('listitem', { name: /acme retail/i })
    expect(within(membership).getByText(/Company admin/i)).toBeInTheDocument()
    expect(within(membership).getByText(/Full workspace control/i)).toBeInTheDocument()
    expect(within(membership).getByText(/50,000 remaining of 50,000/i)).toBeInTheDocument()
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

  it('shows internal login on /internal even with a customer workspace session', async () => {
    mockFetch()
    storeCompanySession()
    window.history.pushState(null, '', '/internal')

    render(<App />)

    expect(screen.getByRole('heading', { name: /operator console/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login as internal admin/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /company dashboard/i })).not.toBeInTheDocument()
  })

  it('lets internal admin log in and see admin nav only', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/internal')
    render(<App />)
    expect(screen.getByText(/No password is required in this demo flow/i)).toBeInTheDocument()
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

    expect((await screen.findAllByText(/tenant health/i)).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /internal operator console/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/internal operator command surface/i)).toHaveTextContent(/Quota watch/i)
    expect(screen.getByLabelText(/internal operator command surface/i)).toHaveTextContent(/Access codes ready/i)
    expect(screen.getByLabelText(/internal operator command surface/i)).toHaveTextContent(/Highest scheduled reach/i)
    expect(screen.getByText(/Next 30 days drive quota watch/i)).toBeInTheDocument()
    expect(screen.getByText(/Tenant health, quotas, and access codes/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Access-code handoff/i).length).toBeGreaterThan(0)
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

    expect(await screen.findByText('Trace smoke responded 200')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /trace 000000000000/i })).toBeInTheDocument()
    expect(screen.getByText(/span 000000000000/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/observability/trace-smoke')
  })

  it('marks system checks unavailable when API routes return the HTML app shell', async () => {
    vi.stubGlobal('fetch', vi.fn(() => htmlAppShell()))
    const user = userEvent.setup()

    window.history.pushState(null, '', '/internal')
    render(<App />)
    await loginAsInternalAdmin(user)
    await user.click(screen.getByRole('button', { name: /refresh checks/i }))

    expect(await screen.findAllByText(/Campaign API is not connected for this static portfolio host/i)).not.toHaveLength(0)
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
    expect(screen.getAllByText('2,650,000')).not.toHaveLength(0)
    expect(screen.getAllByText('1,360,000')).not.toHaveLength(0)
    expect(screen.getAllByText('4,800,000')).not.toHaveLength(0)
    expect(screen.getAllByText(/28% used/i)).not.toHaveLength(0)
    expect(screen.getAllByText('DEMORETA-E568C9')).not.toHaveLength(0)
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

  it('lands on Campaigns Monitor after company login from the /app/monitor deep link', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app/monitor')
    render(<App />)
    await signupAsCompanyUser(user)

    expect(await screen.findByRole('heading', { name: /campaigns/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^monitor$/i })).toHaveClass('active')
    expect(await screen.findByRole('region', { name: /broadcast monitor/i })).toBeInTheDocument()
    expect(await screen.findByText('30/min')).toBeInTheDocument()
    expect(await screen.findAllByText(/Memorial Day Promo/i)).not.toHaveLength(0)
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/campaign-upcoming/broadcast-monitor')
  })

  it('labels completed monitor ETA as complete instead of missing', async () => {
    const fetchMock = mockFetch({
      companyCampaigns: [
        {
          id: 'campaign-complete',
          company_id: 'company-1',
          name: 'Full Million Complete',
          body: 'Done broadcast',
          message_type: 'regular',
          status: 'sent',
          scheduled_at: '2026-05-28T20:30:00Z',
          created_at: '2026-05-28T20:30:00Z',
          message_count: 2650000,
          audience_count: 2650000,
          audience_mode: 'actual',
          credit_cost: 2650000,
          reminder_count: 0,
        },
      ],
      monitorResponses: {
        'campaign-complete': {
          campaign_id: 'campaign-complete',
          company_id: 'company-1',
          campaign_name: 'Full Million Complete',
          status: 'sent',
          total_audience: 2650000,
          modeled_audience: 2650000,
          sample_message_count: 2650000,
          mode: 'actual',
          queued: 0,
          sent: 2650000,
          failed: 0,
          retried: 0,
          dead_lettered: 0,
          percent_complete: 100,
          throughput_per_second: 2310,
          messages_per_minute: 138600,
          eta_seconds: null,
          projected_completion_at: '2026-05-29T03:49:12Z',
          started_at: '2026-05-29T03:30:16Z',
          last_updated: '2026-05-29T03:49:12Z',
        },
      },
    })
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app/monitor')
    render(<App />)
    await signupAsCompanyUser(user)

    expect(await screen.findByRole('region', { name: /broadcast monitor/i })).toBeInTheDocument()
    expect(await screen.findByText(/Status: sent/i)).toBeInTheDocument()
    expect(screen.getAllByText(/^Complete$/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Completed:/i)).toBeInTheDocument()
    expect(screen.queryByText(/ETA:\s*No ETA yet/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Projected complete:/i)).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/campaign-complete/broadcast-monitor')
  })

  it('keeps the /monitor direct route working for an authenticated customer session', async () => {
    const fetchMock = mockFetch()

    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        role: 'company_user',
        email: 'owner@acme.test',
        companyId: 'company-1',
        companyName: 'Acme Retail',
        membershipRole: 'customer_admin',
        creditLimit: 50000,
        creditsUsed: 125,
      }),
    )
    window.history.pushState(null, '', '/monitor')
    render(<App />)

    expect(await screen.findByRole('heading', { name: /campaigns/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^monitor$/i })).toHaveClass('active')
    expect(await screen.findByRole('region', { name: /broadcast monitor/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Monitor guide/i })).toHaveAttribute('href', '/kb')
    expect(await screen.findByText('30/min')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/campaign-upcoming/broadcast-monitor')
  })

  it.each([
    { path: '/app/campaigns', heading: /^campaigns$/i, nav: /^campaigns$/i },
    { path: '/app/subscribers', heading: /^subscribers$/i, nav: /^subscribers$/i },
    { path: '/app/content', heading: /^content library$/i, nav: /^content library$/i },
    { path: '/app/analytics', heading: /^analytics$/i, nav: /^analytics$/i },
    { path: '/app/settings', heading: /^settings$/i, nav: /^settings$/i },
  ])('opens authenticated customer deep link $path without falling back to dashboard', async ({ path, heading, nav }) => {
    mockFetch()
    storeCompanySession()

    window.history.pushState(null, '', path)
    render(<App />)

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: nav })).toHaveClass('active')
    expect(screen.queryByRole('heading', { name: /company dashboard/i })).not.toBeInTheDocument()
  })

  it('updates canonical customer routes from sidebar nav and restores them on popstate', async () => {
    mockFetch()
    const user = userEvent.setup()
    storeCompanySession()

    window.history.pushState(null, '', '/app')
    render(<App />)

    expect(await screen.findByRole('heading', { name: /company dashboard/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^campaigns$/i }))
    expect(window.location.pathname).toBe('/app/campaigns')
    expect(await screen.findByRole('heading', { name: /^campaigns$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^settings$/i }))
    expect(window.location.pathname).toBe('/app/settings')
    expect(await screen.findByRole('heading', { name: /^settings$/i })).toBeInTheDocument()

    act(() => {
      window.history.pushState(null, '', '/app/subscribers')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(await screen.findByRole('heading', { name: /^subscribers$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^subscribers$/i })).toHaveClass('active')
  })

  it('shows quota bar and quick actions on company dashboard without Not set', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)

    expect(await screen.findByRole('heading', { name: /company dashboard/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/dashboard command surface/i)).toHaveTextContent(/Today's decisions/i)
    expect(screen.getByLabelText(/decision queue/i)).toHaveTextContent(/Budget posture/i)
    expect(screen.getByLabelText(/decision queue/i)).toHaveTextContent(/Audience posture/i)
    expect(screen.getByLabelText(/analytics and reporting summary/i)).toHaveTextContent(/Performance summary/i)
    expect(screen.getByLabelText(/invite and access-code framing/i)).toHaveTextContent(/Invite and budget handoff/i)
    expect(screen.queryByText(/not set/i)).not.toBeInTheDocument()
    expect(screen.getByText(/monthly send quota/i)).toBeInTheDocument()
    expect(screen.getByText(/new campaign/i)).toBeInTheDocument()
    expect(screen.getByText(/import subscribers/i)).toBeInTheDocument()
    expect(screen.getByText(/upload media/i)).toBeInTheDocument()
    expect(screen.getByText(/open broadcast monitor/i)).toBeInTheDocument()
    expect(screen.getByText(/view analytics/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/next actions/i)).toHaveTextContent(/Approve a broadcast or start a new one/i)
    expect(screen.getByRole('link', { name: /read knowledge base/i })).toHaveAttribute('href', '/kb')

    await user.click(screen.getByRole('button', { name: /new campaign/i }))
    expect(window.location.pathname).toBe('/app/campaigns/new')
    expect(await screen.findByRole('heading', { name: /new campaign/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to campaigns/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^dashboard$/i }))
    await user.click(screen.getByRole('button', { name: /import subscribers/i }))
    expect(await screen.findByRole('heading', { name: /subscribers/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^dashboard$/i }))
    await user.click(screen.getByRole('button', { name: /upload media/i }))
    expect(await screen.findByRole('heading', { name: /content library/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^dashboard$/i }))
    await user.click(screen.getByRole('button', { name: /view analytics/i }))
    expect(await screen.findByRole('heading', { name: /analytics/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^dashboard$/i }))
    await user.click(screen.getByRole('button', { name: /open broadcast monitor/i }))
    expect(window.location.pathname).toBe('/app/monitor')
    expect(await screen.findByRole('heading', { name: /campaigns/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^monitor$/i })).toHaveClass('active')
    expect(await screen.findByRole('region', { name: /broadcast monitor/i })).toBeInTheDocument()
    expect(await screen.findByText('30/min')).toBeInTheDocument()
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
    const shellContext = screen.getByLabelText(/workspace role and budget/i)
    expect(within(shellContext).getByText(/Company admin/i)).toBeInTheDocument()
    expect(within(shellContext).getByText(/Full workspace control/i)).toBeInTheDocument()
    expect(within(shellContext).getByText(/50,000 remaining/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/workspace access summary/i)).toHaveTextContent(/All company markets and segments/i)
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
    const upcomingHeading = screen.getByRole('heading', { name: /^Upcoming 1$/i })
    expect(within(upcomingHeading).getByText('1')).toHaveClass('count-pill')
    const pastHeading = screen.getByRole('heading', { name: /^Past 2$/i })
    expect(within(pastHeading).getByText('2')).toHaveClass('count-pill')
    expect(screen.queryByLabelText(/campaign name/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /new campaign/i }))
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
    const estimate = screen.getByLabelText(/campaign credit estimate/i)
    expect(within(estimate).getByText(/Modeled audience/i)).toBeInTheDocument()
    expect(within(estimate).getByText(/Campaign credit cost/i)).toBeInTheDocument()
    expect(within(estimate).getByText(/Company balance/i)).toBeInTheDocument()
    expect(within(estimate).getByText(/User allocation/i)).toBeInTheDocument()
    expect(within(estimate).getByText('6')).toBeInTheDocument()
    await user.clear(screen.getByLabelText(/schedule date and time/i))
    await user.type(screen.getByLabelText(/schedule date and time/i), '2026-05-25T16:00')
    await user.click(screen.getByRole('button', { name: /schedule campaign/i }))

    expect(await screen.findAllByText(/campaign-1/i)).not.toHaveLength(0)
    await user.click(screen.getByRole('button', { name: /open monitor/i }))
    expect(await screen.findByText(/Not started/i)).toBeInTheDocument()
    expect(screen.getAllByText(/No ETA yet/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Not projected yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/Projected complete:\s*Immediate/i)).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/campaign-1/broadcast-monitor')
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

  it('shows monthly quota details when scheduling would exceed the send limit', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /campaigns/i }))
    await user.click(await screen.findByRole('button', { name: /new campaign/i }))

    await user.clear(screen.getByLabelText(/campaign name/i))
    await user.type(screen.getByLabelText(/campaign name/i), 'Quota Demo')
    await user.click(screen.getByLabelText(/VIP Customers/i))
    await user.click(screen.getByRole('button', { name: /schedule campaign/i }))

    expect(await screen.findByText(/Monthly send quota exceeded/i)).toBeInTheDocument()
    expect(screen.getByText(/250,000 requested reach/i)).toBeInTheDocument()
    expect(screen.getByText(/100,000 available/i)).toBeInTheDocument()
    expect(screen.queryByText(/Schedule campaign failed: 409/i)).not.toBeInTheDocument()
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
    const memorialCard = screen.getByRole('article', { name: /Memorial Day Promo campaign card/i })
    expect(within(memorialCard).getAllByText(/Scheduled/i).length).toBeGreaterThan(0)
    expect(within(memorialCard).getByText(/Body preview/i)).toBeInTheDocument()
    expect(within(memorialCard).getByText(/Memorial Day discount copy/i)).toBeInTheDocument()
    expect(within(memorialCard).getByText(/Modeled audience/i)).toBeInTheDocument()
    expect(within(memorialCard).getAllByText(/250,000/i).length).toBeGreaterThan(0)
    expect(within(memorialCard).getByText(/Sample messages/i)).toBeInTheDocument()
    expect(within(memorialCard).getByText(/Credits/i)).toBeInTheDocument()
    expect(within(memorialCard).getByRole('button', { name: /Copy to draft/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /past/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Spring Launch/i)).not.toHaveLength(0)
    expect(screen.queryByLabelText(/follow-up source campaign/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /follow-ups/i }))

    expect(screen.getByLabelText(/follow-up source campaign/i)).toBeInTheDocument()
  })

  it('shows new campaign budget context and disables scheduling for read-only roles', async () => {
    mockFetch()

    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        role: 'company_user',
        email: 'analyst@acme.test',
        companyId: 'company-1',
        companyName: 'Acme Retail',
        membershipRole: 'analyst',
        creditLimit: 1000,
        creditsUsed: 250,
      }),
    )
    window.history.pushState(null, '', '/app/campaigns/new')
    render(<App />)

    expect(await screen.findByRole('heading', { name: /new campaign/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to campaigns/i })).toBeInTheDocument()
    expect(screen.getByText(/Campaign scheduling is disabled for Analyst/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/new campaign context/i)).toHaveTextContent(/750 user credits/i)
    expect(screen.getByLabelText(/campaign credit estimate/i)).toHaveTextContent(/Company balance/i)
    expect(screen.getByLabelText(/campaign credit estimate/i)).toHaveTextContent(/User allocation/i)
    expect(screen.getByRole('button', { name: /schedule campaign/i })).toBeDisabled()
  })

  it('keeps limited company role messaging away from full-control admin wording', async () => {
    mockFetch()
    storeCompanySession({
      email: 'viewer@acme.test',
      membershipRole: 'viewer',
      creditLimit: 1000,
      creditsUsed: 200,
    })

    window.history.pushState(null, '', '/app')
    render(<App />)

    const shellContext = await screen.findByLabelText(/workspace role and budget/i)
    expect(within(shellContext).getByText(/^Viewer$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/workspace access summary/i)).toHaveTextContent(/Read-only workspace access/i)
    expect(screen.queryByText(/Full workspace control/i)).not.toBeInTheDocument()
  })

  it('filters campaigns by search, status, scheduled date, and clears filters', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /campaigns/i }))

    expect(await screen.findByText(/Memorial Day Promo/i)).toBeInTheDocument()
    expect(screen.getByText(/Spring Launch/i)).toBeInTheDocument()
    expect(screen.getByText(/Cart Rescue/i)).toBeInTheDocument()
    expect(screen.getByText(/Showing 3 of 3 campaigns/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/search campaigns/i), 'abandoned')

    expect(screen.getByText(/Cart Rescue/i)).toBeInTheDocument()
    expect(screen.getByText(/Showing 1 of 3 campaigns/i)).toBeInTheDocument()
    expect(screen.queryByText(/Memorial Day Promo/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Spring Launch/i)).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText(/search campaigns/i))
    await user.selectOptions(screen.getByLabelText(/campaign status/i), 'sent')

    expect(screen.getByText(/Spring Launch/i)).toBeInTheDocument()
    expect(screen.queryByText(/Memorial Day Promo/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Cart Rescue/i)).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/campaign status/i), 'all')
    await user.type(screen.getByLabelText(/scheduled\/created from/i), '2026-05-24T00:00')
    await user.type(screen.getByLabelText(/scheduled\/created to/i), '2026-05-26T00:00')

    expect(screen.getAllByText(/Memorial Day Promo/i)).not.toHaveLength(0)
    expect(screen.queryByText(/Spring Launch/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Cart Rescue/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear filters/i }))

    expect(screen.getByText(/Showing 3 of 3 campaigns/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Memorial Day Promo/i)).not.toHaveLength(0)
    expect(screen.getByText(/Spring Launch/i)).toBeInTheDocument()
    expect(screen.getByText(/Cart Rescue/i)).toBeInTheDocument()
  })

  it('renders broadcast monitor with modeled audience, sample throughput, and manual refresh', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /campaigns/i }))
    await user.click(await screen.findByRole('button', { name: /^monitor$/i }))

    expect(await screen.findByRole('region', { name: /broadcast monitor/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Memorial Day Promo/i)).not.toHaveLength(0)
    expect(screen.getByText('250,000')).toBeInTheDocument()
    expect(screen.getByText(/2 local sample messages/i)).toBeInTheDocument()
    expect(screen.getByText(/projected\/sample/i)).toBeInTheDocument()
    expect(screen.getByText('30/min')).toBeInTheDocument()
    expect(screen.getByText(/Refreshes every 5 seconds/i)).toBeInTheDocument()
    const statusMetrics = screen.getByLabelText(/delivery status metrics/i)
    expect(within(statusMetrics).getByText(/Queued/i)).toBeInTheDocument()
    expect(within(statusMetrics).getByText(/Sent/i)).toBeInTheDocument()
    expect(within(statusMetrics).getByText(/Failed/i)).toBeInTheDocument()
    expect(within(statusMetrics).getAllByText(/Retried/i).length).toBeGreaterThan(0)
    expect(within(statusMetrics).getByText(/Dead-lettered/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/monitor status semantics/i)).toHaveTextContent(/Queued waits/i)

    const countMonitorCalls = () =>
      fetchMock.mock.calls.filter(([request]) => String(request).endsWith('/campaigns/campaign-upcoming/broadcast-monitor'))
        .length
    const callsBeforeRefresh = countMonitorCalls()
    await user.click(screen.getByRole('button', { name: /refresh monitor/i }))
    await waitFor(() => expect(countMonitorCalls()).toBeGreaterThan(callsBeforeRefresh))
  })

  it('shows monitor empty and error states without hiding the monitor controls', async () => {
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    mockFetch({ companyCampaigns: [] })
    const { unmount } = render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /campaigns/i }))
    await user.click(await screen.findByRole('button', { name: /^monitor$/i }))

    expect(await screen.findByText(/No campaigns to monitor/i)).toBeInTheDocument()
    expect(screen.getByText(/Create or seed a campaign before viewing broadcast throughput/i)).toBeInTheDocument()

    unmount()
    window.localStorage.clear()
    window.history.pushState(null, '', '/app')
    mockFetch({ monitorError: true })
    render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /campaigns/i }))
    await user.click(await screen.findByRole('button', { name: /^monitor$/i }))

    expect(await screen.findByText(/Monitor unavailable: 503/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /refresh monitor/i })).toBeInTheDocument()
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
    expect(screen.getAllByText(/Double opt-in confirmed/i)).not.toHaveLength(0)

    await user.selectOptions(screen.getByLabelText(/page size/i), '10')
    expect(await screen.findByText(/Page 1 of 2/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([request]) => String(request).includes('limit=10&offset=10'))).toBe(true)
    })
    expect(await screen.findByText('+15550001012')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /previous/i }))
    expect(await screen.findByText('+15550001001')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/search subscribers/i), 'csv')
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([request]) => String(request).includes('q=csv'))).toBe(true)
    })
    await user.clear(screen.getByLabelText(/search subscribers/i))
    await user.click(screen.getByRole('button', { name: /West Region/i }))
    expect(await screen.findByText('+15550001002')).toBeInTheDocument()
    expect(screen.queryByText('+15550001001')).not.toBeInTheDocument()

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
    const mediaLibrary = screen.getByLabelText(/media asset library/i)
    expect(within(mediaLibrary).getByText(/CampaignOS preview/i)).toBeInTheDocument()
    expect(within(mediaLibrary).getByText(/Retail offer/i)).toBeInTheDocument()
    expect(within(mediaLibrary).getByText(/cdn.example\/coupon.png/i)).toBeInTheDocument()
    expect(within(mediaLibrary).queryByRole('img')).not.toBeInTheDocument()

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

  it('replaces failed external image previews with a branded media placeholder', async () => {
    mockFetch({
      mediaAssets: [
        {
          id: 'media-broken',
          company_id: 'company-1',
          filename: 'seattle-vip-double-points.png',
          content_type: 'image/png',
          url: 'https://assets.example/retail/seattle-vip-double-points.png',
        },
      ],
    })
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /content library/i }))

    const preview = await screen.findByLabelText(/seattle-vip-double-points.png media preview/i)
    const image = preview.querySelector('img')
    expect(image).not.toBeNull()

    fireEvent.error(image as HTMLImageElement)

    expect(within(preview).getByText(/CampaignOS preview/i)).toBeInTheDocument()
    expect(within(preview).getByText(/VIP loyalty/i)).toBeInTheDocument()
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
    const memorialTemplate = screen.getByRole('article', { name: /Memorial Day 30% Off Hero/i })
    expect(within(memorialTemplate).getByRole('button', { name: /Copy SMS text/i })).toBeInTheDocument()
  })

  it('uses a content template to move into a new campaign with copy and media prefilled', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.history.pushState(null, '', '/app')
    render(<App />)
    await signupAsCompanyUser(user)
    await user.click(screen.getByRole('button', { name: /content library/i }))

    const flashSaleCard = await screen.findByRole('article', { name: /Weekend Flash Sale MMS/i })
    await user.click(within(flashSaleCard).getByRole('button', { name: /use template/i }))

    expect(await screen.findByRole('heading', { name: /new campaign/i })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/app/campaigns/new')
    expect(screen.getByRole('button', { name: /back to campaigns/i })).toBeInTheDocument()
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
    expect(screen.getAllByText(/Memorial Day Promo/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/May 25, 2026/i)).toBeInTheDocument()

    const reachChart = screen.getByLabelText(/Modeled reach chart/i)
    expect(reachChart).toHaveTextContent(/Projected from campaign schedules/i)
    expect(within(reachChart).getByText(/Memorial Day Promo/i)).toBeInTheDocument()
    expect(within(reachChart).getByText(/250,000 modeled/i)).toBeInTheDocument()

    const creditChart = screen.getByLabelText(/Credit costs chart/i)
    expect(creditChart).toHaveTextContent(/Scheduled campaign credit estimates/i)
    expect(within(creditChart).getByText(/4 credits/i)).toBeInTheDocument()

    const followUpChart = screen.getByLabelText(/Follow-ups chart/i)
    expect(followUpChart).toHaveTextContent(/loaded from campaign and reminder records/i)
    expect(within(followUpChart).getAllByText(/1 follow-up/i).length).toBeGreaterThan(0)

    const trackedChart = screen.getByLabelText(/Clicks and redemptions chart/i)
    expect(trackedChart).toHaveTextContent(/Tracked performance totals from dashboard summary/i)
    expect(within(trackedChart).getAllByText(/Clicks/i).length).toBeGreaterThan(0)
    expect(within(trackedChart).getByText(/123/i)).toBeInTheDocument()
    expect(within(trackedChart).getAllByText(/Redemptions/i).length).toBeGreaterThan(0)
    expect(within(trackedChart).getByText(/45/i)).toBeInTheDocument()
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
    expect(screen.getByText('1,360,850')).toBeInTheDocument()
    expect(screen.getByText(/Highest quota usage/i)).toBeInTheDocument()
  })

  it.each([
    { path: '/internal/companies', heading: /^companies$/i, nav: /^companies$/i },
    { path: '/internal/usage', heading: /^usage$/i, nav: /^usage$/i },
  ])('opens authenticated internal deep link $path without falling back to dashboard', async ({ path, heading, nav }) => {
    mockFetch()
    storeInternalSession()

    window.history.pushState(null, '', path)
    render(<App />)

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: nav })).toHaveClass('active')
    expect(screen.queryByRole('heading', { name: /internal operator console/i })).not.toBeInTheDocument()
  })

  it('updates canonical internal routes from sidebar nav and restores them on popstate', async () => {
    mockFetch()
    const user = userEvent.setup()
    storeInternalSession()

    window.history.pushState(null, '', '/internal')
    render(<App />)

    expect(await screen.findByRole('heading', { name: /internal operator console/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^companies$/i }))
    expect(window.location.pathname).toBe('/internal/companies')
    expect(await screen.findByRole('heading', { name: /^companies$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^usage$/i }))
    expect(window.location.pathname).toBe('/internal/usage')
    expect(await screen.findByRole('heading', { name: /^usage$/i })).toBeInTheDocument()

    act(() => {
      window.history.pushState(null, '', '/internal/companies')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(await screen.findByRole('heading', { name: /^companies$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^companies$/i })).toHaveClass('active')
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
    expect(screen.getAllByText(/Campaign manager/i)).not.toHaveLength(0)
    expect(screen.getByText(/2,000 credits/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /refresh team/i }))
    expect(await screen.findAllByText(/owner@acme.test/)).not.toHaveLength(0)
    await user.clear(screen.getByLabelText(/user email/i))
    await user.type(screen.getByLabelText(/user email/i), 'owner@acme.test')
    await user.selectOptions(screen.getByLabelText(/user role/i), 'regional_manager')
    await user.clear(screen.getAllByLabelText(/user credit limit/i)[1])
    await user.type(screen.getAllByLabelText(/user credit limit/i)[1], '2500')
    await user.click(screen.getByRole('button', { name: /update user permissions/i }))

    const teamTable = await screen.findByRole('table', { name: /team roles and budgets/i })
    expect(within(teamTable).getByText(/Regional manager/)).toBeInTheDocument()
    expect(within(teamTable).getByText('2,375')).toBeInTheDocument()
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

  it('shows read-only settings for non-admin roles without invite controls', async () => {
    mockFetch()
    const user = userEvent.setup()

    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        role: 'company_user',
        email: 'viewer@acme.test',
        companyId: 'company-1',
        companyName: 'Acme Retail',
        membershipRole: 'viewer',
        creditLimit: 1000,
        creditsUsed: 200,
      }),
    )
    window.history.pushState(null, '', '/app')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /settings/i }))

    expect(screen.getByText(/Team and budget controls are restricted/i)).toBeInTheDocument()
    expect(screen.getByText(/cannot invite users, issue access codes, or change credit allocations/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/invite role/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create user access code/i })).not.toBeInTheDocument()
    expect(screen.getByRole('table', { name: /team roles and budgets/i })).toBeInTheDocument()
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
