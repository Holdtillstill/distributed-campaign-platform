import type {
  BroadcastMonitor,
  CampaignLink,
  CampaignListItem,
  CompanyUser,
  DashboardSummary,
  MediaAsset,
  PerformanceTotals,
  ReminderCampaign,
  Session,
  SubscriberListResult,
  SubscriberResult,
} from './types'

export const staticDemoSession: Extract<Session, { role: 'company_user' }> = {
  role: 'company_user',
  email: 'owner@demo-retail.test',
  companyId: 'company-demo',
  companyName: 'Demo Retail Co',
  membershipRole: 'customer_admin',
  creditLimit: null,
  creditsUsed: 0,
}

export const staticDemoDashboardSummary: DashboardSummary = {
  company_id: 'company-demo',
  company_name: 'Demo Retail Co',
  monthly_send_limit: 4_800_000,
  credit_balance: 4_800_000,
  subscriber_count: 2_650_000,
  campaign_count: 3,
  message_count: 950,
  credits_used: 2_250,
  click_count: 41_820,
  redemption_count: 7_405,
}

export const staticDemoSubscriberLists: SubscriberListResult[] = [
  {
    id: 'demo-list-vip',
    company_id: 'company-demo',
    name: 'Seattle VIP',
    subscriber_count: 1_360_000,
    sample_subscriber_count: 5,
    estimated_subscriber_count: 1_360_000,
  },
  {
    id: 'demo-list-west',
    company_id: 'company-demo',
    name: 'West loyalty',
    subscriber_count: 820_000,
    sample_subscriber_count: 4,
    estimated_subscriber_count: 820_000,
  },
  {
    id: 'demo-list-winback',
    company_id: 'company-demo',
    name: 'Winback shoppers',
    subscriber_count: 470_000,
    sample_subscriber_count: 3,
    estimated_subscriber_count: 470_000,
  },
]

export const staticDemoSubscribers: SubscriberResult[] = [
  {
    id: 'demo-sub-001',
    company_id: 'company-demo',
    phone_number: '+12065550101',
    marketing_status: 'confirmed',
    consent_status: 'double_opt_in_confirmed',
    list_id: 'demo-list-vip',
    source: 'loyalty',
    region: 'Seattle',
    created_at: '2026-05-20T15:00:00Z',
  },
  {
    id: 'demo-sub-002',
    company_id: 'company-demo',
    phone_number: '+12065550102',
    marketing_status: 'imported',
    consent_status: 'company_provided',
    list_id: 'demo-list-west',
    source: 'crm_export',
    region: 'West',
    created_at: '2026-05-21T15:00:00Z',
  },
  {
    id: 'demo-sub-003',
    company_id: 'company-demo',
    phone_number: '+12065550103',
    marketing_status: 'confirmed',
    consent_status: 'double_opt_in_confirmed',
    list_id: 'demo-list-vip',
    source: 'mobile_signup',
    region: 'Seattle',
    created_at: '2026-05-22T15:00:00Z',
  },
  {
    id: 'demo-sub-004',
    company_id: 'company-demo',
    phone_number: '+14805550104',
    marketing_status: 'imported',
    consent_status: 'company_provided',
    list_id: 'demo-list-winback',
    source: 'pos_export',
    region: 'Phoenix',
    created_at: '2026-05-23T15:00:00Z',
  },
  {
    id: 'demo-sub-005',
    company_id: 'company-demo',
    phone_number: '+14155550105',
    marketing_status: 'confirmed',
    consent_status: 'double_opt_in_confirmed',
    list_id: 'demo-list-west',
    source: 'loyalty',
    region: 'Bay Area',
    created_at: '2026-05-24T15:00:00Z',
  },
]

export const staticDemoCampaigns: CampaignListItem[] = [
  {
    id: 'demo-seattle-vip',
    company_id: 'company-demo',
    name: 'Seattle VIP Double Points',
    body: 'VIP weekend: earn double points on every order through Sunday.',
    message_type: 'smart',
    status: 'scheduled',
    scheduled_at: '2026-06-18T17:00:00Z',
    created_at: '2026-06-10T19:01:00Z',
    message_count: 950,
    audience_count: 2_650_000,
    audience_mode: 'projected_sample',
    credit_cost: 1_900,
    reminder_count: 1,
  },
  {
    id: 'demo-west-preview',
    company_id: 'company-demo',
    name: 'West Region Summer Preview',
    body: 'Summer preview starts today for loyalty members.',
    message_type: 'regular',
    status: 'queued',
    scheduled_at: '2026-06-14T18:30:00Z',
    created_at: '2026-06-11T16:40:00Z',
    message_count: 420,
    audience_count: 820_000,
    audience_mode: 'projected_sample',
    credit_cost: 420,
    reminder_count: 0,
  },
  {
    id: 'demo-spring-clearance',
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
]

export const staticDemoMediaAssets: MediaAsset[] = [
  {
    id: 'demo-media-vip',
    company_id: 'company-demo',
    filename: 'vip-double-points.png',
    content_type: 'image/png',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'demo-media-sale',
    company_id: 'company-demo',
    filename: 'summer-preview-offer.png',
    content_type: 'image/png',
    url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'demo-media-winback',
    company_id: 'company-demo',
    filename: 'winback-coupon.png',
    content_type: 'image/png',
    url: 'https://images.unsplash.com/photo-1491933382434-500287f9b54b?auto=format&fit=crop&w=1200&q=80',
  },
]

export const staticDemoCampaignLinks: CampaignLink[] = [
  {
    id: 'demo-link-vip',
    token: 'vip-double-points',
    public_url: '/r/vip-double-points',
    company_id: 'company-demo',
    campaign_id: 'demo-seattle-vip',
    subscriber_id: 'demo-sub-001',
    media_asset_id: 'demo-media-vip',
    destination_url: 'https://example.com/offers/vip-double-points',
    click_count: 18_400,
    redeemed_count: 3_208,
  },
]

export const staticDemoPerformance: PerformanceTotals = {
  media_asset_count: staticDemoMediaAssets.length,
  tracked_link_count: staticDemoCampaignLinks.length,
  click_count: 41_820,
  redemption_count: 7_405,
}

export const staticDemoReminders: ReminderCampaign[] = [
  {
    id: 'demo-reminder-vip',
    company_id: 'company-demo',
    source_campaign_id: 'demo-seattle-vip',
    audience_rule: 'clicked_not_redeemed',
    message_body: 'Still thinking it over? Your double-points offer ends tonight.',
    status: 'draft',
    estimated_recipient_count: 18_400,
  },
]

export const staticDemoTeamUsers: CompanyUser[] = [
  {
    user_id: 'demo-user-owner',
    email: 'owner@demo-retail.test',
    display_name: 'Demo Retail Owner',
    role: 'customer_admin',
    credit_limit: null,
    credits_used: 0,
  },
  {
    user_id: 'demo-user-manager',
    email: 'campaigns@demo-retail.test',
    display_name: 'Campaign Manager',
    role: 'campaign_manager',
    credit_limit: 200_000,
    credits_used: 38_400,
  },
]

export const staticDemoBroadcastMonitor: BroadcastMonitor = {
  campaign_id: 'demo-seattle-vip',
  company_id: 'company-demo',
  campaign_name: 'Seattle VIP Double Points',
  status: 'scheduled',
  total_audience: 2_650_000,
  modeled_audience: 2_650_000,
  sample_message_count: 950,
  mode: 'projected/sample',
  queued: 620,
  sent: 330,
  failed: 0,
  retried: 12,
  dead_lettered: 0,
  percent_complete: 35,
  throughput_per_second: 696,
  messages_per_minute: 41_800,
  eta_seconds: 3800,
  projected_completion_at: '2026-06-18T18:03:00Z',
  started_at: '2026-06-18T17:00:00Z',
  last_updated: '2026-06-18T17:09:00Z',
}
