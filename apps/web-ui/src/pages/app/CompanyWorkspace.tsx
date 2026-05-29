import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { API_BASE_URL } from '../../api/client'
import { DataTable } from '../../components/DataTable'
import { EmptyState } from '../../components/EmptyState'
import { MetricCard as Metric } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { QuotaBar } from '../../components/QuotaBar'
import { getRoleMeta, roleOptions } from '../../roles'
import type {
  AccessCodeResult,
  BroadcastMonitor,
  Campaign,
  CampaignLink,
  CampaignListItem,
  CampaignSubpage,
  CompanyPage,
  CompanyUser,
  DashboardSummary,
  MediaAsset,
  OptInResult,
  PerformanceTotals,
  ReminderCampaign,
  Session,
  SubscriberListResult,
  SubscriberResult,
  SubscriberSearchResult,
} from '../../types'
import { formatActivity, formatCount, formatLocalDateTime, formatNumber } from '../../utils'

const contentTemplates = [
  {
    title: 'Memorial Day 30% Off Hero',
    tag: 'Holiday sale',
    copy: 'Memorial Day starts now: take 30% off summer favorites. Use code MEMORIAL30 through Monday.',
    preview: '30% OFF',
    messageType: 'smart',
    mediaKeywords: ['memorial', 'coupon', 'offer'],
  },
  {
    title: 'VIP Loyalty Double Points',
    tag: 'Loyalty',
    copy: 'VIP weekend: earn double points on every order through Sunday. Your reward balance updates automatically.',
    preview: '2X POINTS',
    messageType: 'regular',
    mediaKeywords: ['loyalty', 'vip'],
  },
  {
    title: 'Weekend Flash Sale MMS',
    tag: 'Flash sale',
    copy: 'Flash sale: our bestsellers are back in stock for 48 hours. Tap to shop before sizes sell out.',
    preview: '48 HRS',
    messageType: 'smart',
    mediaKeywords: ['flash', 'sale', 'coupon'],
  },
  {
    title: 'Winback Offer',
    tag: 'Retention',
    copy: 'We saved you a private offer: take $15 off your next visit this week. Come back and see what is new.',
    preview: '$15 BACK',
    messageType: 'regular',
    mediaKeywords: ['winback', 'offer'],
  },
] satisfies {
  title: string
  tag: string
  copy: string
  preview: string
  messageType: 'regular' | 'smart'
  mediaKeywords: string[]
}[]

export function CompanyWorkspace({
  page,
  session,
  initialCampaignSubpage,
  onNavigate,
}: {
  page: CompanyPage
  session: Extract<Session, { role: 'company_user' }>
  initialCampaignSubpage?: CampaignSubpage
  onNavigate: (page: CompanyPage) => void
}) {
  const companyId = session.companyId
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
  const [campaignName, setCampaignName] = useState('Memorial Day VIP Weekend')
  const [messageBody, setMessageBody] = useState('Memorial Day starts now: take 30% off summer favorites through Monday. Use code MEMORIAL30 in-store or online.')
  const [messageType, setMessageType] = useState<'regular' | 'smart'>('regular')
  const [campaignSubpage, setCampaignSubpage] = useState<CampaignSubpage>(initialCampaignSubpage ?? 'overview')
  const [scheduledAt, setScheduledAt] = useState('2026-05-25T16:00')
  const [smartMediaAssetId, setSmartMediaAssetId] = useState('')
  const [subscriberLists, setSubscriberLists] = useState<SubscriberListResult[]>([])
  const [subscribers, setSubscribers] = useState<SubscriberResult[]>([])
  const [subscriberTotal, setSubscriberTotal] = useState(0)
  const [subscriberLimit, setSubscriberLimit] = useState(25)
  const [subscriberOffset, setSubscriberOffset] = useState(0)
  const [subscriberSearch, setSubscriberSearch] = useState('')
  const [subscriberConsentFilter, setSubscriberConsentFilter] = useState('all')
  const [directSubscriberSearch, setDirectSubscriberSearch] = useState('')
  const [directSubscriberRows, setDirectSubscriberRows] = useState<SubscriberResult[]>([])
  const [directSubscriberTotal, setDirectSubscriberTotal] = useState(0)
  const [selectedListIds, setSelectedListIds] = useState<string[]>([])
  const [selectedSubscriberIds, setSelectedSubscriberIds] = useState<string[]>([])
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [campaignSearch, setCampaignSearch] = useState('')
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('all')
  const [campaignDateFrom, setCampaignDateFrom] = useState('')
  const [campaignDateTo, setCampaignDateTo] = useState('')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [selectedMonitorCampaignId, setSelectedMonitorCampaignId] = useState('')
  const [broadcastMonitor, setBroadcastMonitor] = useState<BroadcastMonitor | null>(null)
  const [monitorLoading, setMonitorLoading] = useState(false)
  const [monitorError, setMonitorError] = useState<string | null>(null)
  const [monitorRefreshTick, setMonitorRefreshTick] = useState(0)
  const [listName, setListName] = useState('VIP List')
  const [subscriberList, setSubscriberList] = useState<SubscriberListResult | null>(null)
  const [subscriberPhone, setSubscriberPhone] = useState('+15550001010')
  const [subscriberSource, setSubscriberSource] = useState('import')
  const [subscriber, setSubscriber] = useState<SubscriberResult | null>(null)
  const [selectedSubscriberListId, setSelectedSubscriberListId] = useState('all')
  const [csvImportText, setCsvImportText] = useState('phone_number,list_name,region,source\n+15550001012,VIP Customers,Phoenix,loyalty_export')
  const [csvImportResult, setCsvImportResult] = useState<string | null>(null)
  const [optInPhone, setOptInPhone] = useState('+15550001011')
  const [optInSource, setOptInSource] = useState('landing-page')
  const [optIn, setOptIn] = useState<OptInResult | null>(null)
  const [confirmToken, setConfirmToken] = useState('')
  const [confirmResult, setConfirmResult] = useState<OptInResult | null>(null)
  const [mediaFilename, setMediaFilename] = useState('memorial-day-hero.png')
  const [mediaContentType, setMediaContentType] = useState('image/png')
  const [mediaUrl, setMediaUrl] = useState('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80')
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [trackedCampaignId, setTrackedCampaignId] = useState('')
  const [trackedSubscriberId, setTrackedSubscriberId] = useState('')
  const [trackedMediaAssetId, setTrackedMediaAssetId] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('https://example.com/offers/memorial-day')
  const [campaignLinks, setCampaignLinks] = useState<CampaignLink[]>([])
  const [campaignLink, setCampaignLink] = useState<CampaignLink | null>(null)
  const [contentFeedback, setContentFeedback] = useState<string | null>(null)
  const [performance, setPerformance] = useState<PerformanceTotals | null>(null)
  const [reminderSourceCampaignId, setReminderSourceCampaignId] = useState('')
  const [reminderAudienceRule, setReminderAudienceRule] = useState('not_clicked')
  const [reminderMessageBody, setReminderMessageBody] = useState('Still thinking it over? Your VIP offer ends tonight. Tap to finish checkout before it expires.')
  const [reminderCampaign, setReminderCampaign] = useState<ReminderCampaign | null>(null)
  const [reminderCampaigns, setReminderCampaigns] = useState<ReminderCampaign[]>([])
  const [teamUsers, setTeamUsers] = useState<CompanyUser[]>([])
  const [inviteRole, setInviteRole] = useState('campaign_manager')
  const [inviteCreditLimit, setInviteCreditLimit] = useState('2000')
  const [accessCodeResult, setAccessCodeResult] = useState<AccessCodeResult | null>(null)
  const [editUserEmail, setEditUserEmail] = useState('')
  const [editUserRole, setEditUserRole] = useState('campaign_manager')
  const [editCreditLimit, setEditCreditLimit] = useState('2000')
  const [error, setError] = useState<string | null>(null)
  const roleMeta = getRoleMeta(session.membershipRole)
  const availableRoles = roleOptions()
  const isReadOnly = roleMeta.isReadOnly
  const canCreateCampaign = roleMeta.canCreateCampaign
  const canInvite = roleMeta.canInvite
  const canManageBudget = roleMeta.canManageBudget
  const userBudgetLimit = session.creditLimit
  const userCreditsUsed = session.creditsUsed ?? 0
  const hasUserBudget = userBudgetLimit !== null && userBudgetLimit !== undefined
  const userBudgetRemaining = hasUserBudget ? Math.max(0, userBudgetLimit - userCreditsUsed) : null

  const selectedModeledAudienceCount = useMemo(() => {
    const listSubscriberCount = subscriberLists
      .filter((list) => selectedListIds.includes(list.id))
      .reduce((total, list) => total + (list.subscriber_count ?? 0), 0)
    return listSubscriberCount + selectedSubscriberIds.length
  }, [selectedListIds, selectedSubscriberIds.length, subscriberLists])
  const selectedSampleAudienceCount = useMemo(() => {
    const listSampleCount = subscriberLists
      .filter((list) => selectedListIds.includes(list.id))
      .reduce((total, list) => total + (list.sample_subscriber_count ?? list.subscriber_count ?? 0), 0)
    return listSampleCount + selectedSubscriberIds.length
  }, [selectedListIds, selectedSubscriberIds.length, subscriberLists])

  const campaignStatusOptions = useMemo(
    () => Array.from(new Set(campaigns.map((item) => item.status).filter(Boolean))).sort(),
    [campaigns],
  )
  const filteredCampaigns = useMemo(
    () => filterCampaigns(campaigns, {
      search: campaignSearch,
      status: campaignStatusFilter,
      from: campaignDateFrom,
      to: campaignDateTo,
    }),
    [campaignDateFrom, campaignDateTo, campaignSearch, campaignStatusFilter, campaigns],
  )
  const hasCampaignFilters =
    campaignSearch.trim() !== '' || campaignStatusFilter !== 'all' || campaignDateFrom !== '' || campaignDateTo !== ''
  const upcomingCampaigns = filteredCampaigns.filter((item) => item.status === 'scheduled')
  const pastCampaigns = filteredCampaigns.filter((item) => item.status !== 'scheduled')
  const selectedSubscriberList = subscriberLists.find((list) => list.id === selectedSubscriberListId)
  const modeledAudienceTotal = subscriberLists.reduce((total, list) => total + (list.subscriber_count ?? 0), 0)
  const sampleAudienceTotal = subscriberLists.reduce(
    (total, list) => total + (list.sample_subscriber_count ?? list.subscriber_count ?? 0),
    0,
  )
  const selectedDirectoryModeledAudience =
    selectedSubscriberListId === 'all' ? modeledAudienceTotal : selectedSubscriberList?.subscriber_count ?? 0
  const subscriberPage = Math.floor(subscriberOffset / subscriberLimit) + 1
  const subscriberPageCount = Math.max(1, Math.ceil(subscriberTotal / subscriberLimit))
  const subscriberListNameById = useMemo(
    () => new Map(subscriberLists.map((list) => [list.id, list.name])),
    [subscriberLists],
  )
  const campaignCreditMultiplier = messageType === 'smart' ? 2 : 1
  const projectedSampleCreditCost = selectedSampleAudienceCount * campaignCreditMultiplier
  const projectedModeledCreditCost = selectedModeledAudienceCount * campaignCreditMultiplier
  const budgetExceeded =
    hasUserBudget && userBudgetRemaining !== null && projectedSampleCreditCost > userBudgetRemaining
  const canSubmitCampaign = canCreateCampaign && selectedSampleAudienceCount > 0 && !budgetExceeded
  const restrictionCopy = isReadOnly
    ? `${roleMeta.label} access is reporting-only. Operational actions are disabled for this workspace.`
    : `${roleMeta.label} access is scoped to ${roleMeta.marketScope.toLowerCase()}.`
  const activeCampaign =
    campaigns.find((item) => ['queued', 'scheduled', 'sending', 'processing'].includes(item.status)) ?? campaigns[0] ?? null
  const activeCampaignReach = activeCampaign?.audience_count ?? activeCampaign?.message_count ?? 0
  const dashboardAudienceSummary = subscriberLists.length
    ? `${formatNumber(subscriberLists.length)} segments / ${formatNumber(modeledAudienceTotal)} modeled`
    : 'No segments loaded'
  const dashboardAnalyticsSummary =
    dashboardSummary && (dashboardSummary.click_count > 0 || dashboardSummary.redemption_count > 0)
      ? `${formatNumber(dashboardSummary.click_count)} clicks / ${formatNumber(dashboardSummary.redemption_count)} redemptions`
      : 'Reporting starts after tracked sends'
  const companyBudgetRemaining = dashboardSummary?.credit_balance ?? 0
  const dashboardBudgetTone =
    dashboardSummary?.monthly_send_limit && dashboardSummary.credits_used / dashboardSummary.monthly_send_limit >= 0.8
      ? 'Review quota before approval'
      : 'Budget available for planned sends'
  const complianceReadinessItems = [
    'Prior express written consent evidence',
    'STOP opt-out and suppression checks',
    'Quiet hours, sender identity, and audit trail',
  ]

  useEffect(() => {
    async function loadDashboardSummary() {
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/dashboard-summary`)
      if (response.ok) setDashboardSummary(await response.json())
    }
    void loadDashboardSummary()
  }, [companyId])

  useEffect(() => {
    if (initialCampaignSubpage) setCampaignSubpage(initialCampaignSubpage)
  }, [initialCampaignSubpage])

  useEffect(() => {
    async function loadCampaignPlanningData() {
      const [listsResponse, campaignsResponse, mediaResponse, remindersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/companies/${companyId}/subscriber-lists`),
        fetch(`${API_BASE_URL}/companies/${companyId}/campaigns`),
        fetch(`${API_BASE_URL}/companies/${companyId}/media-assets`),
        fetch(`${API_BASE_URL}/companies/${companyId}/reminder-campaigns`),
      ])
      if (listsResponse.ok) setSubscriberLists(await listsResponse.json())
      if (campaignsResponse.ok) {
        const loadedCampaigns = (await campaignsResponse.json()) as CampaignListItem[]
        setCampaigns(loadedCampaigns)
        setSelectedMonitorCampaignId((current) => current || loadedCampaigns[0]?.id || '')
      }
      if (mediaResponse.ok) setMediaAssets(await mediaResponse.json())
      if (remindersResponse.ok) setReminderCampaigns(await remindersResponse.json())
    }
    void loadCampaignPlanningData()
  }, [companyId])

  useEffect(() => {
    async function loadSubscriberDirectory() {
      const response = await fetch(
        subscriberSearchUrl({
          companyId,
          q: subscriberSearch,
          listId: selectedSubscriberListId,
          consentStatus: subscriberConsentFilter,
          limit: subscriberLimit,
          offset: subscriberOffset,
        }),
      )
      if (response.ok) {
        const result = (await response.json()) as SubscriberSearchResult
        setSubscribers(result.rows)
        setSubscriberTotal(result.total)
        setSubscriberLimit(result.limit)
        setSubscriberOffset(result.offset)
      }
    }
    void loadSubscriberDirectory()
  }, [companyId, selectedSubscriberListId, subscriberConsentFilter, subscriberLimit, subscriberOffset, subscriberSearch])

  useEffect(() => {
    async function loadDirectSubscriberRows() {
      const response = await fetch(
        subscriberSearchUrl({
          companyId,
          q: directSubscriberSearch,
          listId: 'all',
          consentStatus: 'all',
          limit: 10,
          offset: 0,
        }),
      )
      if (response.ok) {
        const result = (await response.json()) as SubscriberSearchResult
        setDirectSubscriberRows(result.rows)
        setDirectSubscriberTotal(result.total)
      }
    }
    void loadDirectSubscriberRows()
  }, [companyId, directSubscriberSearch])

  useEffect(() => {
    if (page !== 'campaigns' || campaignSubpage !== 'monitor' || !selectedMonitorCampaignId) return undefined

    let cancelled = false
    async function loadMonitor() {
      setMonitorLoading(true)
      setMonitorError(null)
      const response = await fetch(`${API_BASE_URL}/campaigns/${selectedMonitorCampaignId}/broadcast-monitor`)
      if (cancelled) return
      if (response.ok) {
        setBroadcastMonitor(await response.json())
      } else {
        setMonitorError(`Monitor unavailable: ${response.status}`)
      }
      setMonitorLoading(false)
    }
    void loadMonitor()
    const interval = window.setInterval(() => void loadMonitor(), 5000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [campaignSubpage, monitorRefreshTick, page, selectedMonitorCampaignId])

  useEffect(() => {
    if (page === 'settings') void refreshTeamUsers()
  }, [companyId, page])

  function toggleValue(current: string[], value: string): string[] {
    return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
  }

  function setSubscriberListFilter(listId: string) {
    setSelectedSubscriberListId(listId)
    setSubscriberOffset(0)
  }

  function setSubscriberConsent(value: string) {
    setSubscriberConsentFilter(value)
    setSubscriberOffset(0)
  }

  function findTemplateMediaAsset(template: (typeof contentTemplates)[number]) {
    const matchingAsset = mediaAssets.find((asset) => {
      const searchable = `${asset.filename ?? ''} ${asset.url ?? ''}`.toLowerCase()
      return template.mediaKeywords.some((keyword) => searchable.includes(keyword))
    })
    return matchingAsset ?? mediaAssets.find((asset) => asset.content_type?.startsWith('image/')) ?? null
  }

  function applyTemplate(template: (typeof contentTemplates)[number]) {
    if (!canCreateCampaign) {
      setContentFeedback(`${roleMeta.label} access cannot create campaigns from templates.`)
      return
    }
    const mediaAsset = findTemplateMediaAsset(template)
    setCampaignName(template.title)
    setMessageBody(template.copy)
    setMessageType(template.messageType)
    setSmartMediaAssetId(template.messageType === 'smart' ? mediaAsset?.id ?? '' : '')
    setCampaignSubpage('create')
    setContentFeedback(`${template.title} loaded into Campaign Builder`)
    onNavigate('campaigns')
  }

  function openBroadcastMonitor() {
    window.history.pushState(null, '', '/app/monitor')
    setCampaignSubpage('monitor')
    onNavigate('campaigns')
  }

  function copyTemplateCopy(template: (typeof contentTemplates)[number]) {
    void navigator.clipboard?.writeText(template.copy)
    setContentFeedback(`Copied copy for ${template.title}`)
  }

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!canCreateCampaign) {
      setError(`${roleMeta.label} members cannot schedule campaigns. Ask an owner or campaign manager to send this broadcast.`)
      return
    }
    if (budgetExceeded) {
      setError('Projected sample send exceeds your remaining budget allocation.')
      return
    }
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Company-Id': companyId, 'X-User-Email': session.email },
      body: JSON.stringify({
        name: campaignName,
        body: messageBody,
        message_type: messageType,
        media_asset_id: messageType === 'smart' && smartMediaAssetId ? smartMediaAssetId : null,
        subscriber_list_ids: selectedListIds,
        subscriber_ids: selectedSubscriberIds,
        scheduled_at: scheduledAt,
      }),
    })
    if (!response.ok) {
      setError(`Create campaign failed: ${response.status}`)
      return
    }
    const result = (await response.json()) as Campaign
    setCampaign(result)
    setCampaigns((current) => [
      {
        id: result.id,
        company_id: result.company_id,
        name: result.name,
        body: messageBody,
        message_type: result.message_type,
        status: result.status,
        scheduled_at: result.scheduled_at,
        created_at: new Date().toISOString(),
        message_count: result.message_count,
        audience_count: result.audience_count,
        audience_mode: result.audience_mode ?? 'actual',
        credit_cost: result.credit_cost,
        reminder_count: 0,
      },
      ...current.filter((item) => item.id !== result.id),
    ])
    setDashboardSummary((current) =>
      current
        ? {
            ...current,
            credit_balance: result.remaining_credits,
            credits_used: current.credits_used + result.credit_cost,
            campaign_count: current.campaign_count + 1,
            message_count: current.message_count + result.message_count,
          }
        : current,
    )
    setTrackedCampaignId(result.id ?? '')
    setReminderSourceCampaignId(result.id ?? '')
    setSelectedMonitorCampaignId(result.id ?? '')
  }

  async function createSubscriberList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isReadOnly) return
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/subscriber-lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: listName }),
    })
    if (response.ok) setSubscriberList(await response.json())
  }

  async function importSubscriber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isReadOnly) return
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/subscribers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: subscriberPhone, source: subscriberSource, list_id: subscriberList?.id ?? '' }),
    })
    if (response.ok) {
      const result = (await response.json()) as SubscriberResult
      setSubscriber(result)
      if (result.id) setTrackedSubscriberId(result.id)
    }
  }

  function parseCsvRows(csvText: string) {
    const [headerLine, ...lines] = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (!headerLine) return []
    const headers = headerLine.split(',').map((header) => header.trim().toLowerCase())
    return lines
      .map((line) => {
        const values = line.split(',').map((value) => value.trim())
        return headers.reduce<Record<string, string>>((row, header, index) => {
          row[header] = values[index] ?? ''
          return row
        }, {})
      })
      .filter((row) => row.phone_number)
  }

  async function importCsvSubscribers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isReadOnly) return
    const rows = parseCsvRows(csvImportText)
    const importedSubscribers: SubscriberResult[] = []
    const createdLists = new Map(subscriberLists.map((list) => [list.name.toLowerCase(), list]))

    for (const row of rows) {
      const listName = row.list_name || row.region || ''
      let listId = ''
      if (listName) {
        const key = listName.toLowerCase()
        let list = createdLists.get(key)
        if (!list) {
          const listResponse = await fetch(`${API_BASE_URL}/companies/${companyId}/subscriber-lists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: listName }),
          })
          if (listResponse.ok) {
            list = (await listResponse.json()) as SubscriberListResult
            createdLists.set(key, list)
            setSubscriberLists((current) => [list as SubscriberListResult, ...current.filter((item) => item.id !== list?.id)])
          }
        }
        listId = list?.id ?? ''
      }

      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: row.phone_number,
          source: row.source || 'csv_import',
          list_id: listId,
        }),
      })
      if (response.ok) {
        const result = (await response.json()) as SubscriberResult
        importedSubscribers.push({ ...result, region: row.region, source: row.source || result.source })
      }
    }

    if (importedSubscribers.length) {
      setSubscribers((current) => [
        ...importedSubscribers,
        ...current.filter((item) => !importedSubscribers.some((imported) => imported.id === item.id)),
      ])
      setCsvImportResult(`Imported ${importedSubscribers.length} subscribers`)
    } else {
      setCsvImportResult('No subscribers imported')
    }
  }

  function stageSubscriberCsv(file: File | undefined) {
    if (!file) return
    void file.text().then(setCsvImportText)
  }

  async function startOptIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isReadOnly) return
    const response = await fetch(`${API_BASE_URL}/public/opt-ins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, phone_number: optInPhone, source: optInSource }),
    })
    if (response.ok) {
      const result = (await response.json()) as OptInResult
      setOptIn(result)
      if (result.confirmation_token) setConfirmToken(result.confirmation_token)
    }
  }

  async function confirmOptIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isReadOnly) return
    const response = await fetch(`${API_BASE_URL}/public/opt-ins/${confirmToken}/confirm`, { method: 'POST' })
    if (response.ok) setConfirmResult(await response.json())
  }

  async function addMediaAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isReadOnly) return
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/media-assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: mediaFilename, content_type: mediaContentType, url: mediaUrl }),
    })
    if (response.ok) {
      const result = (await response.json()) as MediaAsset
      setMediaAssets((current) => [result, ...current.filter((asset) => asset.id !== result.id)])
      if (result.id) setTrackedMediaAssetId(result.id)
      setContentFeedback(`${result.filename ?? 'Media asset'} added to the library`)
    } else {
      setContentFeedback(`Add media failed: ${response.status}`)
    }
  }

  async function refreshMediaAssets() {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/media-assets`)
    if (response.ok) setMediaAssets(await response.json())
  }

  function stageUploadedMedia(file: File | undefined) {
    if (!file) return
    setMediaFilename(file.name)
    setMediaContentType(file.type || 'application/octet-stream')
    setMediaUrl(`local-upload://${file.name}`)
  }

  async function createTrackedLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isReadOnly) return
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/campaign-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: trackedCampaignId,
        subscriber_id: trackedSubscriberId,
        media_asset_id: trackedMediaAssetId,
        destination_url: destinationUrl,
      }),
    })
    if (response.ok) {
      const result = (await response.json()) as CampaignLink
      setCampaignLink(result)
      setCampaignLinks((current) => [result, ...current.filter((link) => link.id !== result.id)])
      setContentFeedback(`Tracking link created: ${result.public_url}`)
    } else {
      setContentFeedback(`Create tracked link failed: ${response.status}`)
    }
  }

  async function refreshCampaignLinks() {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/campaign-links`)
    if (response.ok) setCampaignLinks(await response.json())
  }

  async function refreshPerformance() {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/campaign-performance`)
    if (response.ok) setPerformance(await response.json())
  }

  async function createReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCreateCampaign) return
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/reminder-campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_campaign_id: reminderSourceCampaignId,
        audience_rule: reminderAudienceRule,
        message_body: reminderMessageBody,
      }),
    })
    if (response.ok) {
      const result = (await response.json()) as ReminderCampaign
      setReminderCampaign(result)
      setReminderCampaigns((current) => [result, ...current.filter((item) => item.id !== result.id)])
    }
  }

  async function createTeamAccessCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canInvite) return
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/access-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: inviteRole,
        credit_limit: inviteCreditLimit.trim() ? Number(inviteCreditLimit) : null,
      }),
    })
    if (response.ok) setAccessCodeResult(await response.json())
  }

  async function refreshTeamUsers() {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/users`)
    if (response.ok) setTeamUsers(await response.json())
  }

  async function updateTeamUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManageBudget) return
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/users/${encodeURIComponent(editUserEmail)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: editUserRole,
        credit_limit: editCreditLimit.trim() ? Number(editCreditLimit) : null,
      }),
    })
    if (response.ok) {
      const updatedUser = (await response.json()) as CompanyUser
      setTeamUsers((current) => [
        updatedUser,
        ...current.filter((user) => user.email.toLowerCase() !== updatedUser.email.toLowerCase()),
      ])
    }
  }

  if (page === 'dashboard') {
    return (
      <>
        <PageHeader
          eyebrow="Company workspace"
          title="Company dashboard"
          description={`${session.companyName} (${companyId}) / ${roleMeta.permissionSummary}`}
        />
        <section className="role-aware-banner" aria-label="Workspace access summary">
          <div>
            <span className="eyebrow">Workspace role</span>
            <strong>{roleMeta.label}</strong>
            <p>{roleMeta.description}</p>
          </div>
          <div>
            <span>Market scope</span>
            <strong>{roleMeta.marketScope}</strong>
            <p>Phase 1 models this ownership in the UI. Segment-level ACL enforcement is a backend follow-up.</p>
          </div>
          <div>
            <span>User allocation</span>
            <strong>
              {hasUserBudget ? `${formatNumber(userBudgetRemaining)} remaining` : 'Company pooled budget'}
            </strong>
            <p>
              {hasUserBudget
                ? `${formatNumber(userCreditsUsed)} used of ${formatNumber(userBudgetLimit)} assigned credits.`
                : 'This membership does not have a separate user credit limit.'}
            </p>
          </div>
        </section>
        <section className="dashboard-command-surface" aria-label="Dashboard command surface">
          <div className="dashboard-command-main">
            <p className="eyebrow">Today's decisions</p>
            <h2>
              {activeCampaign
                ? `Review ${activeCampaign.name} before the next send window.`
                : 'Build the first campaign plan for this workspace.'}
            </h2>
            <p>
              Check budget, audience readiness, active broadcast state, and reporting signals before approving the next
              customer communication.
            </p>
            <div className="decision-list" aria-label="Decision queue">
              <article>
                <span>Broadcast state</span>
                <strong>{activeCampaign ? activeCampaign.status : 'No campaign loaded'}</strong>
                <p>
                  {activeCampaign
                    ? `${formatNumber(activeCampaignReach)} modeled recipients / ${formatLocalDateTime(
                        activeCampaign.scheduled_at ?? activeCampaign.created_at,
                      )}`
                    : 'Create or import a campaign to expose monitor readiness.'}
                </p>
              </article>
              <article>
                <span>Budget posture</span>
                <strong>{formatNumber(companyBudgetRemaining)} credits</strong>
                <p>{dashboardBudgetTone}</p>
              </article>
              <article>
                <span>Audience posture</span>
                <strong>{dashboardAudienceSummary}</strong>
                <p>Consent filters and modeled/sample counts are available in Subscribers.</p>
              </article>
            </div>
          </div>
          <aside className="dashboard-command-aside" aria-label="Next actions">
            <div>
              <span>Next action</span>
              <strong>{canCreateCampaign ? 'Approve or create a broadcast' : 'Review reporting and monitor status'}</strong>
            </div>
            <button
              disabled={!canCreateCampaign}
              onClick={() => {
                setCampaignSubpage('create')
                onNavigate('campaigns')
              }}
            >
              Create campaign
            </button>
            <button className="secondary" onClick={openBroadcastMonitor}>
              Open broadcast monitor
            </button>
            <button className="secondary" disabled={isReadOnly} onClick={() => onNavigate('subscribers')}>
              Import subscribers
            </button>
            <button className="secondary" disabled={isReadOnly} onClick={() => onNavigate('content')}>
              Upload media
            </button>
            <button className="secondary" onClick={() => onNavigate('analytics')}>
              View analytics
            </button>
            <a className="docs-link secondary-link" href="/kb">
              Read customer KB
            </a>
            {!canCreateCampaign ? <p className="helper-text">{restrictionCopy}</p> : null}
          </aside>
        </section>

        <div className="metric-grid dashboard-metrics" aria-label="Workspace posture">
          <Metric label="Subscribers" value={formatCount(dashboardSummary?.subscriber_count)} trend="Confirmed and imported audience" />
          <Metric label="Active campaigns" value={formatNumber(upcomingCampaigns.length)} trend="Scheduled or queued decision work" />
          <Metric label="Messages" value={formatActivity(dashboardSummary?.message_count)} trend="Sent or scheduled sample rows" />
          <Metric label="Credits remaining" value={formatCount(dashboardSummary?.credit_balance)} trend="Contract balance" />
          <Metric label="Reporting" value={dashboardAnalyticsSummary} trend="Analytics summary" />
        </div>

        <div className="dashboard-grid">
          <QuotaBar
            label="Monthly send quota"
            used={dashboardSummary?.credits_used}
            limit={dashboardSummary?.monthly_send_limit}
            helper={
              dashboardSummary?.monthly_send_limit
                ? `${formatCount(dashboardSummary?.credits_used)} credits used against a ${formatNumber(
                    dashboardSummary.monthly_send_limit,
                  )} monthly send limit.`
                : 'Monthly send limit is not configured for this tenant.'
            }
          />
          <section className="panel dashboard-reporting-summary" aria-label="Analytics and reporting summary">
            <div className="section-heading">
              <span>Reporting</span>
              <strong>Performance summary</strong>
            </div>
            <dl>
              <div>
                <dt>Clicks</dt>
                <dd>{formatActivity(dashboardSummary?.click_count)}</dd>
              </div>
              <div>
                <dt>Redemptions</dt>
                <dd>{formatActivity(dashboardSummary?.redemption_count)}</dd>
              </div>
              <div>
                <dt>Scheduled reach</dt>
                <dd>{formatNumber(upcomingCampaigns.reduce((total, item) => total + (item.audience_count ?? item.message_count), 0))}</dd>
              </div>
            </dl>
            <p className="muted">Use Analytics for campaign-level click, redemption, and credit reporting.</p>
          </section>
        </div>

        <section className="panel dashboard-access-handoff" aria-label="Invite and access-code framing">
          <div className="section-heading">
            <span>Access</span>
            <strong>Invite and budget handoff</strong>
          </div>
          <p>
            Owners issue access codes from Settings, assign roles, and set user credit limits before teammates enter
            the workspace.
          </p>
          <button className="secondary" disabled={!canInvite} onClick={() => onNavigate('settings')}>
            Manage team access
          </button>
        </section>
      </>
    )
  }

  if (page === 'campaigns') {
    const campaignTabs: { id: CampaignSubpage; label: string }[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'scheduled', label: 'Scheduled' },
      { id: 'past', label: 'Sent/Past' },
      { id: 'create', label: 'Builder' },
      { id: 'monitor', label: 'Monitor' },
      { id: 'followups', label: 'Follow-ups' },
    ]

    return (
      <>
        <PageHeader
          title="Campaigns"
          description="Plan broadcasts, review scheduled and sent campaigns, and build follow-up automations in their own workspace."
          action={
            <button disabled={!canCreateCampaign} onClick={() => setCampaignSubpage('create')}>
              Create campaign
            </button>
          }
        />
        <section className="budget-context" aria-label="Campaign budget and permission context">
          <div>
            <span>Permission</span>
            <strong>{canCreateCampaign ? 'Campaign creation enabled' : 'Read-only campaign access'}</strong>
            <p>{roleMeta.permissionSummary}</p>
          </div>
          <div>
            <span>Market scope</span>
            <strong>{roleMeta.marketScope}</strong>
            <p>Campaigns should use lists within this assigned scope until segment ACLs are enforced server-side.</p>
          </div>
          <div>
            <span>Budget</span>
            <strong>{hasUserBudget ? `${formatNumber(userBudgetRemaining)} user credits` : `${formatNumber(dashboardSummary?.credit_balance)} company credits`}</strong>
            <p>
              {hasUserBudget
                ? `${formatNumber(userCreditsUsed)} used from ${formatNumber(userBudgetLimit)} allocated credits.`
                : 'No user-level limit; campaign cost draws from the company balance.'}
            </p>
          </div>
        </section>
        <div className="segmented-control" aria-label="Campaign sections">
          {campaignTabs.map((tab) => (
            <button
              className={campaignSubpage === tab.id ? 'active' : ''}
              key={tab.id}
              onClick={() => setCampaignSubpage(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {campaignSubpage === 'overview' || campaignSubpage === 'scheduled' || campaignSubpage === 'past' ? (
          <section className="panel campaign-filters" aria-label="Campaign filters">
            <div className="section-heading">
              <span>Filters</span>
              <strong>
                Showing {formatNumber(filteredCampaigns.length)} of {formatNumber(campaigns.length)} campaigns
              </strong>
            </div>
            <div className="form-grid">
              <label>
                Search campaigns
                <input
                  value={campaignSearch}
                  onChange={(event) => setCampaignSearch(event.target.value)}
                  placeholder="Name or message body"
                />
              </label>
              <label>
                Campaign status
                <select value={campaignStatusFilter} onChange={(event) => setCampaignStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  {campaignStatusOptions.map((status) => (
                    <option value={status} key={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Scheduled/created from
                <input
                  type="datetime-local"
                  value={campaignDateFrom}
                  onChange={(event) => setCampaignDateFrom(event.target.value)}
                />
              </label>
              <label>
                Scheduled/created to
                <input
                  type="datetime-local"
                  value={campaignDateTo}
                  onChange={(event) => setCampaignDateTo(event.target.value)}
                />
              </label>
            </div>
            <div className="filter-actions">
              <span>Scheduled/created date window</span>
              <button
                className="secondary"
                disabled={!hasCampaignFilters}
                type="button"
                onClick={() => {
                  setCampaignSearch('')
                  setCampaignStatusFilter('all')
                  setCampaignDateFrom('')
                  setCampaignDateTo('')
                }}
              >
                Clear filters
              </button>
            </div>
          </section>
        ) : null}

        {campaignSubpage === 'overview' ? (
          <>
            <div className="metric-grid spaced">
              <Metric label="Scheduled" value={formatNumber(upcomingCampaigns.length)} trend="Broadcasts waiting to send" />
              <Metric label="Sent/Past" value={formatNumber(pastCampaigns.length)} trend="Completed or cancelled campaigns" />
              <Metric
                label="Scheduled reach"
                value={formatNumber(upcomingCampaigns.reduce((total, item) => total + (item.audience_count ?? item.message_count), 0))}
                trend="Modeled recipients in upcoming campaigns"
              />
              <Metric
                label="Reminder opportunities"
                value={formatNumber(campaigns.reduce((total, item) => total + item.reminder_count, 0))}
                trend="Managed under Follow-ups"
              />
            </div>
            <div className="campaign-board">
              <CampaignColumn
                title="Upcoming"
                campaigns={upcomingCampaigns.slice(0, 5)}
                emptyText={hasCampaignFilters ? 'No upcoming campaigns match the current filters.' : undefined}
                onEdit={canCreateCampaign ? () => setCampaignSubpage('create') : undefined}
              />
              <CampaignColumn
                title="Past"
                campaigns={pastCampaigns.slice(0, 5)}
                emptyText={hasCampaignFilters ? 'No past campaigns match the current filters.' : undefined}
                onEdit={canCreateCampaign ? () => setCampaignSubpage('create') : undefined}
              />
            </div>
          </>
        ) : null}

        {campaignSubpage === 'scheduled' ? (
          <div className="campaign-board single">
            <CampaignColumn
              title="Upcoming"
              campaigns={upcomingCampaigns}
              emptyText={hasCampaignFilters ? 'No scheduled campaigns match the current filters.' : undefined}
              onEdit={canCreateCampaign ? () => setCampaignSubpage('create') : undefined}
            />
          </div>
        ) : null}

        {campaignSubpage === 'past' ? (
          <div className="campaign-board single">
            <CampaignColumn
              title="Past"
              campaigns={pastCampaigns}
              emptyText={hasCampaignFilters ? 'No sent, queued, or cancelled campaigns match the current filters.' : undefined}
              onEdit={canCreateCampaign ? () => setCampaignSubpage('create') : undefined}
            />
          </div>
        ) : null}

        {campaignSubpage === 'create' ? (
          <>
            <form className="campaign-builder" onSubmit={createCampaign}>
              <section className="product-help-callout" aria-label="Campaign builder help">
                <div>
                  <strong>TCPA-aware campaign builder help</strong>
                  <p>
                    Review segments, Smart SMS costs, media requirements, consent evidence, opt-out/STOP suppression,
                    quiet hours, sender identity, and modeled audience estimates before scheduling.
                  </p>
                </div>
                <div>
                  <a href="/kb">Open campaign guide</a>
                  <a href="/features/compliance">Compliance readiness</a>
                  <a href="/features/broadcast-monitor">Preview monitor feature</a>
                </div>
              </section>
              {!canCreateCampaign ? (
                <section className="permission-callout" aria-label="Read-only campaign restriction">
                  <strong>Campaign scheduling is disabled for {roleMeta.label}</strong>
                  <p>{restrictionCopy}</p>
                </section>
              ) : null}
              <section className="builder-step" aria-label="Audience step">
                <div className="section-heading">
                  <span>Step 1</span>
                  <strong>Audience</strong>
                </div>
                <div>
                  <h2>Segments</h2>
                  {subscriberLists.length ? (
                    subscriberLists.map((list) => (
                      <label className="check-row" key={list.id}>
                        <input
                          type="checkbox"
                          checked={selectedListIds.includes(list.id)}
                          onChange={() => setSelectedListIds((current) => toggleValue(current, list.id))}
                        />
                        {list.name} ({formatNumber(list.subscriber_count)} modeled /{' '}
                        {formatNumber(list.sample_subscriber_count ?? list.subscriber_count)} sample)
                      </label>
                    ))
                  ) : (
                    <p className="muted">Create subscriber lists before scheduling broad campaigns.</p>
                  )}
                </div>
                <div>
                  <h2>Audience members</h2>
                  <label>
                    Search direct subscribers
                    <input
                      value={directSubscriberSearch}
                      onChange={(event) => setDirectSubscriberSearch(event.target.value)}
                      placeholder="Phone number or source"
                    />
                  </label>
                  {directSubscriberRows.length ? (
                    <>
                      {directSubscriberRows.map((subscriber) => (
                        <label className="check-row" key={subscriber.id}>
                          <input
                            type="checkbox"
                            checked={selectedSubscriberIds.includes(subscriber.id)}
                            onChange={() => setSelectedSubscriberIds((current) => toggleValue(current, subscriber.id))}
                          />
                          {subscriber.phone_number} ({subscriber.consent_status})
                        </label>
                      ))}
                      <p className="muted">
                        Showing {formatNumber(directSubscriberRows.length)} of {formatNumber(directSubscriberTotal)} matching sample
                        subscribers. Use segments for modeled broad sends.
                      </p>
                    </>
                  ) : (
                    <p className="muted">Search by phone or source to add individual sample subscribers.</p>
                  )}
                </div>
              </section>
              <section className="builder-step" aria-label="Message and media step">
                <div className="section-heading">
                  <span>Step 2</span>
                  <strong>Message & media</strong>
                </div>
                <div className="form-grid">
                  <label>
                    Campaign name
                    <input value={campaignName ?? ''} onChange={(event) => setCampaignName(event.target.value)} />
                  </label>
                  <label>
                    Message type
                    <select
                      value={messageType ?? ''}
                      onChange={(event) => setMessageType(event.target.value as 'regular' | 'smart')}
                    >
                      <option value="regular">Regular SMS - 1 credit</option>
                      <option value="smart">Smart SMS - 2 credits</option>
                    </select>
                  </label>
                  <label className="wide">
                    Message body
                    <textarea value={messageBody ?? ''} onChange={(event) => setMessageBody(event.target.value)} />
                  </label>
                  {messageType === 'smart' ? (
                    <label>
                      Smart SMS media
                      <select
                        value={smartMediaAssetId ?? ''}
                        onChange={(event) => setSmartMediaAssetId(event.target.value)}
                        required
                      >
                        <option value="">Choose media</option>
                        {mediaAssets.map((asset) => (
                          <option value={asset.id ?? ''} key={asset.id ?? asset.url ?? asset.filename}>
                            {asset.filename}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              </section>
              <section className="builder-step" aria-label="Schedule step">
                <div className="section-heading">
                  <span>Step 3</span>
                  <strong>Schedule</strong>
                </div>
                <label>
                  Schedule date and time
                  <input
                    type="datetime-local"
                    value={scheduledAt ?? ''}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                </label>
              </section>
              <section className="builder-step review-step" aria-label="Review and estimate step">
                <div className="section-heading">
                  <span>Step 4</span>
                  <strong>Review/estimate</strong>
                </div>
                <div className="estimate-grid" aria-label="Campaign credit estimate">
                  <div>
                    <span>Modeled audience</span>
                    <strong>{formatNumber(selectedModeledAudienceCount)}</strong>
                    <small>{formatNumber(selectedSampleAudienceCount)} loaded sample rows</small>
                  </div>
                  <div>
                    <span>Campaign credit cost</span>
                    <strong>{formatNumber(projectedSampleCreditCost)}</strong>
                    <small>Local sample cost at {formatNumber(campaignCreditMultiplier)} credit/message</small>
                  </div>
                  <div>
                    <span>Company balance</span>
                    <strong>{formatNumber(dashboardSummary?.credit_balance)}</strong>
                    <small>Current tenant credit balance</small>
                  </div>
                  <div>
                    <span>User allocation</span>
                    <strong>{hasUserBudget ? formatNumber(userBudgetRemaining) : 'Pooled'}</strong>
                    <small>
                      {hasUserBudget
                        ? `${formatNumber(userCreditsUsed)} used of ${formatNumber(userBudgetLimit)}`
                        : 'No user-level budget limit'}
                    </small>
                  </div>
                </div>
                <p className="muted">
                  {formatNumber(projectedModeledCreditCost)} credits would be required for the full modeled audience;
                  this demo schedules against loaded sample rows while preserving the modeled audience count.
                </p>
                <div className="compliance-readiness-list" aria-label="TCPA-aware send readiness">
                  <strong>TCPA-aware send readiness</strong>
                  {complianceReadinessItems.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                  <small>
                    Compliance-readiness only. Production sends need legal review, carrier policy alignment, and backend
                    enforcement.
                  </small>
                </div>
                {selectedSampleAudienceCount === 0 ? (
                  <p className="helper-text">Select at least one segment or subscriber before scheduling.</p>
                ) : null}
                {budgetExceeded ? (
                  <p className="warning-text">Projected sample send exceeds your remaining budget allocation.</p>
                ) : null}
                <button disabled={!canSubmitCampaign}>Schedule campaign</button>
              </section>
            </form>
            {campaign ? (
              <div className="result-strip">
                <strong>Campaign status</strong>
                <small>Campaign ID: {campaign.id}</small>
                <span>{campaign.message_type}</span>
                <span>{campaign.status}</span>
                <span>Scheduled: {formatLocalDateTime(campaign.scheduled_at)}</span>
                <span>Modeled audience: {formatNumber(campaign.audience_count)}</span>
                <span>Sample messages: {formatNumber(campaign.sample_message_count ?? campaign.message_count)}</span>
                <span>Mode: {campaign.audience_mode ?? 'actual'}</span>
                <span>Credits spent: {campaign.credit_cost}</span>
                <span>Remaining: {formatNumber(campaign.remaining_credits)}</span>
                <span>Tracked links: {formatNumber(campaign.tracked_links?.length ?? 0)}</span>
                <span>Queued: {campaign.status_counts.queued}</span>
                <span>Sent: {campaign.status_counts.sent}</span>
                <span>Retried: {campaign.status_counts.retried}</span>
                <span>Dead-lettered: {campaign.status_counts.dead_lettered}</span>
              </div>
            ) : null}
            {error ? <p className="error">{error}</p> : null}
          </>
        ) : null}

        {campaignSubpage === 'monitor' ? (
          <section className="panel broadcast-monitor monitor-war-room" aria-label="Live broadcast monitor">
            <div className="section-heading">
              <span>Live operations</span>
              <strong>Broadcast monitor</strong>
            </div>
            <div className="monitor-help-strip">
              <p>
                Refreshes every 5 seconds from the current monitor API. Use manual refresh to re-request the selected
                campaign while checking progress, throughput, ETA, retries, failures, and dead-lettered rows.
              </p>
              <div>
                <a href="/kb">Monitor guide</a>
                <a href="/features/broadcast-monitor">Feature details</a>
              </div>
            </div>
            {campaigns.length ? (
              <>
                <div className="form-grid monitor-controls">
                  <label>
                    Monitor campaign
                    <select
                      value={selectedMonitorCampaignId}
                      onChange={(event) => setSelectedMonitorCampaignId(event.target.value)}
                    >
                      {campaigns.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="secondary" type="button" onClick={() => setMonitorRefreshTick((value) => value + 1)}>
                    Refresh monitor now
                  </button>
                </div>
                {monitorError ? (
                  <p className="error">
                    {monitorError}. Data may still be collecting; refresh after the campaign is queued or review the
                    monitor guide.
                  </p>
                ) : null}
                {broadcastMonitor ? (
                  <div className="monitor-operations">
                    <div className="monitor-progress">
                      <div>
                        <strong>{broadcastMonitor.campaign_name}</strong>
                        <span>Status: {broadcastMonitor.status}</span>
                      </div>
                      <strong className="monitor-percent">{formatNumber(broadcastMonitor.percent_complete)}%</strong>
                      <div className="progress-track" aria-label="Broadcast percent complete">
                        <span style={{ width: `${Math.min(100, Math.max(0, broadcastMonitor.percent_complete))}%` }} />
                      </div>
                      <p className="muted">
                        Percent complete is based on loaded message rows for the current {broadcastMonitor.mode} run.
                      </p>
                    </div>
                    <dl className="monitor-status-strip" aria-label="Delivery status metrics">
                      <div>
                        <dt>Queued</dt>
                        <dd>{formatNumber(broadcastMonitor.queued)}</dd>
                        <small>Waiting to send</small>
                      </div>
                      <div>
                        <dt>Sent</dt>
                        <dd>{formatNumber(broadcastMonitor.sent)}</dd>
                        <small>Provider accepted</small>
                      </div>
                      <div>
                        <dt>Failed</dt>
                        <dd>{formatNumber(broadcastMonitor.failed)}</dd>
                        <small>Needs review</small>
                      </div>
                      <div>
                        <dt>Retried</dt>
                        <dd>{formatNumber(broadcastMonitor.retried)}</dd>
                        <small>Retried rows</small>
                      </div>
                      <div>
                        <dt>Dead-lettered</dt>
                        <dd>{formatNumber(broadcastMonitor.dead_lettered)}</dd>
                        <small>Terminal rows</small>
                      </div>
                    </dl>
                    <div className="monitor-grid">
                      <Metric
                        label="Modeled audience"
                        value={formatNumber(broadcastMonitor.modeled_audience)}
                        trend={`${formatNumber(broadcastMonitor.sample_message_count)} local sample messages`}
                      />
                      <Metric
                        label="Throughput"
                        value={`${formatNumber(broadcastMonitor.messages_per_minute)}/min`}
                        trend={`${formatNumber(broadcastMonitor.throughput_per_second)} messages/sec`}
                      />
                      <Metric
                        label="ETA"
                        value={
                          broadcastMonitor.eta_seconds !== null && broadcastMonitor.eta_seconds !== undefined
                            ? `${formatNumber(Math.ceil(broadcastMonitor.eta_seconds / 60))} min`
                            : 'Waiting'
                        }
                        trend="Estimated from current throughput"
                      />
                      <Metric label="Percent complete" value={`${formatNumber(broadcastMonitor.percent_complete)}%`} trend="Loaded rows" />
                    </div>
                    <div className="monitor-meta">
                      <span>Started: {formatLocalDateTime(broadcastMonitor.started_at)}</span>
                      <span>Last updated: {formatLocalDateTime(broadcastMonitor.last_updated)}</span>
                      <span>
                        ETA:{' '}
                        {broadcastMonitor.eta_seconds !== null && broadcastMonitor.eta_seconds !== undefined
                          ? `${formatNumber(Math.ceil(broadcastMonitor.eta_seconds / 60))} min`
                          : 'Waiting for throughput'}
                      </span>
                      <span>Projected complete: {formatLocalDateTime(broadcastMonitor.projected_completion_at)}</span>
                    </div>
                    <section className="monitor-semantics" aria-label="Monitor status semantics">
                      <strong>Operational labels</strong>
                      <p>
                        Queued rows are waiting to send, sent rows have provider outcomes, failed rows need review,
                        retried rows already had another attempt, and dead-lettered rows are terminal until an operator
                        investigates.
                      </p>
                    </section>
                  </div>
                ) : (
                  <p className="muted">
                    {monitorLoading
                      ? 'Loading monitor...'
                      : 'Choose a campaign to load monitor data. The monitor guide explains queued, sent, failed, retried, and dead-lettered rows.'}
                  </p>
                )}
              </>
            ) : (
              <EmptyState
                title="No campaigns to monitor"
                description="Create or seed a campaign before viewing broadcast throughput. Then validate ETA, retries, and dead-letter rows here."
              />
            )}
          </section>
        ) : null}

        {campaignSubpage === 'followups' ? (
          <>
            <form className="form-grid follow-up-panel" onSubmit={createReminder}>
              <div className="section-heading wide">
                <span>Follow-up</span>
                <strong>Reminder automation</strong>
              </div>
              <label>
                Follow-up source campaign
                <select
                  value={reminderSourceCampaignId ?? ''}
                  onChange={(event) => setReminderSourceCampaignId(event.target.value)}
                >
                  <option value="">Choose a campaign</option>
                  {pastCampaigns.concat(upcomingCampaigns).map((item) => (
                    <option value={item.id ?? ''} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Follow-up audience rule
                <select value={reminderAudienceRule ?? ''} onChange={(event) => setReminderAudienceRule(event.target.value)}>
                  <option value="not_clicked">Not clicked</option>
                  <option value="clicked_not_redeemed">Clicked not redeemed</option>
                </select>
              </label>
              <label className="wide">
                Follow-up copy
                <textarea value={reminderMessageBody ?? ''} onChange={(event) => setReminderMessageBody(event.target.value)} />
              </label>
              <button disabled={!canCreateCampaign || !reminderSourceCampaignId}>Create follow-up reminder</button>
              {!reminderSourceCampaignId ? <p className="helper-text wide">Choose a source campaign before creating a follow-up.</p> : null}
              {!canCreateCampaign ? <p className="helper-text wide">{restrictionCopy}</p> : null}
            </form>
            {reminderCampaign ? (
              <div className="result-strip">
                <strong>{reminderCampaign.id}</strong>
                <span>{reminderCampaign.audience_rule}</span>
                <span>Estimated recipients: {reminderCampaign.estimated_recipient_count}</span>
              </div>
            ) : null}
            <section className="panel table-panel">
              <div className="section-heading">
                <span>Automations</span>
                <strong>Existing follow-ups</strong>
              </div>
              <DataTable
                ariaLabel="Follow-up reminders"
                rows={reminderCampaigns}
                getRowKey={(row) => row.id ?? `${row.source_campaign_id}-${row.audience_rule}`}
                empty={
                  <EmptyState
                    title="No follow-ups yet"
                    description="Create a reminder automation from a recent campaign engagement rule."
                  />
                }
                columns={[
                  { key: 'source', header: 'Source campaign', render: (row) => row.source_campaign_id ?? 'Unknown' },
                  { key: 'rule', header: 'Audience rule', render: (row) => row.audience_rule ?? 'Unknown' },
                  { key: 'copy', header: 'Copy', render: (row) => row.message_body ?? 'No copy' },
                  { key: 'status', header: 'Status', render: (row) => row.status ?? 'draft' },
                  {
                    key: 'estimate',
                    header: 'Estimated recipients',
                    render: (row) => formatNumber(row.estimated_recipient_count),
                  },
                ]}
              />
            </section>
          </>
        ) : null}
      </>
    )
  }

  if (page === 'subscribers') {
    return (
      <>
        <PageHeader
          title="Subscribers"
          description={`Manage audience lists, regional segments, consent status, and CSV imports. Scope: ${roleMeta.marketScope}.`}
        />
        {isReadOnly ? (
          <section className="permission-callout" aria-label="Read-only subscriber restriction">
            <strong>Audience changes are disabled for {roleMeta.label}</strong>
            <p>{restrictionCopy}</p>
          </section>
        ) : (
          <section className="scope-note" aria-label="Market segment ownership">
            <strong>{roleMeta.marketScope}</strong>
            <p>
              Regional ownership is represented by list and segment selection in Phase 1. Backend segment ACLs
              should attach these lists to memberships in a later slice.
            </p>
          </section>
        )}
        <div className="metric-grid spaced">
          <button
            className={`segment-card ${selectedSubscriberListId === 'all' ? 'active' : ''}`}
            onClick={() => setSubscriberListFilter('all')}
          >
            <span>All modeled audience</span>
            <strong>{formatNumber(modeledAudienceTotal)}</strong>
            <small>{formatNumber(sampleAudienceTotal)} loaded sample rows</small>
          </button>
          {subscriberLists.map((list) => (
            <button
              className={`segment-card ${selectedSubscriberListId === list.id ? 'active' : ''}`}
              key={list.id}
              onClick={() => setSubscriberListFilter(list.id)}
            >
              <span>{list.name}</span>
              <strong>{formatNumber(list.subscriber_count)}</strong>
              <small>{formatNumber(list.sample_subscriber_count ?? 0)} loaded sample rows</small>
            </button>
          ))}
        </div>

        <section className="panel subscriber-filters" aria-label="Subscriber filters">
          <div className="section-heading">
            <span>Search</span>
            <strong>
              Loaded {formatNumber(subscribers.length)} of {formatNumber(subscriberTotal)} matching sample rows
            </strong>
          </div>
          <div className="form-grid">
            <label>
              Search subscribers
              <input
                value={subscriberSearch}
                onChange={(event) => {
                  setSubscriberSearch(event.target.value)
                  setSubscriberOffset(0)
                }}
                placeholder="Phone number or source"
              />
            </label>
            <label>
              Consent status
              <select value={subscriberConsentFilter} onChange={(event) => setSubscriberConsent(event.target.value)}>
                <option value="all">All marketable consent</option>
                <option value="company_provided">Company provided</option>
                <option value="double_opt_in_confirmed">Double opt-in confirmed</option>
              </select>
            </label>
            <label>
              Page size
              <select
                value={subscriberLimit}
                onChange={(event) => {
                  setSubscriberLimit(Number(event.target.value))
                  setSubscriberOffset(0)
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
          <div className="pagination-actions">
            <span>
              Page {formatNumber(subscriberPage)} of {formatNumber(subscriberPageCount)} / modeled audience{' '}
              {formatNumber(selectedDirectoryModeledAudience)}
            </span>
            <div>
              <button
                className="secondary"
                type="button"
                disabled={subscriberOffset === 0}
                onClick={() => setSubscriberOffset(Math.max(0, subscriberOffset - subscriberLimit))}
              >
                Previous
              </button>
              <button
                className="secondary"
                type="button"
                disabled={subscriberOffset + subscriberLimit >= subscriberTotal}
                onClick={() => setSubscriberOffset(subscriberOffset + subscriberLimit)}
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <section className="panel table-panel">
          <div className="section-heading">
            <span>Directory</span>
            <strong>{selectedSubscriberList?.name ?? 'All subscribers'} sample</strong>
          </div>
          <DataTable
            ariaLabel="Subscriber directory"
            rows={subscribers}
            getRowKey={(row) => row.id}
            empty={
              <EmptyState
                title="No subscribers in this segment"
                description="Import a CSV or choose another list to review subscriber consent."
              />
            }
            columns={[
              { key: 'phone', header: 'Phone number', render: (row) => row.phone_number },
              {
                key: 'source',
                header: 'Source / region / list',
                render: (row) =>
                  [row.source, row.region, row.list_id ? subscriberListNameById.get(row.list_id) : null]
                    .filter(Boolean)
                    .join(' / ') || 'Unknown',
              },
              { key: 'status', header: 'Consent / status', render: (row) => `${row.consent_status ?? 'unknown'} / ${row.marketing_status ?? 'unknown'}` },
              { key: 'created', header: 'Created/imported', render: (row) => formatLocalDateTime(row.created_at) },
            ]}
          />
        </section>

        <div className="split-layout two-column">
          <form className="panel" onSubmit={createSubscriberList}>
            <div className="section-heading">
              <span>Lists</span>
              <strong>Create</strong>
            </div>
            <label>
              Subscriber list name
              <input value={listName ?? ''} onChange={(event) => setListName(event.target.value)} />
            </label>
            <button disabled={isReadOnly}>Create list</button>
            {subscriberList ? <p className="muted">List id: {subscriberList.id}</p> : null}
          </form>
          <form className="panel" onSubmit={importCsvSubscribers}>
            <div className="section-heading">
              <span>Import</span>
              <strong>CSV subscribers</strong>
            </div>
            <p className="helper-text">Required: phone_number. Optional: list_name, region, source.</p>
            <label>
              Upload CSV file
              <input type="file" accept=".csv,text/csv" onChange={(event) => stageSubscriberCsv(event.target.files?.[0])} />
            </label>
            <label className="wide">
              Paste CSV subscribers
              <textarea value={csvImportText ?? ''} onChange={(event) => setCsvImportText(event.target.value)} />
            </label>
            <button disabled={isReadOnly}>Import CSV</button>
            {csvImportResult ? <p className="muted">{csvImportResult}</p> : null}
          </form>
        </div>

        <div className="split-layout two-column">
          <form className="panel" onSubmit={importSubscriber}>
            <div className="section-heading">
              <span>Single add</span>
              <strong>Company provided</strong>
            </div>
            <label>
              Subscriber phone number
              <input value={subscriberPhone ?? ''} onChange={(event) => setSubscriberPhone(event.target.value)} />
            </label>
            <label>
              Subscriber source
              <input value={subscriberSource ?? ''} onChange={(event) => setSubscriberSource(event.target.value)} />
            </label>
            <button disabled={isReadOnly}>Import subscriber</button>
            {subscriber ? <p className="muted">{subscriber.consent_status}</p> : null}
          </form>
          <div className="panel">
            <form onSubmit={startOptIn}>
              <div className="section-heading">
                <span>Opt-in</span>
                <strong>Public flow</strong>
              </div>
              <label>
                Opt-in phone number
                <input value={optInPhone ?? ''} onChange={(event) => setOptInPhone(event.target.value)} />
              </label>
              <label>
                Opt-in source
                <input value={optInSource ?? ''} onChange={(event) => setOptInSource(event.target.value)} />
              </label>
              <button disabled={isReadOnly}>Start opt-in</button>
            </form>
            {optIn ? <p className="muted">Token: {optIn.confirmation_token}</p> : null}
            <form className="stacked-form" onSubmit={confirmOptIn}>
              <label>
                Confirmation token
                <input value={confirmToken ?? ''} onChange={(event) => setConfirmToken(event.target.value)} />
              </label>
              <button disabled={isReadOnly}>Confirm opt-in</button>
            </form>
            {confirmResult ? <p className="muted">{confirmResult.status}</p> : null}
          </div>
        </div>
      </>
    )
  }

  if (page === 'content') {
    return (
      <>
        <PageHeader
          title="Content Library"
          description={`Store media, offer destinations, and tracked assets for Smart SMS campaigns. ${roleMeta.permissionSummary}`}
        />
        {isReadOnly ? (
          <section className="permission-callout" aria-label="Read-only content restriction">
            <strong>Content changes are disabled for {roleMeta.label}</strong>
            <p>{restrictionCopy}</p>
          </section>
        ) : null}
        <section className="panel">
          <div className="section-heading">
            <span>Templates</span>
            <strong>Marketing content starters</strong>
          </div>
          <div className="template-grid">
            {contentTemplates.map((template) => (
              <article aria-label={template.title} className="template-card" key={template.title}>
                <div className="template-preview">
                  <span>{template.tag}</span>
                  <strong>{template.preview}</strong>
                </div>
                <div>
                  <strong>{template.title}</strong>
                  <p>{template.copy}</p>
                </div>
                <div className="template-actions">
                  <button type="button" disabled={!canCreateCampaign} onClick={() => applyTemplate(template)}>
                    Use template
                  </button>
                  <button className="secondary" type="button" onClick={() => copyTemplateCopy(template)}>
                    Copy copy
                  </button>
                  <button className="secondary" type="button" disabled={!canCreateCampaign} onClick={() => applyTemplate(template)}>
                    Create campaign
                  </button>
                </div>
              </article>
            ))}
          </div>
          {contentFeedback ? <p className="notice">{contentFeedback}</p> : null}
        </section>
        <div className="split-layout two-column">
          <form className="panel" onSubmit={addMediaAsset}>
            <div className="section-heading">
              <span>Media</span>
              <strong>Add content</strong>
            </div>
            <label>
              Upload media file
              <input
                type="file"
                accept="image/*,video/*,application/pdf"
                onChange={(event) => stageUploadedMedia(event.target.files?.[0])}
              />
            </label>
            <label>
              Media filename
              <input value={mediaFilename ?? ''} onChange={(event) => setMediaFilename(event.target.value)} />
            </label>
            <label>
              Media content type
              <input value={mediaContentType ?? ''} onChange={(event) => setMediaContentType(event.target.value)} />
            </label>
            <label>
              Media url
              <input value={mediaUrl ?? ''} onChange={(event) => setMediaUrl(event.target.value)} />
            </label>
            <button disabled={isReadOnly}>Add URL media</button>
            <button className="secondary inline-action" type="button" onClick={() => void refreshMediaAssets()}>
              Refresh media assets
            </button>
            {contentFeedback ? <p className="muted">{contentFeedback}</p> : null}
          </form>
          <section className="panel">
            <div className="section-heading">
              <span>Library</span>
              <strong>Existing media</strong>
            </div>
            {mediaAssets.length ? (
              <ul className="asset-grid embedded-list" aria-label="Media asset library">
                {mediaAssets.map((asset) => (
                  <li key={asset.id}>
                    <MediaAssetPreview asset={asset} />
                    <strong>{asset.filename}</strong>
                    <span>{asset.content_type}</span>
                    <span>{asset.url}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No media has been added yet"
                description="Upload or register a hosted image, video, or PDF before building Smart SMS campaigns."
              />
            )}
          </section>
        </div>
        <details className="advanced-tools">
          <summary>Advanced / Developer tools</summary>
          <form className="form-grid follow-up-panel" onSubmit={createTrackedLink}>
            <div className="section-heading wide">
              <span>Links</span>
              <strong>Manual tracking link</strong>
            </div>
              <label>
                Tracked campaign id
                <input value={trackedCampaignId ?? ''} onChange={(event) => setTrackedCampaignId(event.target.value)} />
              </label>
              <label>
                Tracked subscriber id
                <input value={trackedSubscriberId ?? ''} onChange={(event) => setTrackedSubscriberId(event.target.value)} />
              </label>
              <label>
                Tracked media asset id
                <input value={trackedMediaAssetId ?? ''} onChange={(event) => setTrackedMediaAssetId(event.target.value)} />
              </label>
              <label>
                Destination url
                <input value={destinationUrl ?? ''} onChange={(event) => setDestinationUrl(event.target.value)} />
              </label>
              <button disabled={isReadOnly}>Create tracked link</button>
              <button className="secondary inline-action" type="button" onClick={() => void refreshCampaignLinks()}>
                Refresh tracked links
              </button>
          </form>
          {campaignLinks.length || campaignLink ? (
            <ul className="compact-list">
              {campaignLink ? (
                <li>
                  <strong>{campaignLink.token}</strong>
                  <span>{campaignLink.public_url}</span>
                </li>
              ) : null}
              {campaignLinks.map((link) => (
                <li key={link.id}>
                  <strong>{link.token}</strong>
                  <span>Clicks: {link.click_count}</span>
                  <span>Redemptions: {link.redeemed_count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No manual tracking links loaded. Campaign-created Smart SMS links appear after scheduling.</p>
          )}
        </details>
      </>
    )
  }

  if (page === 'analytics') {
    const scheduledReach = upcomingCampaigns.reduce((total, item) => total + (item.audience_count ?? item.message_count), 0)
    const totalListSubscribers = subscriberLists.reduce((total, list) => total + (list.subscriber_count ?? 0), 0)

    return (
      <>
        <PageHeader
          title="Analytics"
          description={`Review campaign performance, tracked links, redemptions, and quota consumption. ${roleMeta.label} can view this reporting surface.`}
          action={<button onClick={() => void refreshPerformance()}>Refresh performance</button>}
        />
        <section className="scope-note" aria-label="Analytics permission scope">
          <strong>{roleMeta.canViewAnalytics ? 'Analytics access enabled' : 'Analytics access limited'}</strong>
          <p>{roleMeta.permissionSummary}</p>
        </section>
        <div className="metric-grid spaced">
          <Metric label="Scheduled reach" value={formatNumber(scheduledReach)} trend="Modeled recipients in upcoming campaigns" />
          <Metric label="Campaign count" value={formatNumber(campaigns.length || dashboardSummary?.campaign_count)} trend="Loaded campaign history" />
          <Metric label="Message volume" value={formatActivity(dashboardSummary?.message_count)} trend="Campaign delivery volume" />
          <Metric label="Subscriber lists" value={formatNumber(subscriberLists.length)} trend={`${formatNumber(totalListSubscribers)} list memberships`} />
          <Metric label="Clicks" value={formatActivity(performance?.click_count ?? dashboardSummary?.click_count)} trend="Tracked link engagement" />
          <Metric
            label="Redemptions"
            value={formatActivity(performance?.redemption_count ?? dashboardSummary?.redemption_count)}
            trend="Offer conversion"
          />
          <Metric label="Quota usage" value={formatActivity(dashboardSummary?.credits_used)} trend="Credits consumed" />
        </div>
        <section className="panel table-panel">
          <div className="section-heading">
            <span>Campaigns</span>
            <strong>Analytics summary</strong>
          </div>
          <DataTable
            ariaLabel="Campaign analytics summary"
            rows={campaigns}
            getRowKey={(row) => row.id}
            empty={
              <EmptyState
                title="No campaigns available"
                description="Campaign counts and scheduled reach will appear once campaigns exist for this company."
              />
            }
            columns={[
              { key: 'name', header: 'Campaign', render: (row) => row.name },
              { key: 'status', header: 'Status', render: (row) => row.status },
              { key: 'scheduled', header: 'Scheduled', render: (row) => formatLocalDateTime(row.scheduled_at) },
              { key: 'messages', header: 'Messages', render: (row) => formatNumber(row.message_count) },
              { key: 'credits', header: 'Credits', render: (row) => formatNumber(row.credit_cost) },
              { key: 'followups', header: 'Follow-ups', render: (row) => formatNumber(row.reminder_count) },
            ]}
          />
        </section>
        <div className="analytics-grid">
          {['Messages', 'Clicks', 'Redemptions', 'Quota usage'].map((label, index) => (
            <section className="panel chart-card" aria-label={`${label} chart`} key={label}>
              <div className="section-heading">
                <span>Chart</span>
                <strong>{label}</strong>
              </div>
              <div className="mini-chart" aria-hidden="true">
                {[32, 48, 38, 62, 54, 76, 58].map((height, barIndex) => (
                  <span key={barIndex} style={{ height: `${Math.max(18, height - index * 8)}%` }} />
                ))}
              </div>
              <p className="muted">{performance ? 'Performance data refreshed from tenant reporting.' : 'No data yet. Refresh after campaigns have activity.'}</p>
            </section>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Settings" description="Manage tenant identity, team access, roles, invites, and regional credit budgets." />
      <section className="product-help-callout" aria-label="Settings help">
        <div>
          <strong>Need to invite or restrict a teammate?</strong>
          <p>
            The customer knowledge base explains access codes, roles, permissions, and user credit allocations for
            company owners.
          </p>
        </div>
        <div>
          <a href="/kb">Open team access guide</a>
          <a href="/features/role-based-access">View access feature</a>
        </div>
      </section>
      <section className="settings-summary" aria-label="Tenant access summary">
        <div>
          <span>Company</span>
          <strong>{session.companyName}</strong>
          <p>{companyId}</p>
        </div>
        <div>
          <span>Your role</span>
          <strong>{roleMeta.label}</strong>
          <p>{roleMeta.permissionSummary}</p>
        </div>
        <div>
          <span>Company credits</span>
          <strong>{formatNumber(dashboardSummary?.credit_balance)}</strong>
          <p>{hasUserBudget ? `${formatNumber(userBudgetRemaining)} remaining in your allocation.` : 'No separate user allocation.'}</p>
        </div>
        <div>
          <span>Compliance readiness</span>
          <strong>TCPA-aware controls</strong>
          <p>Review consent evidence, STOP suppression, sender identity, and send windows before production enforcement.</p>
        </div>
      </section>

      {canInvite ? (
        <div className="split-layout two-column settings-grid">
          <form className="panel" onSubmit={createTeamAccessCode}>
            <div className="section-heading">
              <span>Invite</span>
              <strong>Access code</strong>
            </div>
            <p className="helper-text">
              Generate a code for a teammate. When they join, the selected role and credit limit become their
              membership allocation.
            </p>
            <label>
              Invite role
              <select value={inviteRole ?? ''} onChange={(event) => setInviteRole(event.target.value)}>
                {availableRoles.map((role) => (
                  <option value={role.value} key={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              User credit limit
              <input value={inviteCreditLimit ?? ''} onChange={(event) => setInviteCreditLimit(event.target.value)} />
            </label>
            <button>Create user access code</button>
            {accessCodeResult ? (
              <p className="notice">
                Generated access code {accessCodeResult.code} grants {getRoleMeta(accessCodeResult.role).label} with{' '}
                {formatNumber(accessCodeResult.credit_limit)} credits.
              </p>
            ) : null}
          </form>

          <form className="panel" onSubmit={updateTeamUser}>
            <div className="section-heading">
              <span>Permissions</span>
              <strong>Adjust user</strong>
            </div>
            <p className="helper-text">
              Update an existing member role or budget. Use this for regional owners, campaign managers, and
              reporting-only stakeholders.
            </p>
            <label>
              User email
              <input value={editUserEmail ?? ''} onChange={(event) => setEditUserEmail(event.target.value)} />
            </label>
            <label>
              User role
              <select value={editUserRole ?? ''} onChange={(event) => setEditUserRole(event.target.value)}>
                {availableRoles.map((role) => (
                  <option value={role.value} key={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              User credit limit
              <input value={editCreditLimit ?? ''} onChange={(event) => setEditCreditLimit(event.target.value)} />
            </label>
            <button>Update user permissions</button>
            <button className="secondary inline-action" type="button" onClick={() => void refreshTeamUsers()}>
              Refresh team
            </button>
          </form>
        </div>
      ) : (
        <section className="permission-callout" aria-label="Read-only team permissions">
          <strong>Team and budget controls are restricted</strong>
          <p>
            {roleMeta.label} members cannot invite users, issue access codes, or change credit allocations.
            Ask a company owner or admin to update access.
          </p>
        </section>
      )}

      <section className="panel table-panel">
        <div className="section-heading">
          <span>Team</span>
          <strong>Roles, access, and budgets</strong>
        </div>
        <DataTable
          ariaLabel="Team roles and budgets"
          rows={teamUsers}
          getRowKey={(user) => user.user_id}
          empty={
            <EmptyState
              title="Team members have not been loaded"
              description="Refresh team to load users, roles, and credit allocations from the company membership API."
            />
          }
          columns={[
            {
              key: 'member',
              header: 'Member',
              render: (user) => (
                <div className="table-primary-cell">
                  <strong>{user.display_name ?? user.email}</strong>
                  <span>{user.email}</span>
                </div>
              ),
            },
            { key: 'role', header: 'Role', render: (user) => getRoleMeta(user.role).label },
            { key: 'used', header: 'Used', render: (user) => formatNumber(user.credits_used) },
            { key: 'limit', header: 'Credit limit', render: (user) => formatNumber(user.credit_limit) },
            {
              key: 'remaining',
              header: 'Remaining',
              render: (user) =>
                user.credit_limit !== null && user.credit_limit !== undefined
                  ? formatNumber(Math.max(0, user.credit_limit - user.credits_used))
                  : 'Pooled',
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (user) =>
                canManageBudget ? (
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => {
                      setEditUserEmail(user.email)
                      setEditUserRole(user.role)
                      setEditCreditLimit(user.credit_limit !== null && user.credit_limit !== undefined ? String(user.credit_limit) : '')
                    }}
                  >
                    Edit
                  </button>
                ) : (
                  <span className="muted">Read-only</span>
                ),
            },
          ]}
        />
      </section>
    </>
  )
}

function CampaignColumn({
  title,
  campaigns,
  emptyText = 'No campaigns yet.',
  onEdit,
}: {
  title: string
  campaigns: CampaignListItem[]
  emptyText?: string
  onEdit?: (campaign: CampaignListItem) => void
}) {
  return (
    <section className="campaign-column">
      <h2>{title}</h2>
      {campaigns.length ? (
        <ul className="compact-list">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <strong>{campaign.name}</strong>
              <small className="subtle-id">Campaign ID: {campaign.id}</small>
              {campaign.body ? <span>Copy: {campaign.body}</span> : null}
              <span>{campaign.status}</span>
              <span>Scheduled: {formatLocalDateTime(campaign.scheduled_at)}</span>
              <span>Created: {formatLocalDateTime(campaign.created_at)}</span>
              <span>Modeled audience: {formatNumber(campaign.audience_count ?? campaign.message_count)}</span>
              <span>Sample messages: {formatNumber(campaign.message_count)}</span>
              <span>Credits: {formatNumber(campaign.credit_cost)}</span>
              <span>Follow-ups: {formatNumber(campaign.reminder_count)}</span>
              {onEdit ? (
                <button className="secondary inline-action" type="button" onClick={() => onEdit(campaign)}>
                  Modify campaign
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{emptyText}</p>
      )}
    </section>
  )
}

function MediaAssetPreview({ asset }: { asset: MediaAsset }) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'failed'>('loading')
  const filename = asset.filename ?? 'Untitled media'
  const url = asset.url ?? ''
  const isImage = Boolean(asset.content_type?.startsWith('image/') && url)
  const usesGeneratedPreview = !isImage || isSeededExternalMedia(url) || imageState === 'failed'
  const showPlaceholder = usesGeneratedPreview || imageState !== 'loaded'

  useEffect(() => {
    setImageState('loading')
  }, [url])

  return (
    <div
      className={usesGeneratedPreview ? 'asset-thumb asset-thumb-generated' : 'asset-thumb'}
      aria-label={`${filename} media preview`}
    >
      {isImage && !isSeededExternalMedia(url) ? (
        <img
          className={imageState === 'loaded' ? 'is-loaded' : ''}
          src={url}
          alt={`${filename} preview`}
          loading="lazy"
          onLoad={() => setImageState('loaded')}
          onError={() => setImageState('failed')}
        />
      ) : null}
      {showPlaceholder ? <GeneratedMediaPlaceholder asset={asset} /> : null}
    </div>
  )
}

function GeneratedMediaPlaceholder({ asset }: { asset: MediaAsset }) {
  return (
    <div className="asset-generated-preview">
      <span>CampaignOS preview</span>
      <strong>{mediaPreviewLabel(asset)}</strong>
      <small>{asset.filename ?? asset.content_type ?? 'Stored asset'}</small>
    </div>
  )
}

function isSeededExternalMedia(url: string) {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname === 'cdn.example'
  } catch {
    return url.startsWith('local-upload://')
  }
}

function mediaPreviewLabel(asset: MediaAsset) {
  const searchable = `${asset.filename ?? ''} ${asset.url ?? ''}`.toLowerCase()
  if (searchable.includes('vip') || searchable.includes('loyalty') || searchable.includes('points')) return 'VIP loyalty'
  if (searchable.includes('flash') || searchable.includes('48')) return 'Flash MMS'
  if (searchable.includes('winback') || searchable.includes('back')) return 'Winback offer'
  if (searchable.includes('coupon') || searchable.includes('offer') || searchable.includes('pass') || searchable.includes('memorial')) {
    return 'Retail offer'
  }
  if (asset.content_type?.startsWith('video/')) return 'Video asset'
  if (asset.content_type?.includes('pdf')) return 'Document asset'
  return asset.content_type?.startsWith('image/') ? 'Image asset' : 'File asset'
}

function filterCampaigns(
  campaigns: CampaignListItem[],
  filters: {
    search: string
    status: string
    from: string
    to: string
  },
) {
  const search = filters.search.trim().toLowerCase()
  const fromTime = parseFilterDateTime(filters.from)
  const toTime = parseFilterDateTime(filters.to)

  return campaigns.filter((campaign) => {
    const searchable = `${campaign.name ?? ''} ${campaign.body ?? ''}`.toLowerCase()
    if (search && !searchable.includes(search)) return false
    if (filters.status !== 'all' && campaign.status !== filters.status) return false

    const campaignTime = parseCampaignDateTime(campaign)
    if (fromTime !== null && (campaignTime === null || campaignTime < fromTime)) return false
    if (toTime !== null && (campaignTime === null || campaignTime > toTime)) return false

    return true
  })
}

function parseCampaignDateTime(campaign: CampaignListItem): number | null {
  return parseFilterDateTime(campaign.scheduled_at ?? campaign.created_at ?? '')
}

function parseFilterDateTime(value: string): number | null {
  if (!value) return null
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

function subscriberSearchUrl({
  companyId,
  q,
  listId,
  consentStatus,
  limit,
  offset,
}: {
  companyId: string
  q: string
  listId: string
  consentStatus: string
  limit: number
  offset: number
}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  if (q.trim()) params.set('q', q.trim())
  if (listId !== 'all') params.set('list_id', listId)
  if (consentStatus !== 'all') params.set('consent_status', consentStatus)
  return `${API_BASE_URL}/companies/${companyId}/subscribers/search?${params.toString()}`
}
