import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RedesignV2App } from './RedesignV2App'
import { V2DataProvider, useV2Data } from './mockData'

const PLATFORM_TENANTS_STORAGE_KEY = 'campaignos-v2-platform-tenants'
const WORKSPACE_STORAGE_KEY = 'campaignos-v2-workspace-state'

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

let v2DataApi: ReturnType<typeof useV2Data> | null = null

function SubscriberDataProbe() {
  const data = useV2Data()
  v2DataApi = data
  const all = data.subscriberLists.find((list) => list.name === 'All Subscribers')?.count ?? 0
  const seattle = data.subscriberLists.find((list) => list.name === 'Seattle VIP')?.count ?? 0
  const tenantSubscribers = data.platformTenants.find((tenant) => tenant.slug === 'demo-retail')?.subscribers ?? 0
  const existing = data.subscribers.find((subscriber) => subscriber.phone === '+1 (503) 555-0281')
  const persistentCampaign = data.campaigns.find((campaign) => campaign.name === 'Persistent Workspace Campaign')
  const persistentSubscriber = data.subscribers.find((subscriber) => subscriber.phone === '+1 (999) 555-1234')
  const persistentAccessCode = data.accessCodes.find((code) => code.code === 'DMRT-RMX-0625')

  return (
    <div>
      <output data-testid="all-subscriber-count">{all}</output>
      <output data-testid="seattle-vip-count">{seattle}</output>
      <output data-testid="tenant-subscriber-count">{tenantSubscribers}</output>
      <output data-testid="existing-segments">{existing?.segments.join(', ')}</output>
      <output data-testid="persistent-campaign">{persistentCampaign?.name ?? ''}</output>
      <output data-testid="persistent-subscriber">{persistentSubscriber?.segments.join(', ') ?? ''}</output>
      <output data-testid="persistent-access-code">{persistentAccessCode?.expires ?? ''}</output>
      <output data-testid="template-count">{data.templates.length}</output>
      <output data-testid="media-count">{data.mediaAssets.length}</output>
      <output data-testid="team-count">{data.teamMembers.length}</output>
      <output data-testid="tenant-count">{data.platformTenants.length}</output>
    </div>
  )
}

describe('RedesignV2App product rules', () => {
  it('keeps customer admins scoped to their own company and dedupes dashboard scheduled reach', () => {
    render(<RedesignV2App initialMode="company" routeSyncMode="company" companyPage="dashboard" />)

    expect(screen.getAllByText('Customer Company Admin').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Demo Retail Co only').length).toBeGreaterThan(0)
    expect(screen.getByText(/All Markets/)).toBeInTheDocument()
    expect(screen.getAllByText('2.65M').length).toBeGreaterThan(0)
    expect(screen.getByText('4.9%')).toBeInTheDocument()
    expect(screen.queryByText('2,653,350')).not.toBeInTheDocument()
    expect(screen.queryByText('All customer companies')).not.toBeInTheDocument()
  })

  it('shows internal operator identity in the SaaS admin shell', () => {
    render(<RedesignV2App initialMode="admin" routeSyncMode="admin" adminPage="dashboard" />)

    expect(screen.getAllByText('SaaS Internal Admin').length).toBeGreaterThan(0)
    expect(screen.getByText('ops@example.test')).toBeInTheDocument()
    expect(screen.queryByText('owner@demo-retail.test')).not.toBeInTheDocument()
  })

  it('treats all subscribers as a paged sample over the full audience universe', async () => {
    const user = userEvent.setup()
    render(<RedesignV2App initialMode="company" routeSyncMode="company" companyPage="subscribers" />)

    expect(screen.getAllByText('All Subscribers').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2,650,000').length).toBeGreaterThan(0)
    expect(screen.getByText(/Showing 25 of 120 sample records from 2,650,000 unique subscribers/i)).toBeInTheDocument()

    await user.click(screen.getAllByText('West Loyalty')[0])
    expect(screen.getByText(/segment members/i)).toBeInTheDocument()
    expect(screen.getAllByText('West Loyalty').length).toBeGreaterThan(1)
  })

  it('dedupes subscriber adds and imports by phone before changing counts', async () => {
    let imported = 0
    render(
      <V2DataProvider>
        <SubscriberDataProbe />
      </V2DataProvider>,
    )

    expect(screen.getByTestId('all-subscriber-count')).toHaveTextContent('2650000')
    expect(screen.getByTestId('seattle-vip-count')).toHaveTextContent('812400')

    act(() => {
      v2DataApi?.addSubscriber({ phone: '+1 (503) 555-0281', listName: 'Seattle VIP', consentConfirmed: true })
    })

    await waitFor(() => expect(screen.getByTestId('all-subscriber-count')).toHaveTextContent('2650000'))
    expect(screen.getByTestId('seattle-vip-count')).toHaveTextContent('812401')
    expect(screen.getByTestId('tenant-subscriber-count')).toHaveTextContent('2650000')
    expect(screen.getByTestId('existing-segments')).toHaveTextContent('West Loyalty, Seattle VIP')

    act(() => {
      imported = v2DataApi?.importSubscribers(
        '+1 (503) 555-0281,Jane,Smith,Seattle\n+1 (999) 555-0000,Ada,Lovelace,Portland\n+1 (999) 555-0000,Ada,Lovelace,Portland',
        'Seattle VIP',
        true,
      ) ?? 0
    })

    expect(imported).toBe(1)
    await waitFor(() => expect(screen.getByTestId('all-subscriber-count')).toHaveTextContent('2650001'))
    expect(screen.getByTestId('seattle-vip-count')).toHaveTextContent('812402')
    expect(screen.getByTestId('tenant-subscriber-count')).toHaveTextContent('2650001')
  })

  it('persists customer workspace changes across provider remounts', async () => {
    const view = render(
      <V2DataProvider>
        <SubscriberDataProbe />
      </V2DataProvider>,
    )

    act(() => {
      v2DataApi?.createCampaign({
        name: 'Persistent Workspace Campaign',
        listNames: ['Seattle VIP'],
        body: 'Hi {first_name}, persistence check. Reply STOP to opt out.',
        dateISO: '2026-06-20',
        time: '10:00',
        type: 'SMS',
      })
      v2DataApi?.addSubscriber({ phone: '+1 (999) 555-1234', listName: 'Winback Shoppers', consentConfirmed: true })
      v2DataApi?.generateAccessCode('Regional Manager', '2026-06-25', '2026-06-14')
    })

    await waitFor(() => expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)).toContain('Persistent Workspace Campaign'))
    expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)).toContain('+1 (999) 555-1234')
    expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)).toContain('DMRT-RMX-0625')

    view.unmount()
    v2DataApi = null

    render(
      <V2DataProvider>
        <SubscriberDataProbe />
      </V2DataProvider>,
    )

    expect(screen.getByTestId('persistent-campaign')).toHaveTextContent('Persistent Workspace Campaign')
    expect(screen.getByTestId('persistent-subscriber')).toHaveTextContent('Winback Shoppers')
    expect(screen.getByTestId('persistent-access-code')).toHaveTextContent('Jun 25, 2026')
  })

  it('caps customer access-code expiry at thirty days', async () => {
    const user = userEvent.setup()
    const { container } = render(<RedesignV2App initialMode="company" routeSyncMode="company" companyPage="settings" />)

    const expiryInput = container.querySelector('input[type="date"]') as HTMLInputElement
    const generateButton = screen.getByRole('button', { name: /Generate access code/i })

    fireEvent.input(expiryInput, { target: { value: '2026-12-31' } })
    fireEvent.change(expiryInput, { target: { value: '2026-12-31' } })
    expect(generateButton).toBeDisabled()
    expect(screen.getByText(/Access codes can expire no later than Jul 14, 2026/i)).toBeInTheDocument()

    fireEvent.input(expiryInput, { target: { value: '2026-06-20' } })
    fireEvent.change(expiryInput, { target: { value: '2026-06-20' } })
    expect(generateButton).toBeEnabled()

    await user.click(generateButton)
    expect(screen.getByText('DMRT-CMX-0620')).toBeInTheDocument()
  })

  it('rejects overlong access-code expiry in the shared data action', () => {
    render(
      <V2DataProvider>
        <SubscriberDataProbe />
      </V2DataProvider>,
    )

    expect(() => {
      v2DataApi?.generateAccessCode('Campaign Manager', '2026-12-31', '2026-06-14')
    }).toThrow('Access codes can expire no later than Jul 14, 2026 (30 days from creation).')
    expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)).not.toContain('DMRT-CMX-1231')
  })

  it('rejects noncompliant campaigns in the shared data action', () => {
    render(
      <V2DataProvider>
        <SubscriberDataProbe />
      </V2DataProvider>,
    )

    expect(() => {
      v2DataApi?.createCampaign({
        name: 'No STOP',
        listNames: ['Seattle VIP'],
        body: 'Hi there, sale today.',
        dateISO: '2026-06-20',
        time: '10:00',
        type: 'SMS',
      })
    }).toThrow('Campaign message must include STOP opt-out language.')

    expect(() => {
      v2DataApi?.createCampaign({
        name: 'Past campaign',
        listNames: ['Seattle VIP'],
        body: 'Hi there, sale today. Reply STOP to opt out.',
        dateISO: '2026-06-01',
        time: '10:00',
        type: 'SMS',
      })
    }).toThrow('Campaign schedule cannot be in the past.')

    expect(() => {
      v2DataApi?.createCampaign({
        name: 'Past same-day campaign',
        listNames: ['Seattle VIP'],
        body: 'Hi there, sale today. Reply STOP to opt out.',
        dateISO: '2026-06-14',
        time: '08:00',
        type: 'SMS',
      })
    }).toThrow('Campaign schedule cannot be in the past.')

    expect(() => {
      v2DataApi?.createCampaign({
        name: 'Quiet campaign',
        listNames: ['Seattle VIP'],
        body: 'Hi there, sale today. Reply STOP to opt out.',
        dateISO: '2026-06-20',
        time: '22:00',
        type: 'SMS',
      })
    }).toThrow('Campaign send time must be between 8:00 AM and 9:00 PM local time.')

    expect(() => {
      v2DataApi?.createCampaign({
        name: 'No audience',
        listNames: [],
        body: 'Hi there. Reply STOP to opt out.',
        dateISO: '2026-06-20',
        time: '10:00',
        type: 'SMS',
      })
    }).toThrow('Select at least one valid subscriber list.')

    expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)).not.toContain('No STOP')
  })

  it('guards sensitive shared mutations before state changes', () => {
    render(
      <V2DataProvider>
        <SubscriberDataProbe />
      </V2DataProvider>,
    )

    expect(() => v2DataApi?.addSubscriber({ phone: '+1 (206) 555-0101', listName: 'Seattle VIP' }))
      .toThrow('Subscriber consent must be confirmed before adding marketable contacts.')
    expect(() => v2DataApi?.addSubscriber({ phone: 'abc', listName: 'Seattle VIP', consentConfirmed: true }))
      .toThrow('Subscriber phone number must include at least 10 digits.')
    expect(() => v2DataApi?.addSubscriber({ phone: '+1 (206) 555-0101', listName: 'Missing Segment', consentConfirmed: true }))
      .toThrow('Select a valid subscriber list.')
    expect(() => v2DataApi?.importSubscribers('+1 (206) 555-0101,Jane,Smith,Seattle', 'Seattle VIP'))
      .toThrow('Subscriber consent must be confirmed before adding marketable contacts.')
    expect(() => v2DataApi?.importSubscribers('not-a-phone,Jane,Smith,Seattle', 'Seattle VIP', true))
      .toThrow('CSV import must include at least one valid phone number.')
    expect(() => v2DataApi?.addSubscriberList('Seattle VIP', 'All markets'))
      .toThrow('A subscriber list with that name already exists.')
    expect(() => v2DataApi?.addTemplate({
      name: 'Unsafe template',
      type: 'SMS',
      tags: ['promo'],
      preview: 'Shop the sale today.',
    })).toThrow('Template message must include STOP opt-out language.')
    expect(() => v2DataApi?.addMediaAsset({
      name: 'Bad asset',
      type: 'SVG',
      size: '12 KB',
      dims: '100x100',
      url: 'file:///tmp/bad.svg',
    })).toThrow('Media asset URL must be a valid http or https URL.')
    expect(() => v2DataApi?.addTeamMember({
      name: 'Broken User',
      email: 'broken',
      role: 'Campaign Manager',
      budget: '$1,000',
    })).toThrow('Team member email must be a valid email address.')
    expect(() => v2DataApi?.deleteTeamMember('owner@demo-retail.test'))
      .toThrow('The workspace owner cannot be removed.')
    expect(() => v2DataApi?.generateAccessCode('SaaS Internal Admin', '2026-06-20', '2026-06-14'))
      .toThrow('Select a valid workspace role.')
    expect(() => v2DataApi?.createPlatformTenant({
      name: 'Bad Credits Co',
      slug: 'bad-credits-co',
      admin: 'admin@bad.test',
      monthlyLimit: 100,
      creditsRemaining: 200,
    })).toThrow('Credits remaining cannot exceed the monthly send limit.')
    expect(() => v2DataApi?.updatePlatformTenantLimits('demo-retail', 100, 200))
      .toThrow('Credits remaining cannot exceed the monthly send limit.')
    expect(() => v2DataApi?.setPlatformTenantStatus('demo-retail', 'paused' as never))
      .toThrow('Company status must be active or suspended.')

    expect(screen.getByTestId('all-subscriber-count')).toHaveTextContent('2650000')
    expect(screen.getByTestId('template-count')).toHaveTextContent('6')
    expect(screen.getByTestId('media-count')).toHaveTextContent('6')
    expect(screen.getByTestId('team-count')).toHaveTextContent('4')
    expect(screen.getByTestId('tenant-count')).toHaveTextContent('5')
  })

  it('forces MMS when media is selected and caps overlapping campaign audiences', async () => {
    const user = userEvent.setup()
    render(<RedesignV2App initialMode="company" routeSyncMode="company" companyPage="content" />)

    await user.click(screen.getByRole('button', { name: 'Media Assets' }))
    await user.click(screen.getAllByRole('button', { name: 'Use' })[0])

    expect(screen.getByText(/MMS asset loaded: Summer Collection Hero/i)).toBeInTheDocument()
    await user.click(screen.getByLabelText(/Seattle VIP/i))
    await user.click(screen.getByLabelText(/West Loyalty/i))
    await user.click(screen.getByRole('button', { name: /Continue/i }))

    expect(screen.getByRole('button', { name: 'SMS' })).toBeDisabled()
    expect(screen.getByText('Media attachments require MMS.')).toBeInTheDocument()
    expect(screen.getAllByText('2,650,000').length).toBeGreaterThan(0)
    expect(screen.getByText('Overlapping list members deduped at All Subscribers.')).toBeInTheDocument()
  })

  it('keeps campaign media selection on the message step and disables SMS', async () => {
    const user = userEvent.setup()
    render(<RedesignV2App initialMode="company" routeSyncMode="company" companyPage="campaigns" campaignSubpage="create" />)

    await user.click(screen.getByLabelText(/Seattle VIP/i))
    await user.click(screen.getByRole('button', { name: /Continue/i }))
    expect(screen.getByLabelText(/Campaign name/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Use demo asset' }))

    expect(screen.getByLabelText(/Campaign name/i)).toBeInTheDocument()
    expect(screen.getByText(/MMS asset loaded: Summer Collection Hero/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'SMS' })).toBeDisabled()
    expect(screen.getByText('Media attachments require MMS.')).toBeInTheDocument()
  })

  it('blocks same-day campaign times that are already in the past', async () => {
    const user = userEvent.setup()
    render(<RedesignV2App initialMode="company" routeSyncMode="company" companyPage="campaigns" campaignSubpage="create" />)

    await user.click(screen.getByLabelText(/Seattle VIP/i))
    await user.click(screen.getByRole('button', { name: /Continue/i }))
    await user.type(screen.getByLabelText(/Campaign name/i), 'Same Day Past Time')
    await user.type(screen.getByRole('textbox', { name: /SMS body/i }), 'Hi {first_name}, sale today. Reply STOP to opt out.')
    fireEvent.input(screen.getByLabelText(/Scheduled date/i), { target: { value: '2026-06-14' } })
    fireEvent.change(screen.getByLabelText(/Scheduled date/i), { target: { value: '2026-06-14' } })
    fireEvent.input(screen.getByLabelText(/Send time/i), { target: { value: '08:00' } })
    fireEvent.change(screen.getByLabelText(/Send time/i), { target: { value: '08:00' } })

    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
    expect(screen.getByText(/Schedule must be in the future/i)).toBeInTheDocument()
  })

  it('persists internal tenant creation for the admin dashboard', async () => {
    const user = userEvent.setup()
    const createdCompany = 'Cascadia Outdoor Co'

    const view = render(<RedesignV2App initialMode="admin" routeSyncMode="admin" adminPage="companies" />)

    await user.click(screen.getByRole('button', { name: /Create company/i }))
    await user.type(screen.getByPlaceholderText('e.g. Acme Retail Co'), createdCompany)
    await user.type(screen.getByPlaceholderText('admin@company.test'), 'admin@cascadia.test')
    const numberInputs = screen.getAllByPlaceholderText('e.g. 4800000')
    await user.clear(numberInputs[0])
    await user.type(numberInputs[0], '1200000')
    await user.clear(numberInputs[1])
    await user.type(numberInputs[1], '1200000')
    await user.click(screen.getByRole('button', { name: /Create & generate code/i }))

    expect(screen.getAllByText(createdCompany).length).toBeGreaterThan(0)
    await waitFor(() => expect(window.localStorage.getItem(PLATFORM_TENANTS_STORAGE_KEY)).toContain(createdCompany))

    view.unmount()
    render(<RedesignV2App initialMode="admin" routeSyncMode="admin" adminPage="dashboard" />)

    const dashboardTable = screen.getByRole('table')
    expect(within(dashboardTable).getByText(createdCompany)).toBeInTheDocument()
    expect(within(dashboardTable).getByText('cascadia-outdoor-co')).toBeInTheDocument()
    expect(window.localStorage.getItem(PLATFORM_TENANTS_STORAGE_KEY)).toContain('admin@cascadia.test')
  })

  it('uses real local observability links on the internal dashboard', () => {
    render(<RedesignV2App initialMode="admin" routeSyncMode="admin" adminPage="dashboard" />)

    const grafana = screen.getByRole('link', { name: /open grafana/i })
    const tempo = screen.getByRole('link', { name: /open tempo traces/i })
    const prometheus = screen.getByRole('link', { name: /open prometheus/i })

    expect(grafana).toHaveAttribute('href', 'http://127.0.0.1:3000')
    expect(tempo).toHaveAttribute('href', 'http://127.0.0.1:3000/explore')
    expect(prometheus).toHaveAttribute('href', 'http://127.0.0.1:9090')
    expect(grafana).toHaveAttribute('target', '_blank')
    expect(screen.queryByText(/opened/i)).not.toBeInTheDocument()
  })
})
