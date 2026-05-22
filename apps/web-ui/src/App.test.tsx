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

    if (url.endsWith('/admin/dashboard-summary')) {
      return okJson({
        company_count: 10,
        active_company_count: 9,
        total_credit_balance: 92000,
        active_access_code_count: 6,
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
      return okJson({ id: 'list-1', company_id: 'company-1', name: 'VIP List' }, 201)
    }

    if (url.endsWith('/companies/company-1/subscriber-lists') && method === 'GET') {
      return okJson([
        { id: 'list-vip', company_id: 'company-1', name: 'VIP Customers', subscriber_count: 2 },
        { id: 'list-west', company_id: 'company-1', name: 'West Region', subscriber_count: 1 },
      ])
    }

    if (url.endsWith('/companies/company-1/subscribers') && method === 'POST') {
      return okJson({
        id: 'subscriber-1',
        company_id: 'company-1',
        phone_number: '+15550001010',
        source: 'import',
        list_id: 'list-1',
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
        },
        {
          id: 'subscriber-2',
          company_id: 'company-1',
          phone_number: '+15550001002',
          marketing_status: 'imported',
          consent_status: 'company_provided',
          list_id: 'list-west',
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

    expect(screen.getByRole('heading', { name: /send smarter campaigns/i })).toBeInTheDocument()
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

    expect(await screen.findByText(/companies created/i)).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('92,000')).toBeInTheDocument()
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

    expect(await screen.findByText(/ACME-1234/i)).toBeInTheDocument()
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

    expect(await screen.findByText(/sign up with an access code/i)).toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: /subscribers/i }))
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

  it('shows upcoming and past campaigns with follow-up reminders inside Campaigns', async () => {
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
    expect(screen.getByLabelText(/follow-up source campaign/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reminders/i })).not.toBeInTheDocument()
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
