import { useEffect, useState, type FormEvent } from 'react'

import { API_BASE_URL, apiErrorMessage, apiStatusDetail, readApiJson } from '../../api/client'
import type {
  AdminDashboardSummary,
  AdminPage,
  CampaignListItem,
  CompanyHealthRow,
  CompanyResult,
  SystemCheck,
  UsageRow,
} from '../../types'
import { AdminDashboard } from './AdminDashboard'
import { CompaniesPage } from './CompaniesPage'
import { UsagePage } from './UsagePage'

export function AdminWorkspace({ page }: { page: AdminPage }) {
  const [companyName, setCompanyName] = useState('Acme Retail')
  const [companySlug, setCompanySlug] = useState('acme-retail')
  const [initialAdminEmail, setInitialAdminEmail] = useState('admin@acme.test')
  const [monthlySendLimit, setMonthlySendLimit] = useState('50000')
  const [creditBalance, setCreditBalance] = useState('50000')
  const [companyResult, setCompanyResult] = useState<CompanyResult | null>(null)
  const [adminSummary, setAdminSummary] = useState<AdminDashboardSummary | null>(null)
  const [usageFromDate, setUsageFromDate] = useState('2026-05-01')
  const [usageToDate, setUsageToDate] = useState('2026-05-21')
  const [usageRows, setUsageRows] = useState<UsageRow[]>([])
  const [companyHealthRows, setCompanyHealthRows] = useState<CompanyHealthRow[]>([])
  const [selectedCompanyHealth, setSelectedCompanyHealth] = useState<CompanyHealthRow | null>(null)
  const [selectedCompanyCampaigns, setSelectedCompanyCampaigns] = useState<CampaignListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([
    { path: '/healthz', label: 'Campaign API liveness', state: 'checking', detail: 'Not checked yet' },
    { path: '/readyz', label: 'Campaign API readiness', state: 'checking', detail: 'Not checked yet' },
    { path: '/metrics', label: 'Prometheus metrics', state: 'checking', detail: 'Not checked yet' },
    { path: '/observability/trace-smoke', label: 'Trace smoke', state: 'checking', detail: 'Not checked yet' },
  ])

  useEffect(() => {
    async function loadAdminSummary() {
      try {
        const [summaryResponse, healthResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/dashboard-summary`, {
            headers: { 'X-Internal-Admin': 'true' },
          }),
          fetch(`${API_BASE_URL}/admin/company-health?from=2026-05-22&to=2026-06-21`, {
            headers: { 'X-Internal-Admin': 'true' },
          }),
        ])
        if (summaryResponse.ok) setAdminSummary(await readApiJson<AdminDashboardSummary>(summaryResponse))
        if (healthResponse.ok) setCompanyHealthRows(await readApiJson<CompanyHealthRow[]>(healthResponse))
      } catch (error) {
        setError(apiErrorMessage(error, 'Admin dashboard failed to load. Check that the Campaign API is available.'))
      }
    }
    void loadAdminSummary()
  }, [companyResult])

  async function refreshCompanyHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/company-health?from=2026-05-22&to=2026-06-21`, {
        headers: { 'X-Internal-Admin': 'true' },
      })
      if (response.ok) setCompanyHealthRows(await readApiJson<CompanyHealthRow[]>(response))
    } catch (error) {
      setError(apiErrorMessage(error, 'Company health failed to load. Check that the Campaign API is available.'))
    }
  }

  async function reviewCompany(row: CompanyHealthRow) {
    setError(null)
    setSelectedCompanyHealth(row)
    setSelectedCompanyCampaigns([])
    const response = await fetch(`${API_BASE_URL}/companies/${row.company_id}/campaigns`)
    if (!response.ok) {
      setError(`Company campaign history failed: ${response.status}`)
      return
    }
    try {
      setSelectedCompanyCampaigns(await readApiJson<CampaignListItem[]>(response))
    } catch (error) {
      setError(apiErrorMessage(error, 'Company campaign history failed. Check that the Campaign API is available.'))
    }
  }

  function toSystemCheck(response: Response, path: string, label: string): SystemCheck {
    const detail = apiStatusDetail(response, path)
    if (!response.ok || detail !== `${path} responded ${response.status}`) return { path, label, state: 'error', detail }
    return { path, label, state: 'ok', detail }
  }

  async function toTraceSystemCheck(response: Response): Promise<SystemCheck> {
    const base = toSystemCheck(response, '/observability/trace-smoke', 'Trace smoke')
    if (!response.ok) return base
    const body = await readApiJson<{ trace_id?: string; span_id?: string; sampled?: boolean }>(response).catch(() => null)
    const traceId = typeof body?.trace_id === 'string' ? body.trace_id : null
    const spanId = typeof body?.span_id === 'string' ? body.span_id : null
    const sampled = typeof body?.sampled === 'boolean' ? body.sampled : undefined
    return {
      ...base,
      detail: traceId ? `Trace smoke responded ${response.status}` : base.detail,
      traceId,
      spanId,
      sampled,
    }
  }

  async function refreshSystemStatus() {
    const checks = await Promise.all([
      fetch(`${API_BASE_URL}/healthz`)
        .then((response) => toSystemCheck(response, '/healthz', 'Campaign API liveness'))
        .catch(() => ({ path: '/healthz', label: 'Campaign API liveness', state: 'error', detail: 'Request failed' }) as SystemCheck),
      fetch(`${API_BASE_URL}/readyz`)
        .then((response) => toSystemCheck(response, '/readyz', 'Campaign API readiness'))
        .catch(() => ({ path: '/readyz', label: 'Campaign API readiness', state: 'error', detail: 'Request failed' }) as SystemCheck),
      fetch(`${API_BASE_URL}/metrics`)
        .then((response) => toSystemCheck(response, '/metrics', 'Prometheus metrics'))
        .catch(() => ({ path: '/metrics', label: 'Prometheus metrics', state: 'error', detail: 'Request failed' }) as SystemCheck),
      fetch(`${API_BASE_URL}/observability/trace-smoke`)
        .then(toTraceSystemCheck)
        .catch(() => ({ path: '/observability/trace-smoke', label: 'Trace smoke', state: 'error', detail: 'Request failed' }) as SystemCheck),
    ])
    setSystemChecks(checks)
  }

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const limit = monthlySendLimit.trim() ? Number(monthlySendLimit) : null
    const credits = creditBalance.trim() ? Number(creditBalance) : 0
    const response = await fetch(`${API_BASE_URL}/admin/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Admin': 'true' },
      body: JSON.stringify({
        name: companyName,
        slug: companySlug,
        admin_email: initialAdminEmail,
        monthly_send_limit: limit,
        credit_balance: credits,
      }),
    })
    if (!response.ok) {
      setError(`Create company failed: ${response.status}`)
      return
    }
    try {
      setCompanyResult(await readApiJson<CompanyResult>(response))
    } catch (error) {
      setError(apiErrorMessage(error, 'Create company failed. Check that the Campaign API is available.'))
    }
  }

  async function loadUsage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const params = new URLSearchParams({ from: usageFromDate, to: usageToDate })
    const response = await fetch(`${API_BASE_URL}/admin/usage?${params.toString()}`, {
      headers: { 'X-Internal-Admin': 'true' },
    })
    if (!response.ok) {
      setError(`Usage dashboard failed: ${response.status}`)
      return
    }
    try {
      setUsageRows(await readApiJson<UsageRow[]>(response))
    } catch (error) {
      setError(apiErrorMessage(error, 'Usage dashboard failed. Check that the Campaign API is available.'))
    }
  }

  if (page === 'companies') {
    return (
      <CompaniesPage
        companyName={companyName}
        companySlug={companySlug}
        initialAdminEmail={initialAdminEmail}
        monthlySendLimit={monthlySendLimit}
        creditBalance={creditBalance}
        companyResult={companyResult}
        companies={usageRows}
        companyHealthRows={companyHealthRows}
        error={error}
        selectedCompanyHealth={selectedCompanyHealth}
        selectedCompanyCampaigns={selectedCompanyCampaigns}
        onCompanyName={setCompanyName}
        onCompanySlug={setCompanySlug}
        onInitialAdminEmail={setInitialAdminEmail}
        onMonthlySendLimit={setMonthlySendLimit}
        onCreditBalance={setCreditBalance}
        onCreateCompany={createCompany}
        onRefreshCompanyHealth={() => void refreshCompanyHealth()}
        onReviewCompany={(row) => void reviewCompany(row)}
      />
    )
  }

  if (page === 'usage') {
    return (
      <UsagePage
        usageFromDate={usageFromDate}
        usageToDate={usageToDate}
        usageRows={usageRows}
        companyHealthRows={companyHealthRows}
        error={error}
        onUsageFromDate={setUsageFromDate}
        onUsageToDate={setUsageToDate}
        onLoadUsage={loadUsage}
      />
    )
  }

  return (
    <AdminDashboard
      adminSummary={adminSummary}
      companyResult={companyResult}
      usageRows={usageRows}
      companyHealthRows={companyHealthRows}
      systemChecks={systemChecks}
      onRefreshSystemStatus={() => void refreshSystemStatus()}
    />
  )
}
