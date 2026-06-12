import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import { API_BASE_URL, apiErrorMessage, isStaticPortfolioHost, readApiJson } from '../../api/client'
import { DataTable } from '../../components/DataTable'
import { EmptyState } from '../../components/EmptyState'
import { MetricCard as Metric } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { QuotaBar } from '../../components/QuotaBar'
import { getRoleMeta, roleOptions } from '../../roles'
import {
  staticDemoBroadcastMonitor,
  staticDemoCampaignLinks,
  staticDemoCampaigns,
  staticDemoDashboardSummary,
  staticDemoMediaAssets,
  staticDemoPerformance,
  staticDemoReminders,
  staticDemoSubscriberLists,
  staticDemoSubscribers,
  staticDemoTeamUsers,
} from '../../staticDemoData'
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

const SUBSCRIBER_SEGMENT_PLACEHOLDER_COUNT = 7
const MEDIA_ASSET_PLACEHOLDER_COUNT = 6

const campaignSubpagePaths: Record<CampaignSubpage, string> = {
  overview: '/app/campaigns',
  scheduled: '/app/campaigns/scheduled',
  past: '/app/campaigns/sent',
  create: '/app/campaigns/new',
  followups: '/app/campaigns/follow-ups',
  monitor: '/app/monitor',
}

type CampaignScheduleErrorDetail = {
  message?: string
  requested_reach?: number
  scheduled_reach?: number
  monthly_send_limit?: number
  available_reach?: number
  required_credits?: number
  available_credits?: number
}

async function formatCampaignScheduleError(response: Response) {
  const fallback = `Schedule campaign failed: ${response.status}`
  let payload: { detail?: string | CampaignScheduleErrorDetail } | null = null
  try {
    payload = await readApiJson<{ detail?: string | CampaignScheduleErrorDetail }>(response)
  } catch {
    return fallback
  }
  const detail = payload?.detail
  if (!detail) return fallback
  if (typeof detail === 'string') return detail

  if (detail.message === 'monthly send quota exceeded') {
    const requestedReach = formatNumber(detail.requested_reach)
    const availableReach = formatNumber(detail.available_reach)
    const scheduledReach = formatNumber(detail.scheduled_reach)
    const monthlyLimit = formatNumber(detail.monthly_send_limit)
    return `Monthly send quota exceeded: ${requestedReach} requested reach, ${availableReach} available in this quota period. Current scheduled reach is ${scheduledReach} of ${monthlyLimit}.`
  }

  if (detail.message === 'company credits exhausted' || detail.message === 'user budget exhausted') {
    return `${detail.message}: ${formatNumber(detail.required_credits)} credits required, ${formatNumber(
      detail.available_credits,
    )} available.`
  }

  return detail.message ?? fallback
}

function staticSubscriberSearch({
  q,
  listId,
  consentStatus,
  limit,
  offset,
}: {
  q: string
  listId: string
  consentStatus: string
  limit: number
  offset: number
}): SubscriberSearchResult {
  const query = q.trim().toLowerCase()
  const rows = staticDemoSubscribers.filter((subscriber) => {
    if (listId !== 'all' && subscriber.list_id !== listId) return false
    if (consentStatus !== 'all' && subscriber.consent_status !== consentStatus) return false
    if (
      query &&
      !`${subscriber.phone_number} ${subscriber.source ?? ''} ${subscriber.region ?? ''}`.toLowerCase().includes(query)
    ) {
      return false
    }
    return true
  })

  return {
    rows: rows.slice(offset, offset + limit),
    total: rows.length,
    limit,
    offset,
  }
}

export function CompanyWorkspace({
  page,
  session,
  initialCampaignSubpage,
  onNavigate,
}: {
  page: CompanyPage
  session: Extract<Session, { role: 'company_user' }>
  initialCampaignSubpage?: CampaignSubpage
  onNavigate: (page: CompanyPage, options?: { campaignSubpage?: CampaignSubpage; path?: string }) => void
}) {
  const companyId = session.companyId
  const staticPortfolioHost = isStaticPortfolioHost()
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(() =>
    staticPortfolioHost ? staticDemoDashboardSummary : null,
  )
  const [campaignName, setCampaignName] = useState('Memorial Day VIP Weekend')
  const [messageBody, setMessageBody] = useState('Memorial Day starts now: take 30% off summer favorites through Monday. Use code MEMORIAL30 in-store or online.')
  const [messageType, setMessageType] = useState<'regular' | 'smart'>('regular')
  const [campaignSubpage, setCampaignSubpage] = useState<CampaignSubpage>(initialCampaignSubpage ?? 'overview')
  const [scheduledAt, setScheduledAt] = useState('2026-05-25T16:00')
  const [smartMediaAssetId, setSmartMediaAssetId] = useState('')
  const [subscriberLists, setSubscriberLists] = useState<SubscriberListResult[]>(() =>
    staticPortfolioHost ? staticDemoSubscriberLists : [],
  )
  const [subscriberListsLoaded, setSubscriberListsLoaded] = useState(staticPortfolioHost)
  const [subscribers, setSubscribers] = useState<SubscriberResult[]>(() => (staticPortfolioHost ? staticDemoSubscribers : []))
  const [subscriberTotal, setSubscriberTotal] = useState(staticPortfolioHost ? staticDemoSubscribers.length : 0)
  const [subscriberLimit, setSubscriberLimit] = useState(25)
  const [subscriberOffset, setSubscriberOffset] = useState(0)
  const [subscriberSearch, setSubscriberSearch] = useState('')
  const [subscriberConsentFilter, setSubscriberConsentFilter] = useState('all')
  const [directSubscriberSearch, setDirectSubscriberSearch] = useState('')
  const [directSubscriberRows, setDirectSubscriberRows] = useState<SubscriberResult[]>([])
  const [directSubscriberTotal, setDirectSubscriberTotal] = useState(0)
  const [selectedListIds, setSelectedListIds] = useState<string[]>(() =>
    staticPortfolioHost && staticDemoSubscriberLists[0] ? [staticDemoSubscriberLists[0].id] : [],
  )
  const [selectedSubscriberIds, setSelectedSubscriberIds] = useState<string[]>([])
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>(() => (staticPortfolioHost ? staticDemoCampaigns : []))
  const [campaignSearch, setCampaignSearch] = useState('')
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('all')
  const [campaignDateFrom, setCampaignDateFrom] = useState('')
  const [campaignDateTo, setCampaignDateTo] = useState('')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [selectedMonitorCampaignId, setSelectedMonitorCampaignId] = useState(staticPortfolioHost ? staticDemoCampaigns[0]?.id ?? '' : '')
  const [broadcastMonitor, setBroadcastMonitor] = useState<BroadcastMonitor | null>(() =>
    staticPortfolioHost ? staticDemoBroadcastMonitor : null,
  )
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
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(() => (staticPortfolioHost ? staticDemoMediaAssets : []))
  const [mediaAssetsLoaded, setMediaAssetsLoaded] = useState(staticPortfolioHost)
  const [trackedCampaignId, setTrackedCampaignId] = useState('')
  const [trackedSubscriberId, setTrackedSubscriberId] = useState('')
  const [trackedMediaAssetId, setTrackedMediaAssetId] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('https://example.com/offers/memorial-day')
  const [campaignLinks, setCampaignLinks] = useState<CampaignLink[]>(() =>
    staticPortfolioHost ? staticDemoCampaignLinks : [],
  )
  const [campaignLink, setCampaignLink] = useState<CampaignLink | null>(null)
  const [contentFeedback, setContentFeedback] = useState<string | null>(null)
  const campaignCreationRef = useRef<HTMLDivElement>(null)
  const [performance, setPerformance] = useState<PerformanceTotals | null>(() =>
    staticPortfolioHost ? staticDemoPerformance : null,
  )
  const [reminderSourceCampaignId, setReminderSourceCampaignId] = useState('')
  const [reminderAudienceRule, setReminderAudienceRule] = useState('not_clicked')
  const [reminderMessageBody, setReminderMessageBody] = useState('Still thinking it over? Your VIP offer ends tonight. Tap to finish checkout before it expires.')
  const [reminderCampaign, setReminderCampaign] = useState<ReminderCampaign | null>(null)
  const [reminderCampaigns, setReminderCampaigns] = useState<ReminderCampaign[]>(() =>
    staticPortfolioHost ? staticDemoReminders : [],
  )
  const [teamUsers, setTeamUsers] = useState<CompanyUser[]>(() => (staticPortfolioHost ? staticDemoTeamUsers : []))
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
  const scheduledCampaigns = campaigns.filter((item) => item.status === 'scheduled')
  const nonScheduledCampaigns = campaigns.filter((item) => item.status !== 'scheduled')
  const upcomingCampaigns = filteredCampaigns.filter((item) => item.status === 'scheduled')
  const pastCampaigns = filteredCampaigns.filter((item) => item.status !== 'scheduled')
  const scheduledReach = scheduledCampaigns.reduce((total, item) => total + campaignReach(item), 0)
  const currentMonthScheduledReach = scheduledCampaigns
    .filter(isScheduledInCurrentMonth)
    .reduce((total, item) => total + campaignReach(item), 0)
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
  const userBudgetExceeded =
    hasUserBudget && userBudgetRemaining !== null && projectedSampleCreditCost > userBudgetRemaining
  const companyCreditExceeded =
    dashboardSummary?.credit_balance !== null &&
    dashboardSummary?.credit_balance !== undefined &&
    projectedSampleCreditCost > dashboardSummary.credit_balance
  const budgetExceeded = userBudgetExceeded || companyCreditExceeded
  const canSubmitCampaign = canCreateCampaign && selectedSampleAudienceCount > 0 && !budgetExceeded
  const restrictionCopy = isReadOnly
    ? `${roleMeta.label} access is reporting-only. Operational actions are disabled for this workspace.`
    : `${roleMeta.label} access is scoped to ${roleMeta.marketScope.toLowerCase()}.`
  const activeCampaign =
    campaigns.find((item) => ['queued', 'scheduled', 'sending', 'processing'].includes(item.status)) ?? campaigns[0] ?? null
  const activeCampaignReach = activeCampaign?.audience_count ?? activeCampaign?.message_count ?? 0
  const monitorIsTerminal = broadcastMonitor
    ? ['sent', 'completed_with_errors', 'cancelled'].includes(broadcastMonitor.status) ||
      (broadcastMonitor.sample_message_count > 0 && broadcastMonitor.queued === 0 && broadcastMonitor.percent_complete >= 100)
    : false
  const monitorEtaLabel = monitorIsTerminal
    ? 'Complete'
    : broadcastMonitor?.eta_seconds !== null && broadcastMonitor?.eta_seconds !== undefined
      ? `${formatNumber(Math.ceil(broadcastMonitor.eta_seconds / 60))} min`
      : 'No ETA yet'
  const monitorEtaTrend = monitorIsTerminal
    ? 'All loaded rows reached a terminal outcome'
    : 'Estimated from current throughput'
  const monitorCompletionLabel = monitorIsTerminal ? 'Completed' : 'Projected complete'
  const monitorCompletionValue = formatLocalDateTime(
    broadcastMonitor?.projected_completion_at ?? null,
    monitorIsTerminal ? 'Completed' : 'Not projected yet',
  )
  const dashboardAudienceSummary = subscriberLists.length
    ? `${formatNumber(subscriberLists.length)} segments / ${formatNumber(modeledAudienceTotal)} modeled`
    : 'No segments loaded'
  const dashboardAnalyticsSummary =
    dashboardSummary && (dashboardSummary.click_count > 0 || dashboardSummary.redemption_count > 0)
      ? `${formatNumber(dashboardSummary.click_count)} clicks / ${formatNumber(dashboardSummary.redemption_count)} redemptions`
      : 'Reporting starts after tracked sends'
  const companyBudgetRemaining = dashboardSummary?.credit_balance ?? 0
  const dashboardBudgetTone =
    dashboardSummary?.monthly_send_limit && currentMonthScheduledReach / dashboardSummary.monthly_send_limit >= 0.8
      ? 'Review quota before approval'
      : 'Budget available for planned sends'
  const complianceReadinessItems = [
    'Prior express written consent evidence',
    'STOP opt-out and suppression checks',
    'Quiet hours, sender identity, and audit trail',
  ]

  async function readWorkspaceJson<T>(response: Response, fallback: string): Promise<T | null> {
    try {
      return await readApiJson<T>(response)
    } catch (error) {
      setError(apiErrorMessage(error, fallback))
      return null
    }
  }

  useEffect(() => {
    if (staticPortfolioHost) return

    async function loadDashboardSummary() {
      try {
        const response = await fetch(`${API_BASE_URL}/companies/${companyId}/dashboard-summary`)
        if (response.ok) setDashboardSummary(await readApiJson<DashboardSummary>(response))
      } catch (error) {
        setError(apiErrorMessage(error, 'Company dashboard failed to load. Check that the Campaign API is available.'))
      }
    }
    void loadDashboardSummary()
  }, [companyId, staticPortfolioHost])

  useEffect(() => {
    if (page === 'campaigns') setCampaignSubpage(initialCampaignSubpage ?? 'overview')
  }, [initialCampaignSubpage, page])

  useEffect(() => {
    if (page === 'campaigns' && campaignSubpage === 'create') campaignCreationRef.current?.focus()
  }, [campaignSubpage, page])

  useEffect(() => {
    if (staticPortfolioHost) return

    async function loadCampaignPlanningData() {
      setSubscriberListsLoaded(false)
      setMediaAssetsLoaded(false)
      try {
        const [listsResponse, campaignsResponse, mediaResponse, remindersResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/companies/${companyId}/subscriber-lists`),
          fetch(`${API_BASE_URL}/companies/${companyId}/campaigns`),
          fetch(`${API_BASE_URL}/companies/${companyId}/media-assets`),
          fetch(`${API_BASE_URL}/companies/${companyId}/reminder-campaigns`),
        ])
        if (listsResponse.ok) setSubscriberLists(await readApiJson<SubscriberListResult[]>(listsResponse))
        if (campaignsResponse.ok) {
          const loadedCampaigns = await readApiJson<CampaignListItem[]>(campaignsResponse)
          setCampaigns(loadedCampaigns)
          setSelectedMonitorCampaignId((current) => current || loadedCampaigns[0]?.id || '')
        }
        if (mediaResponse.ok) setMediaAssets(await readApiJson<MediaAsset[]>(mediaResponse))
        if (remindersResponse.ok) setReminderCampaigns(await readApiJson<ReminderCampaign[]>(remindersResponse))
      } catch (error) {
        setError(apiErrorMessage(error, 'Campaign planning data failed to load. Check that the Campaign API is available.'))
      } finally {
        setSubscriberListsLoaded(true)
        setMediaAssetsLoaded(true)
      }
    }
    void loadCampaignPlanningData()
  }, [companyId, staticPortfolioHost])

  useEffect(() => {
    if (staticPortfolioHost) {
      const result = staticSubscriberSearch({
        q: subscriberSearch,
        listId: selectedSubscriberListId,
        consentStatus: subscriberConsentFilter,
        limit: subscriberLimit,
        offset: subscriberOffset,
      })
      setSubscribers(result.rows)
      setSubscriberTotal(result.total)
      setSubscriberLimit(result.limit)
      setSubscriberOffset(result.offset)
      return
    }

    async function loadSubscriberDirectory() {
      try {
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
          const result = await readApiJson<SubscriberSearchResult>(response)
          setSubscribers(result.rows)
          setSubscriberTotal(result.total)
          setSubscriberLimit(result.limit)
          setSubscriberOffset(result.offset)
        }
      } catch (error) {
        setError(apiErrorMessage(error, 'Subscriber directory failed to load. Check that the Campaign API is available.'))
      }
    }
    void loadSubscriberDirectory()
  }, [
    companyId,
    selectedSubscriberListId,
    staticPortfolioHost,
    subscriberConsentFilter,
    subscriberLimit,
    subscriberOffset,
    subscriberSearch,
  ])

  useEffect(() => {
    if (staticPortfolioHost) {
      const result = staticSubscriberSearch({
        q: directSubscriberSearch,
        listId: 'all',
        consentStatus: 'all',
        limit: 10,
        offset: 0,
      })
      setDirectSubscriberRows(result.rows)
      setDirectSubscriberTotal(result.total)
      return
    }

    async function loadDirectSubscriberRows() {
      try {
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
          const result = await readApiJson<SubscriberSearchResult>(response)
          setDirectSubscriberRows(result.rows)
          setDirectSubscriberTotal(result.total)
        }
      } catch (error) {
        setError(apiErrorMessage(error, 'Subscriber search failed to load. Check that the Campaign API is available.'))
      }
    }
    void loadDirectSubscriberRows()
  }, [companyId, directSubscriberSearch, staticPortfolioHost])

  useEffect(() => {
    if (page !== 'campaigns' || campaignSubpage !== 'monitor' || !selectedMonitorCampaignId) return undefined

    if (staticPortfolioHost) {
      setMonitorError(null)
      setMonitorLoading(false)
      setBroadcastMonitor({
        ...staticDemoBroadcastMonitor,
        campaign_id: selectedMonitorCampaignId,
        campaign_name:
          campaigns.find((item) => item.id === selectedMonitorCampaignId)?.name ?? staticDemoBroadcastMonitor.campaign_name,
      })
      return undefined
    }

    let cancelled = false
    async function loadMonitor() {
      setMonitorLoading(true)
      setMonitorError(null)
      try {
        const response = await fetch(`${API_BASE_URL}/campaigns/${selectedMonitorCampaignId}/broadcast-monitor`)
        if (cancelled) return
        if (response.ok) {
          setBroadcastMonitor(await readApiJson<BroadcastMonitor>(response))
        } else {
          setMonitorError(`Monitor unavailable: ${response.status}`)
        }
      } catch (error) {
        if (!cancelled) setMonitorError(apiErrorMessage(error, 'Monitor unavailable. Check that the Campaign API is available.'))
      }
      setMonitorLoading(false)
    }
    void loadMonitor()
    const interval = window.setInterval(() => void loadMonitor(), 5000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [campaignSubpage, campaigns, monitorRefreshTick, page, selectedMonitorCampaignId, staticPortfolioHost])

  useEffect(() => {
    if (staticPortfolioHost) return
    if (page === 'settings') void refreshTeamUsers()
  }, [companyId, page, staticPortfolioHost])

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

  function navigateCampaignSubpage(nextSubpage: CampaignSubpage) {
    setCampaignSubpage(nextSubpage)
    onNavigate('campaigns', { campaignSubpage: nextSubpage, path: campaignSubpagePaths[nextSubpage] })
  }

  function openNewCampaign() {
    navigateCampaignSubpage('create')
  }

  function copyCampaignToDraft(sourceCampaign: CampaignListItem) {
    setCampaignName(`Copy of ${sourceCampaign.name}`)
    if (sourceCampaign.body) setMessageBody(sourceCampaign.body)
    setMessageType(sourceCampaign.message_type === 'smart' ? 'smart' : 'regular')
    setSmartMediaAssetId('')
    setCampaign(null)
    openNewCampaign()
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
    setContentFeedback(`${template.title} loaded into a new campaign draft`)
    openNewCampaign()
  }

  function openBroadcastMonitor() {
    navigateCampaignSubpage('monitor')
  }

  function copyTemplateCopy(template: (typeof contentTemplates)[number]) {
    void navigator.clipboard?.writeText(template.copy)
    setContentFeedback(`Copied SMS text for ${template.title}`)
  }

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!canCreateCampaign) {
      setError(`${roleMeta.label} members cannot schedule campaigns. Ask an owner or campaign manager to send this broadcast.`)
      return
    }
    if (budgetExceeded) {
      setError(
        companyCreditExceeded
          ? 'Projected sample send exceeds the company credit balance.'
          : 'Projected sample send exceeds your remaining budget allocation.',
      )
      return
    }
    if (staticPortfolioHost) {
      const staticId = `static-campaign-${campaigns.length + 1}`
      const remainingCredits = Math.max(0, (dashboardSummary?.credit_balance ?? 0) - projectedSampleCreditCost)
      const result: Campaign = {
        id: staticId,
        company_id: companyId,
        name: campaignName,
        message_type: messageType,
        status: 'scheduled',
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        audience_count: selectedModeledAudienceCount,
        message_count: selectedSampleAudienceCount,
        sample_message_count: selectedSampleAudienceCount,
        audience_mode: 'projected_sample',
        credit_cost: projectedSampleCreditCost,
        remaining_credits: remainingCredits,
        tracked_links: [],
        status_counts: {
          queued: selectedSampleAudienceCount,
          sent: 0,
          failed: 0,
          retried: 0,
          dead_lettered: 0,
        },
      }
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
          audience_mode: result.audience_mode ?? 'projected_sample',
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
      setTrackedCampaignId(result.id)
      setReminderSourceCampaignId(result.id)
      setSelectedMonitorCampaignId(result.id)
      setContentFeedback('Static preview staged this broadcast locally. No provider send was attempted.')
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
      setError(await formatCampaignScheduleError(response))
      return
    }
    const result = await readWorkspaceJson<Campaign>(response, 'Schedule campaign failed. Check that the Campaign API is available.')
    if (!result) return
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
    if (response.ok) {
      const result = await readWorkspaceJson<SubscriberListResult>(response, 'Create subscriber list failed. Check that the Campaign API is available.')
      if (result) setSubscriberList(result)
    }
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
      const result = await readWorkspaceJson<SubscriberResult>(response, 'Import subscriber failed. Check that the Campaign API is available.')
      if (!result) return
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
            list = await readWorkspaceJson<SubscriberListResult>(listResponse, 'Create subscriber list failed. Check that the Campaign API is available.') ?? undefined
            if (!list) continue
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
        const result = await readWorkspaceJson<SubscriberResult>(response, 'Import subscriber failed. Check that the Campaign API is available.')
        if (!result) continue
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
      const result = await readWorkspaceJson<OptInResult>(response, 'Opt-in start failed. Check that the Campaign API is available.')
      if (!result) return
      setOptIn(result)
      if (result.confirmation_token) setConfirmToken(result.confirmation_token)
    }
  }

  async function confirmOptIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isReadOnly) return
    const response = await fetch(`${API_BASE_URL}/public/opt-ins/${confirmToken}/confirm`, { method: 'POST' })
    if (response.ok) {
      const result = await readWorkspaceJson<OptInResult>(response, 'Opt-in confirmation failed. Check that the Campaign API is available.')
      if (result) setConfirmResult(result)
    }
  }

  async function addMediaAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isReadOnly) return
    if (staticPortfolioHost) {
      const result: MediaAsset = {
        id: `static-media-${mediaAssets.length + 1}`,
        company_id: companyId,
        filename: mediaFilename,
        content_type: mediaContentType,
        url: mediaUrl,
      }
      setMediaAssets((current) => [result, ...current.filter((asset) => asset.id !== result.id)])
      setTrackedMediaAssetId(result.id ?? '')
      setContentFeedback(`${result.filename ?? 'Media asset'} added locally for this static preview`)
      return
    }
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/media-assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: mediaFilename, content_type: mediaContentType, url: mediaUrl }),
    })
    if (response.ok) {
      const result = await readWorkspaceJson<MediaAsset>(response, 'Add media failed. Check that the Campaign API is available.')
      if (!result) return
      setMediaAssets((current) => [result, ...current.filter((asset) => asset.id !== result.id)])
      if (result.id) setTrackedMediaAssetId(result.id)
      setContentFeedback(`${result.filename ?? 'Media asset'} added to the library`)
    } else {
      setContentFeedback(`Add media failed: ${response.status}`)
    }
  }

  async function refreshMediaAssets() {
    if (staticPortfolioHost) {
      setMediaAssets((current) => (current.length ? current : staticDemoMediaAssets))
      return
    }
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/media-assets`)
    if (response.ok) {
      const result = await readWorkspaceJson<MediaAsset[]>(response, 'Refresh media failed. Check that the Campaign API is available.')
      if (result) setMediaAssets(result)
    }
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
    if (staticPortfolioHost) {
      const result: CampaignLink = {
        id: `static-link-${campaignLinks.length + 1}`,
        token: `static-link-${campaignLinks.length + 1}`,
        public_url: `/r/static-link-${campaignLinks.length + 1}`,
        company_id: companyId,
        campaign_id: trackedCampaignId || campaigns[0]?.id,
        subscriber_id: trackedSubscriberId || staticDemoSubscribers[0]?.id,
        media_asset_id: trackedMediaAssetId || mediaAssets[0]?.id,
        destination_url: destinationUrl,
        click_count: 0,
        redeemed_count: 0,
      }
      setCampaignLink(result)
      setCampaignLinks((current) => [result, ...current.filter((link) => link.id !== result.id)])
      setContentFeedback(`Tracking link staged locally: ${result.public_url}`)
      return
    }
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
      const result = await readWorkspaceJson<CampaignLink>(response, 'Create tracked link failed. Check that the Campaign API is available.')
      if (!result) return
      setCampaignLink(result)
      setCampaignLinks((current) => [result, ...current.filter((link) => link.id !== result.id)])
      setContentFeedback(`Tracking link created: ${result.public_url}`)
    } else {
      setContentFeedback(`Create tracked link failed: ${response.status}`)
    }
  }

  async function refreshCampaignLinks() {
    if (staticPortfolioHost) {
      setCampaignLinks((current) => (current.length ? current : staticDemoCampaignLinks))
      return
    }
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/campaign-links`)
    if (response.ok) {
      const result = await readWorkspaceJson<CampaignLink[]>(response, 'Refresh tracked links failed. Check that the Campaign API is available.')
      if (result) setCampaignLinks(result)
    }
  }

  async function refreshPerformance() {
    if (staticPortfolioHost) {
      setPerformance(staticDemoPerformance)
      return
    }
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/campaign-performance`)
    if (response.ok) {
      const result = await readWorkspaceJson<PerformanceTotals>(response, 'Refresh performance failed. Check that the Campaign API is available.')
      if (result) setPerformance(result)
    }
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
      const result = await readWorkspaceJson<ReminderCampaign>(response, 'Create reminder failed. Check that the Campaign API is available.')
      if (!result) return
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
    if (response.ok) {
      const result = await readWorkspaceJson<AccessCodeResult>(response, 'Create access code failed. Check that the Campaign API is available.')
      if (result) setAccessCodeResult(result)
    }
  }

  async function refreshTeamUsers() {
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/users`)
    if (response.ok) {
      const result = await readWorkspaceJson<CompanyUser[]>(response, 'Refresh team users failed. Check that the Campaign API is available.')
      if (result) setTeamUsers(result)
    }
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
      const updatedUser = await readWorkspaceJson<CompanyUser>(response, 'Update team user failed. Check that the Campaign API is available.')
      if (!updatedUser) return
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
          description={`${session.companyName} / ${roleMeta.label}`}
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
            <p>Allowed markets and lists for this workspace.</p>
          </div>
          <div>
            <span>User allocation</span>
            <strong>
              {hasUserBudget ? `${formatNumber(userBudgetRemaining)} remaining` : 'Company pooled budget'}
            </strong>
            <p>
              {hasUserBudget
                ? `${formatNumber(userCreditsUsed)} used of ${formatNumber(userBudgetLimit)} assigned credits.`
                : 'No separate user credit limit.'}
            </p>
          </div>
        </section>
        <section className="dashboard-command-surface" aria-label="Dashboard command surface">
          <div className="dashboard-command-main">
            <p className="eyebrow">Today's decisions</p>
            <h2>
              {activeCampaign
                ? `Review ${activeCampaign.name}.`
                : 'Build the first campaign plan for this workspace.'}
            </h2>
            <p>Budget, audience, monitor, and reporting status before send.</p>
            <div className="decision-list" aria-label="Decision queue">
              <article>
                <span>Broadcast state</span>
                <strong>{activeCampaign ? activeCampaign.status : 'No campaign loaded'}</strong>
                <p>
                  {activeCampaign
                    ? `${formatNumber(activeCampaignReach)} modeled recipients / ${formatLocalDateTime(
                        activeCampaign.scheduled_at ?? activeCampaign.created_at,
                      )}`
                    : 'Create or import a campaign.'}
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
                <p>Modeled reach with local sample rows.</p>
              </article>
            </div>
          </div>
          <aside className="dashboard-command-aside" aria-label="Next actions">
            <div className="next-action-summary">
              <span>Next action</span>
              <strong>{canCreateCampaign ? 'Approve a broadcast or start a new one' : 'Review monitor and reporting status'}</strong>
              <p>
                {canCreateCampaign
                  ? 'Move from review to the next workspace task.'
                  : 'Creation is disabled; monitor and reporting stay available.'}
              </p>
            </div>
            <button
              disabled={!canCreateCampaign}
              onClick={openNewCampaign}
            >
              New campaign
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
              Read knowledge base
            </a>
            {!canCreateCampaign ? <p className="helper-text">{restrictionCopy}</p> : null}
          </aside>
        </section>

        <div className="metric-grid dashboard-metrics" aria-label="Workspace posture">
          <Metric label="Subscribers" value={formatCount(dashboardSummary?.subscriber_count)} trend="Confirmed and imported audience" />
          <Metric label="Active campaigns" value={formatNumber(scheduledCampaigns.length)} trend="Scheduled or queued decision work" />
          <Metric label="Messages" value={formatActivity(dashboardSummary?.message_count)} trend="Sent or scheduled sample rows" />
          <Metric label="Credits remaining" value={formatCount(dashboardSummary?.credit_balance)} trend="Contract balance" />
          <Metric label="Reporting" value={dashboardAnalyticsSummary} trend="Analytics summary" />
        </div>

        <div className="dashboard-grid">
          <QuotaBar
            label="Monthly send quota"
            used={currentMonthScheduledReach}
            limit={dashboardSummary?.monthly_send_limit}
            helper={
              dashboardSummary?.monthly_send_limit
                ? `${formatCount(currentMonthScheduledReach)} scheduled reach in the current calendar month against a ${formatNumber(
                    dashboardSummary.monthly_send_limit,
                  )} monthly send limit.`
                : 'Monthly send limit is not configured for this workspace.'
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
                <dd>{formatNumber(scheduledReach)}</dd>
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
      { id: 'monitor', label: 'Monitor' },
      { id: 'followups', label: 'Follow-ups' },
    ]
    const isCampaignCreationMode = campaignSubpage === 'create'

    return (
      <>
        <PageHeader
          focusRef={isCampaignCreationMode ? campaignCreationRef : undefined}
          tabIndex={isCampaignCreationMode ? -1 : undefined}
          eyebrow={isCampaignCreationMode ? 'Campaigns' : undefined}
          title={isCampaignCreationMode ? 'New campaign' : 'Campaigns'}
          description={
            isCampaignCreationMode
              ? 'Choose an approved audience, write the message, and review sample cost before scheduling.'
              : 'Review scheduled and sent broadcasts, monitor delivery, and manage follow-up automations.'
          }
          action={
            isCampaignCreationMode ? (
              <button className="secondary" type="button" onClick={() => navigateCampaignSubpage('overview')}>
                Back to campaigns
              </button>
            ) : (
              <button disabled={!canCreateCampaign} onClick={openNewCampaign}>
                New campaign
              </button>
            )
          }
        />
        {!isCampaignCreationMode ? (
          <>
            <section className="budget-context" aria-label="Campaign budget and permission context">
              <div>
                <span>Permission</span>
                <strong>{canCreateCampaign ? 'Campaign creation enabled' : 'Read-only campaign access'}</strong>
                <p>{roleMeta.permissionSummary}</p>
              </div>
              <div>
                <span>Market scope</span>
                <strong>{roleMeta.marketScope}</strong>
                <p>Campaigns should use lists approved for this role and workspace.</p>
              </div>
              <div>
                <span>Budget</span>
                <strong>
                  {hasUserBudget
                    ? `${formatNumber(userBudgetRemaining)} user credits`
                    : `${formatNumber(dashboardSummary?.credit_balance)} company credits`}
                </strong>
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
                  onClick={() => navigateCampaignSubpage(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </>
        ) : null}

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
                onDraft={canCreateCampaign ? copyCampaignToDraft : undefined}
              />
              <CampaignColumn
                title="Past"
                campaigns={pastCampaigns.slice(0, 5)}
                emptyText={hasCampaignFilters ? 'No past campaigns match the current filters.' : undefined}
                onDraft={canCreateCampaign ? copyCampaignToDraft : undefined}
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
              onDraft={canCreateCampaign ? copyCampaignToDraft : undefined}
            />
          </div>
        ) : null}

        {campaignSubpage === 'past' ? (
          <div className="campaign-board single">
            <CampaignColumn
              title="Past"
              campaigns={pastCampaigns}
              emptyText={hasCampaignFilters ? 'No sent, queued, or cancelled campaigns match the current filters.' : undefined}
              onDraft={canCreateCampaign ? copyCampaignToDraft : undefined}
            />
          </div>
        ) : null}

        {campaignSubpage === 'create' ? (
          <div className="campaign-creation-flow">
            <section className="campaign-creation-context" aria-label="New campaign context">
              <div>
                <span>Permission</span>
                <strong>{canCreateCampaign ? 'Creation enabled' : 'Read-only access'}</strong>
              </div>
              <div>
                <span>Market scope</span>
                <strong>{roleMeta.marketScope}</strong>
              </div>
              <div>
                <span>Available budget</span>
                <strong>
                  {hasUserBudget
                    ? `${formatNumber(userBudgetRemaining)} user credits`
                    : `${formatNumber(dashboardSummary?.credit_balance)} company credits`}
                </strong>
              </div>
            </section>
            <form className="campaign-builder" onSubmit={createCampaign}>
              <section className="product-help-callout" aria-label="New campaign checklist">
                <div>
                  <strong>Campaign scheduling checklist</strong>
                  <p>Segments, cost, media, consent, STOP suppression, quiet hours, sender, modeled reach.</p>
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
                          {subscriber.phone_number} ({formatSubscriberStatus(subscriber.consent_status)})
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
                    <small>Current workspace credit balance</small>
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
                  <p className="warning-text">
                    {companyCreditExceeded
                      ? 'Projected sample send exceeds the company credit balance.'
                      : 'Projected sample send exceeds your remaining budget allocation.'}
                  </p>
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
                <button className="secondary" type="button" onClick={openBroadcastMonitor}>
                  Open monitor
                </button>
              </div>
            ) : null}
            {error ? <p className="error">{error}</p> : null}
          </div>
        ) : null}

        {campaignSubpage === 'monitor' ? (
          <section className="panel broadcast-monitor monitor-war-room" aria-label="Broadcast monitor">
            <div className="section-heading">
              <span>Runtime operations</span>
              <strong>Broadcast monitor</strong>
            </div>
            <div className="monitor-help-strip">
              <p>Auto-refreshes every 5 seconds. Manual refresh reloads the selected campaign.</p>
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
                      <div
                        className="progress-track"
                        role="progressbar"
                        aria-label="Broadcast percent complete"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(
                          Math.min(100, Math.max(0, broadcastMonitor.percent_complete)),
                        )}
                      >
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
                        <dd className="metric-note">Waiting to send</dd>
                      </div>
                      <div>
                        <dt>Sent</dt>
                        <dd>{formatNumber(broadcastMonitor.sent)}</dd>
                        <dd className="metric-note">Simulator accepted</dd>
                      </div>
                      <div>
                        <dt>Failed</dt>
                        <dd>{formatNumber(broadcastMonitor.failed)}</dd>
                        <dd className="metric-note">Needs review</dd>
                      </div>
                      <div>
                        <dt>Retried</dt>
                        <dd>{formatNumber(broadcastMonitor.retried)}</dd>
                        <dd className="metric-note">Retried rows</dd>
                      </div>
                      <div>
                        <dt>Dead-lettered</dt>
                        <dd>{formatNumber(broadcastMonitor.dead_lettered)}</dd>
                        <dd className="metric-note">Terminal rows</dd>
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
                        value={monitorEtaLabel}
                        trend={monitorEtaTrend}
                      />
                      <Metric label="Percent complete" value={`${formatNumber(broadcastMonitor.percent_complete)}%`} trend="Loaded rows" />
                    </div>
                    <div className="monitor-meta">
                      <span>Started: {formatLocalDateTime(broadcastMonitor.started_at, 'Not started')}</span>
                      <span>Last updated: {formatLocalDateTime(broadcastMonitor.last_updated, 'Not updated yet')}</span>
                      <span>ETA: {monitorEtaLabel}</span>
                      <span>
                        {monitorCompletionLabel}: {monitorCompletionValue}
                      </span>
                    </div>
                    <section className="monitor-semantics" aria-label="Monitor status semantics">
                      <strong>Operational labels</strong>
                      <p>Queued waits; sent is simulator-accepted; failed, retried, and dead-lettered need review.</p>
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
                  {nonScheduledCampaigns.concat(scheduledCampaigns).map((item) => (
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
            <p>Use segment selection to keep campaign planning aligned with the markets assigned to this role.</p>
          </section>
        )}
        <div className="metric-grid spaced subscriber-segment-grid">
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
          {!subscriberListsLoaded
            ? Array.from({ length: SUBSCRIBER_SEGMENT_PLACEHOLDER_COUNT }, (_, index) => (
                <span className="segment-card segment-card-placeholder" aria-hidden="true" key={`segment-placeholder-${index}`}>
                  <span />
                  <strong />
                  <small />
                </span>
              ))
            : null}
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
              {
                key: 'status',
                header: 'Consent / status',
                render: (row) => `${formatSubscriberStatus(row.consent_status)} / ${formatSubscriberStatus(row.marketing_status)}`,
              },
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
            {subscriber ? <p className="muted">{formatSubscriberStatus(subscriber.consent_status)}</p> : null}
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
          description={`Review reusable media assets first, then add hosted content or start from SMS templates. ${roleMeta.permissionSummary}`}
        />
        {isReadOnly ? (
          <section className="permission-callout" aria-label="Read-only content restriction">
            <strong>Content changes are disabled for {roleMeta.label}</strong>
            <p>{restrictionCopy}</p>
          </section>
        ) : null}
        {contentFeedback ? <p className="notice content-notice">{contentFeedback}</p> : null}
        <section className="panel content-library-primary">
          <div className="section-heading">
            <div>
              <span>Library</span>
              <strong>Media assets</strong>
            </div>
            <button className="secondary" type="button" onClick={() => void refreshMediaAssets()}>
              Refresh media assets
            </button>
          </div>
          {mediaAssets.length ? (
            <ul className="asset-grid embedded-list" aria-label="Media asset library">
              {mediaAssets.map((asset) => (
                <li key={asset.id}>
                  <MediaAssetPreview asset={asset} />
                  <strong>{asset.filename}</strong>
                  <span>{asset.content_type}</span>
                  <span title={asset.url ?? ''}>{formatAssetLocation(asset.url)}</span>
                </li>
              ))}
            </ul>
          ) : !mediaAssetsLoaded ? (
            <ul className="asset-grid embedded-list" aria-hidden="true">
              {Array.from({ length: MEDIA_ASSET_PLACEHOLDER_COUNT }, (_, index) => (
                <li className="asset-card-placeholder" key={`asset-placeholder-${index}`}>
                  <div className="asset-thumb asset-thumb-generated asset-thumb-placeholder" />
                  <strong />
                  <span />
                  <span />
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
        <div className="split-layout two-column content-secondary-layout">
          <form className="panel" onSubmit={addMediaAsset}>
            <div className="section-heading">
              <span>Add media</span>
              <strong>Register a hosted asset</strong>
            </div>
            <p className="helper-text">Additions stay secondary to the library so teams can review existing assets first.</p>
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
          </form>
          <section className="panel">
            <div className="section-heading">
              <span>Templates</span>
              <strong>SMS starters</strong>
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
                      Copy SMS text
                    </button>
                  </div>
                </article>
              ))}
            </div>
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
    const totalListSubscribers = subscriberLists.reduce((total, list) => total + (list.subscriber_count ?? 0), 0)
    const trackedClickCount = performance?.click_count ?? dashboardSummary?.click_count ?? 0
    const trackedRedemptionCount = performance?.redemption_count ?? dashboardSummary?.redemption_count ?? 0
    const chartCampaigns = campaigns.slice(0, 6)
    const trackedSourceLabel = performance
      ? 'Tracked performance after sends from workspace reporting.'
      : dashboardSummary
        ? 'Tracked performance totals from dashboard summary. Refresh performance for the latest workspace report.'
        : 'Tracked performance appears after campaign activity is reported.'
    const analyticsCharts = [
      {
        title: 'Modeled reach',
        eyebrow: 'Projected / scheduled',
        sourceLabel: 'Projected from campaign schedules and modeled audience fields.',
        emptyTitle: 'No scheduled reach yet',
        emptyDescription: 'Create or load campaigns with modeled audiences to compare planned reach.',
        points: chartCampaigns.map((campaign) => ({
          label: campaign.name,
          value: campaignReach(campaign),
          valueLabel: `${formatNumber(campaignReach(campaign))} modeled`,
          detail: campaign.status,
        })),
      },
      {
        title: 'Sample messages',
        eyebrow: 'Loaded campaigns',
        sourceLabel: 'Loaded campaign sample message counts; delivery activity may differ after send.',
        emptyTitle: 'No sample messages yet',
        emptyDescription: 'Sample message volume appears after campaigns are loaded or scheduled.',
        points: chartCampaigns.map((campaign) => ({
          label: campaign.name,
          value: campaign.message_count,
          valueLabel: `${formatNumber(campaign.message_count)} sample messages`,
          detail: campaign.status,
        })),
      },
      {
        title: 'Credit costs',
        eyebrow: 'Budget estimate',
        sourceLabel: 'Scheduled campaign credit estimates from workspace campaign records.',
        emptyTitle: 'No credit estimates yet',
        emptyDescription: 'Campaign credit costs appear when campaigns have audience selections and message type.',
        points: chartCampaigns.map((campaign) => ({
          label: campaign.name,
          value: campaign.credit_cost,
          valueLabel: `${formatNumber(campaign.credit_cost)} credits`,
          detail: campaign.message_type === 'smart' ? 'Smart SMS' : 'Regular SMS',
        })),
      },
      {
        title: 'Follow-ups',
        eyebrow: 'Automation',
        sourceLabel: 'Follow-up counts are loaded from campaign and reminder records, not inferred conversions.',
        emptyTitle: 'No follow-ups configured',
        emptyDescription: 'Follow-up counts stay empty until reminder campaigns or campaign reminder counts exist.',
        points: buildFollowUpPoints(chartCampaigns, reminderCampaigns),
      },
      {
        title: 'Clicks and redemptions',
        eyebrow: 'Tracked performance',
        sourceLabel: trackedSourceLabel,
        emptyTitle: 'No tracked clicks or redemptions yet',
        emptyDescription: 'Click and redemption bars stay empty until Smart SMS tracking reports real activity.',
        points: [
          {
            label: 'Clicks',
            value: trackedClickCount,
            valueLabel: formatActivity(trackedClickCount),
            detail: 'Tracked link engagement',
          },
          {
            label: 'Redemptions',
            value: trackedRedemptionCount,
            valueLabel: formatActivity(trackedRedemptionCount),
            detail: 'Offer conversion',
          },
        ],
      },
    ]

    return (
      <>
        <PageHeader
          title="Analytics"
          description={`Review campaign performance, tracked links, redemptions, and quota consumption for this workspace. ${roleMeta.label} access can view analytics.`}
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
          <Metric label="Monthly quota reach" value={formatNumber(currentMonthScheduledReach)} trend="Current quota period" />
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
          {analyticsCharts.map((chart) => (
            <AnalyticsChartCard key={chart.title} {...chart} />
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Settings" description="Manage workspace identity, team access, roles, invites, and regional credit budgets." />
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
  onDraft,
}: {
  title: string
  campaigns: CampaignListItem[]
  emptyText?: string
  onDraft?: (campaign: CampaignListItem) => void
}) {
  return (
    <section className="campaign-column">
      <h2 className="campaign-column-title">
        <span>{title}</span>
        {' '}
        <span className="count-pill">{formatNumber(campaigns.length)}</span>
      </h2>
      {campaigns.length ? (
        <ul className="campaign-card-list">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <article className="campaign-card" aria-label={`${campaign.name} campaign card`}>
                <header className="campaign-card-header">
                  <div>
                    <strong>{campaign.name}</strong>
                    <small className="subtle-id" title={`Campaign ID: ${campaign.id}`}>Campaign ID: {shortCampaignId(campaign.id)}</small>
                  </div>
                  <span className={`campaign-status campaign-status-${statusClassName(campaign.status)}`}>
                    {formatCampaignStatus(campaign.status)}
                  </span>
                </header>

                <dl className="campaign-date-grid">
                  <div>
                    <dt>Scheduled</dt>
                    <dd>{formatLocalDateTime(campaign.scheduled_at)}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatLocalDateTime(campaign.created_at)}</dd>
                  </div>
                </dl>

                {campaign.body ? (
                  <p className="campaign-copy-preview">
                    <span>Body preview</span>
                    {campaign.body}
                  </p>
                ) : (
                  <p className="campaign-copy-preview muted">No message body loaded for this campaign.</p>
                )}

                <div className="campaign-reach-meter" aria-label={`${campaign.name} sample to modeled audience`}>
                  <div>
                    <span>{formatAudienceMode(campaign.audience_mode)}</span>
                    <strong>
                      {formatNumber(campaign.message_count)} of {formatNumber(campaignReach(campaign))}
                    </strong>
                  </div>
                  <i style={{ width: `${sampleCoveragePercent(campaign)}%` }} aria-hidden="true" />
                </div>

                <dl className="campaign-stat-grid">
                  <div>
                    <dt>Modeled audience</dt>
                    <dd>{formatNumber(campaignReach(campaign))}</dd>
                  </div>
                  <div>
                    <dt>Sample messages</dt>
                    <dd>{formatNumber(campaign.message_count)}</dd>
                  </div>
                  <div>
                    <dt>Credits</dt>
                    <dd>{formatNumber(campaign.credit_cost)}</dd>
                  </div>
                  <div>
                    <dt>Follow-ups</dt>
                    <dd>{formatNumber(campaign.reminder_count)}</dd>
                  </div>
                </dl>

                <footer className="campaign-card-actions">
                  <span>{campaign.message_type === 'smart' ? 'Smart SMS with tracking support' : 'Regular SMS'}</span>
                  {onDraft ? (
                    <button className="secondary" type="button" onClick={() => onDraft(campaign)}>
                      Copy to draft
                    </button>
                  ) : null}
                </footer>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state campaign-empty-state">
          <strong>{title} is empty</strong>
          <p>{emptyText}</p>
        </div>
      )}
    </section>
  )
}

type AnalyticsChartPoint = {
  label: string
  value: number
  valueLabel?: string
  detail?: string
}

function AnalyticsChartCard({
  title,
  eyebrow,
  points,
  sourceLabel,
  emptyTitle,
  emptyDescription,
}: {
  title: string
  eyebrow: string
  points: AnalyticsChartPoint[]
  sourceLabel: string
  emptyTitle: string
  emptyDescription: string
}) {
  const visiblePoints = points.filter((point) => point.value > 0)
  const maxValue = Math.max(...points.map((point) => point.value), 0)
  const hasData = visiblePoints.length > 0

  return (
    <section className="panel chart-card analytics-chart-card" aria-label={`${title} chart`}>
      <div className="section-heading">
        <span>{eyebrow}</span>
        <strong>{title}</strong>
      </div>
      {hasData ? (
        <>
          <div className="mini-chart analytics-chart" aria-hidden="true">
            {points.map((point) => (
              <span
                key={point.label}
                style={{ height: `${Math.max(14, Math.round((point.value / maxValue) * 100))}%` }}
              />
            ))}
          </div>
          <ul className="analytics-chart-list">
            {points.map((point) => (
              <li key={point.label}>
                <span>{point.label}</span>
                <strong>{point.valueLabel ?? formatNumber(point.value)}</strong>
                {point.detail ? <small>{point.detail}</small> : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="analytics-empty-chart">
          <strong>{emptyTitle}</strong>
          <p>{emptyDescription}</p>
        </div>
      )}
      <p className="chart-source">{sourceLabel}</p>
    </section>
  )
}

function buildFollowUpPoints(campaigns: CampaignListItem[], reminders: ReminderCampaign[]): AnalyticsChartPoint[] {
  const reminderCountByCampaign = new Map<string, number>()
  reminders.forEach((reminder) => {
    if (!reminder.source_campaign_id) return
    reminderCountByCampaign.set(
      reminder.source_campaign_id,
      (reminderCountByCampaign.get(reminder.source_campaign_id) ?? 0) + 1,
    )
  })
  const points = campaigns.map((campaign) => {
    const value = Math.max(campaign.reminder_count, reminderCountByCampaign.get(campaign.id) ?? 0)
    return {
      label: campaign.name,
      value,
      valueLabel: `${formatNumber(value)} ${value === 1 ? 'follow-up' : 'follow-ups'}`,
      detail: campaign.status,
    }
  })
  const orphanReminderCount = reminders.filter((reminder) => {
    if (!reminder.source_campaign_id) return true
    return !campaigns.some((campaign) => campaign.id === reminder.source_campaign_id)
  }).length
  return orphanReminderCount
    ? [
        ...points,
        {
          label: 'Unmatched reminder drafts',
          value: orphanReminderCount,
          valueLabel: `${formatNumber(orphanReminderCount)} ${orphanReminderCount === 1 ? 'follow-up' : 'follow-ups'}`,
          detail: 'Loaded reminder records',
        },
      ]
    : points
}

function statusClassName(status: string) {
  return status.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function formatCampaignStatus(status: string) {
  return status
    .replace(/[_-]+/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

function formatSubscriberStatus(status?: string | null) {
  if (!status) return 'Unknown'
  const labels: Record<string, string> = {
    company_provided: 'Company provided',
    double_opt_in_confirmed: 'Double opt-in confirmed',
    imported: 'Imported',
    confirmed: 'Confirmed',
  }
  return labels[status] ?? formatCampaignStatus(status)
}

function formatAudienceMode(mode?: string) {
  if (!mode) return 'Audience mode'
  if (mode === 'projected_sample') return 'Projected sample'
  return formatCampaignStatus(mode)
}

function campaignReach(campaign: CampaignListItem) {
  return campaign.audience_count ?? campaign.message_count
}

function isScheduledInCurrentMonth(campaign: CampaignListItem) {
  if (!campaign.scheduled_at) return false
  const scheduledAt = new Date(campaign.scheduled_at)
  if (Number.isNaN(scheduledAt.getTime())) return false
  const now = new Date()
  return scheduledAt.getFullYear() === now.getFullYear() && scheduledAt.getMonth() === now.getMonth()
}

function sampleCoveragePercent(campaign: CampaignListItem) {
  const modeledAudience = Math.max(campaignReach(campaign), 1)
  const sampleAudience = Math.max(campaign.message_count, 0)
  if (sampleAudience === 0) return 0
  return Math.min(100, Math.max(8, Math.round((sampleAudience / modeledAudience) * 100)))
}

function shortCampaignId(id: string) {
  if (id.length <= 16) return id
  return `${id.slice(0, 8)}…${id.slice(-6)}`
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

function formatAssetLocation(url?: string | null) {
  if (!url) return 'No source URL'
  try {
    const parsedUrl = new URL(url)
    const path = parsedUrl.pathname.length > 34 ? `${parsedUrl.pathname.slice(0, 31)}...` : parsedUrl.pathname
    return `${parsedUrl.hostname}${path}`
  } catch {
    return url.length > 42 ? `${url.slice(0, 39)}...` : url
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
