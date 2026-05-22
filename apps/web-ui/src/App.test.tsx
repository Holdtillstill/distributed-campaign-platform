import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

const okJson = (body: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(body),
  } as Response)

const okText = (body = 'ok') =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: () => Promise.resolve(body),
  } as Response)

function mockFetch() {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'

    if (url.endsWith('/healthz') || url.endsWith('/readyz') || url.endsWith('/metrics')) {
      return okText()
    }

    if (url.endsWith('/admin/companies') && method === 'POST') {
      return okJson({
        company: { id: 'company-1', name: 'Acme Co', slug: 'acme' },
        admin_user: { id: 'user-1', email: 'admin@acme.test' },
      })
    }

    if (url.endsWith('/me/memberships')) {
      return okJson({
        memberships: [
          { company_id: 'company-2', company_name: 'Beta Co', role: 'admin' },
          { company_id: 'company-3', company_name: 'Gamma Co', role: 'member' },
        ],
      })
    }

    if (url.endsWith('/companies/company-2/subscriber-lists') && method === 'POST') {
      return okJson({ id: 'list-1', company_id: 'company-2', name: 'VIP List' })
    }

    if (url.endsWith('/companies/company-2/subscribers') && method === 'POST') {
      return okJson({
        id: 'subscriber-1',
        company_id: 'company-2',
        phone_number: '+15550001010',
        source: 'import',
        list_id: 'list-1',
        consent_status: 'company_provided',
      })
    }

    if (url.endsWith('/public/opt-ins') && method === 'POST') {
      return okJson({
        token: 'opt-token-1',
        company_id: 'company-2',
        phone_number: '+15550001011',
        status: 'pending',
      })
    }

    if (url.endsWith('/public/opt-ins/opt-token-1/confirm') && method === 'POST') {
      return okJson({ token: 'opt-token-1', status: 'confirmed' })
    }

    if (url.endsWith('/campaigns') && method === 'POST') {
      return okJson({
        id: 'campaign-1',
        company_id: 'company-2',
        name: 'Spring Launch',
        message_count: 2,
        status_counts: { queued: 2, sent: 0, failed: 0, retried: 0, dead_lettered: 0 },
      })
    }

    if (url.endsWith('/campaigns/campaign-1')) {
      return okJson({
        id: 'campaign-1',
        company_id: 'company-2',
        name: 'Spring Launch',
        message_count: 2,
        status_counts: { queued: 0, sent: 2, failed: 0, retried: 0, dead_lettered: 0 },
      })
    }

    if (url.endsWith('/companies/company-2/media-assets') && method === 'POST') {
      return okJson({
        id: 'media-1',
        company_id: 'company-2',
        filename: 'coupon.png',
        content_type: 'image/png',
        url: 'https://cdn.example/coupon.png',
      })
    }

    if (url.endsWith('/companies/company-2/media-assets')) {
      return okJson([
        {
          id: 'media-1',
          company_id: 'company-2',
          filename: 'coupon.png',
          content_type: 'image/png',
          url: 'https://cdn.example/coupon.png',
        },
      ])
    }

    if (url.endsWith('/companies/company-2/campaign-links') && method === 'POST') {
      return okJson({
        id: 'link-1',
        token: 'spring-token',
        public_url: '/r/spring-token',
        company_id: 'company-2',
        campaign_id: 'campaign-1',
        subscriber_id: 'subscriber-1',
        media_asset_id: 'media-1',
        destination_url: 'https://example.com/spring',
        click_count: 0,
        redeemed_count: 0,
      })
    }

    if (url.endsWith('/companies/company-2/campaign-links')) {
      return okJson([
        {
          id: 'link-1',
          token: 'spring-token',
          public_url: '/r/spring-token',
          company_id: 'company-2',
          campaign_id: 'campaign-1',
          subscriber_id: 'subscriber-1',
          media_asset_id: 'media-1',
          destination_url: 'https://example.com/spring',
          click_count: 1,
          redeemed_count: 1,
        },
      ])
    }

    if (url.endsWith('/r/spring-token') && method === 'GET') {
      return okJson({
        token: 'spring-token',
        destination_url: 'https://example.com/spring',
        click_count: 1,
        media_asset: {
          id: 'media-1',
          filename: 'coupon.png',
          content_type: 'image/png',
          url: 'https://cdn.example/coupon.png',
        },
      })
    }

    if (url.endsWith('/r/spring-token/redeem') && method === 'POST') {
      return okJson({ token: 'spring-token', status: 'redeemed', redeemed_count: 1 })
    }

    if (url.endsWith('/companies/company-2/campaign-performance')) {
      return okJson({
        media_asset_count: 1,
        tracked_link_count: 1,
        click_count: 1,
        redemption_count: 1,
      })
    }

    return Promise.reject(new Error(`Unexpected request: ${method} ${url}`))
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('keeps the existing campaign, status, docs, and system checks UI available', async () => {
    mockFetch()

    render(<App />)

    expect(screen.getByRole('link', { name: /api docs/i })).toHaveAttribute('href', '/api/docs')
    expect(screen.getByRole('button', { name: /create campaign/i })).toBeInTheDocument()
    expect(screen.getByText(/campaign status/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /refresh checks/i })).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('/healthz responded 200')).toBeInTheDocument())
    expect(screen.getByText('/readyz responded 200')).toBeInTheDocument()
    expect(screen.getByText('/metrics responded 200')).toBeInTheDocument()
  })

  it('creates an internal company, displays the company and admin user, and selects it', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<App />)

    await user.clear(screen.getByLabelText(/company name/i))
    await user.type(screen.getByLabelText(/company name/i), 'Acme Co')
    await user.clear(screen.getByLabelText(/company slug/i))
    await user.type(screen.getByLabelText(/company slug/i), 'acme')
    await user.clear(screen.getByLabelText(/admin email/i))
    await user.type(screen.getByLabelText(/admin email/i), 'admin@acme.test')
    await user.click(screen.getByRole('button', { name: /create company/i }))

    expect(await screen.findAllByText(/company-1/i)).not.toHaveLength(0)
    expect(screen.getByText(/admin@acme\.test/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/active company id/i)).toHaveValue('company-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/companies',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Internal-Admin': 'true',
        }),
        body: JSON.stringify({ name: 'Acme Co', slug: 'acme', admin_email: 'admin@acme.test' }),
      }),
    )
  })

  it('looks up memberships by email and lets a membership select the active company', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<App />)

    await user.clear(screen.getByLabelText(/user email/i))
    await user.type(screen.getByLabelText(/user email/i), 'owner@beta.test')
    await user.click(screen.getByRole('button', { name: /lookup memberships/i }))

    const betaMembership = await screen.findByRole('listitem', { name: /beta co/i })
    expect(betaMembership).toHaveTextContent('company-2')
    await user.click(within(betaMembership).getByRole('button', { name: /select beta co/i }))

    expect(screen.getByLabelText(/active company id/i)).toHaveValue('company-2')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/me/memberships',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-User-Email': 'owner@beta.test' }),
      }),
    )
  })

  it('manages subscriber list, import, opt-in, and confirmation for the active company', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<App />)

    await user.clear(screen.getByLabelText(/active company id/i))
    await user.type(screen.getByLabelText(/active company id/i), 'company-2')

    await user.clear(screen.getByLabelText(/subscriber list name/i))
    await user.type(screen.getByLabelText(/subscriber list name/i), 'VIP List')
    await user.click(screen.getByRole('button', { name: /create list/i }))
    await screen.findByText(/list-1/i)

    await user.clear(screen.getByLabelText(/^subscriber phone number$/i))
    await user.type(screen.getByLabelText(/^subscriber phone number$/i), '+15550001010')
    await user.clear(screen.getByLabelText(/subscriber source/i))
    await user.type(screen.getByLabelText(/subscriber source/i), 'import')
    await user.click(screen.getByRole('button', { name: /import subscriber/i }))
    await screen.findByText(/company_provided/i)

    await user.clear(screen.getByLabelText(/opt-in phone number/i))
    await user.type(screen.getByLabelText(/opt-in phone number/i), '+15550001011')
    await user.clear(screen.getByLabelText(/opt-in source/i))
    await user.type(screen.getByLabelText(/opt-in source/i), 'landing-page')
    await user.click(screen.getByRole('button', { name: /start opt-in/i }))
    await screen.findByText(/opt-token-1/i)

    await user.click(screen.getByRole('button', { name: /confirm opt-in/i }))
    await screen.findByText(/confirmed/i)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/companies/company-2/subscriber-lists',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'VIP List' }),
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/companies/company-2/subscribers',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ phone_number: '+15550001010', source: 'import', list_id: 'list-1' }),
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/public/opt-ins',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ company_id: 'company-2', phone_number: '+15550001011', source: 'landing-page' }),
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/public/opt-ins/opt-token-1/confirm',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends the selected company id when creating a campaign and displays it in status', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<App />)

    await user.clear(screen.getByLabelText(/active company id/i))
    await user.type(screen.getByLabelText(/active company id/i), 'company-2')
    await user.clear(screen.getByLabelText(/campaign name/i))
    await user.type(screen.getByLabelText(/campaign name/i), 'Spring Launch')
    await user.clear(screen.getByLabelText(/message body/i))
    await user.type(screen.getByLabelText(/message body/i), 'Launch copy')
    await user.clear(screen.getByLabelText(/recipients/i))
    await user.type(screen.getByLabelText(/recipients/i), '+15550001012\n+15550001013')
    await user.click(screen.getByRole('button', { name: /create campaign/i }))

    await screen.findByText('campaign-1')
    expect(screen.getAllByText(/company-2/i)).not.toHaveLength(0)
    expect(screen.getByText('campaign-1')).toBeInTheDocument()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/campaigns',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Company-Id': 'company-2',
        }),
        body: JSON.stringify({
          name: 'Spring Launch',
          body: 'Launch copy',
          recipients: ['+15550001012', '+15550001013'],
        }),
      }),
    )
  })

  it('manages media assets, tracked links, click simulation, redemption, and reporting', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<App />)

    await user.clear(screen.getByLabelText(/active company id/i))
    await user.type(screen.getByLabelText(/active company id/i), 'company-2')

    await user.clear(screen.getByLabelText(/media filename/i))
    await user.type(screen.getByLabelText(/media filename/i), 'coupon.png')
    await user.clear(screen.getByLabelText(/media content type/i))
    await user.type(screen.getByLabelText(/media content type/i), 'image/png')
    await user.clear(screen.getByLabelText(/media url/i))
    await user.type(screen.getByLabelText(/media url/i), 'https://cdn.example/coupon.png')
    await user.click(screen.getByRole('button', { name: /add media asset/i }))
    expect(await screen.findAllByText(/media-1/i)).not.toHaveLength(0)

    await user.click(screen.getByRole('button', { name: /refresh media assets/i }))
    expect(await screen.findAllByText(/coupon\.png/i)).not.toHaveLength(0)

    await user.clear(screen.getByLabelText(/tracked campaign id/i))
    await user.type(screen.getByLabelText(/tracked campaign id/i), 'campaign-1')
    await user.clear(screen.getByLabelText(/tracked subscriber id/i))
    await user.type(screen.getByLabelText(/tracked subscriber id/i), 'subscriber-1')
    await user.clear(screen.getByLabelText(/tracked media asset id/i))
    await user.type(screen.getByLabelText(/tracked media asset id/i), 'media-1')
    await user.clear(screen.getByLabelText(/destination url/i))
    await user.type(screen.getByLabelText(/destination url/i), 'https://example.com/spring')
    await user.click(screen.getByRole('button', { name: /create tracked link/i }))
    expect(await screen.findAllByText(/spring-token/i)).not.toHaveLength(0)

    await user.click(screen.getByRole('button', { name: /refresh tracked links/i }))
    await screen.findByText(/Clicks: 1/i)

    await user.click(screen.getByRole('button', { name: /open tracked link/i }))
    expect(await screen.findAllByText(/https:\/\/example\.com\/spring/i)).not.toHaveLength(0)

    await user.click(screen.getByRole('button', { name: /redeem tracked link/i }))
    expect(await screen.findAllByText(/redeemed/i)).not.toHaveLength(0)

    await user.click(screen.getByRole('button', { name: /refresh performance/i }))
    await screen.findByText(/Media assets/)
    expect(screen.getByText(/Tracked links/)).toBeInTheDocument()
    expect(screen.getByText(/Redemptions/)).toBeInTheDocument()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/companies/company-2/media-assets',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          filename: 'coupon.png',
          content_type: 'image/png',
          url: 'https://cdn.example/coupon.png',
        }),
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/companies/company-2/campaign-links',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          campaign_id: 'campaign-1',
          subscriber_id: 'subscriber-1',
          media_asset_id: 'media-1',
          destination_url: 'https://example.com/spring',
        }),
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith('/api/r/spring-token')
    expect(fetchMock).toHaveBeenCalledWith('/api/r/spring-token/redeem', expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/companies/company-2/campaign-performance')
  })
})
