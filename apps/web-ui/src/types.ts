import type { ReactNode } from 'react'

export type Session =
  | {
      role: 'internal_admin'
      email: string
      companyId?: never
      companyName?: never
    }
  | {
      role: 'company_user'
      email: string
      companyId: string
      companyName: string
      membershipRole?: string
      creditLimit?: number | null
      creditsUsed?: number
    }

export type Membership = {
  company_id: string
  company_name: string
  company_slug?: string
  role: string
  credit_limit?: number | null
  credits_used?: number
}

export type CompanyResult = {
  id: string
  name: string
  slug: string
  monthly_send_limit?: number | null
  credit_balance: number
  access_code: string
  admin_user: {
    id: string
    email: string
    role: string
  }
}

export type UsageRow = {
  company_id: string
  company_name: string
  campaign_count: number
  message_count: number
  media_asset_count: number
  tracked_link_count: number
  click_count: number
  redemption_count: number
  reminder_count: number
}

export type CompanyHealthRow = {
  company_id: string
  company_name: string
  subscriber_count: number
  campaign_count: number
  scheduled_reach: number
  credits_remaining: number
  monthly_send_limit?: number | null
  quota_usage: number
  active_access_code?: string | null
}

export type DashboardSummary = {
  company_id: string
  company_name: string
  monthly_send_limit?: number | null
  credit_balance: number
  subscriber_count: number
  campaign_count: number
  message_count: number
  credits_used: number
  click_count: number
  redemption_count: number
}

export type AdminDashboardSummary = {
  company_count: number
  active_company_count: number
  total_credit_balance: number
  active_access_code_count: number
}

export type StatusCounts = {
  queued: number
  sent: number
  failed: number
  retried: number
  dead_lettered: number
}

export type Campaign = {
  id: string
  company_id: string
  name: string
  message_type: 'regular' | 'smart'
  status: string
  scheduled_at?: string | null
  audience_count: number
  message_count: number
  sample_message_count?: number
  audience_mode?: string
  credit_cost: number
  remaining_credits: number
  tracked_links?: Pick<CampaignLink, 'subscriber_id' | 'media_asset_id' | 'public_url'>[]
  status_counts: StatusCounts
}

export type CompanyUser = {
  user_id: string
  email: string
  display_name?: string | null
  role: string
  credit_limit?: number | null
  credits_used: number
}

export type AccessCodeResult = {
  code: string
  company_id: string
  role: string
  credit_limit?: number | null
}

export type SubscriberListResult = {
  id: string
  company_id?: string
  name: string
  subscriber_count?: number
  sample_subscriber_count?: number
  estimated_subscriber_count?: number
}

export type SubscriberResult = {
  id: string
  company_id?: string
  phone_number: string
  marketing_status?: string
  list_id?: string
  consent_status?: string
  source?: string
  region?: string
  created_at?: string | null
}

export type SubscriberSearchResult = {
  rows: SubscriberResult[]
  total: number
  limit: number
  offset: number
}

export type BroadcastMonitor = {
  campaign_id: string
  company_id: string
  campaign_name: string
  status: string
  total_audience: number
  modeled_audience: number
  sample_message_count: number
  mode: 'actual' | 'projected/sample' | string
  queued: number
  sent: number
  failed: number
  retried: number
  dead_lettered: number
  percent_complete: number
  throughput_per_second: number
  messages_per_minute: number
  eta_seconds?: number | null
  projected_completion_at?: string | null
  started_at?: string | null
  last_updated?: string | null
}

export type OptInResult = {
  subscriber_id?: string
  company_id?: string
  phone_number?: string
  status?: string
  confirmation_token?: string
}

export type MediaAsset = {
  id?: string
  company_id?: string
  filename?: string
  content_type?: string
  url?: string
}

export type CampaignLink = {
  id?: string
  token?: string
  public_url?: string
  company_id?: string
  campaign_id?: string
  subscriber_id?: string
  media_asset_id?: string
  destination_url?: string
  click_count?: number
  redeemed_count?: number
}

export type PerformanceTotals = {
  media_asset_count: number
  tracked_link_count: number
  click_count: number
  redemption_count: number
}

export type ReminderCampaign = {
  id?: string
  company_id?: string
  source_campaign_id?: string
  audience_rule?: string
  message_body?: string
  status?: string
  estimated_recipient_count?: number
}

export type CampaignListItem = {
  id: string
  company_id: string
  name: string
  body?: string | null
  message_type: 'regular' | 'smart'
  status: string
  scheduled_at?: string | null
  created_at?: string | null
  message_count: number
  audience_count?: number
  audience_mode?: string
  credit_cost: number
  reminder_count: number
}

export type CampaignSubpage = 'overview' | 'scheduled' | 'past' | 'create' | 'followups' | 'monitor'

export type SystemCheck = {
  path: string
  label: string
  state: 'checking' | 'ok' | 'error'
  detail: string
}

export type AdminPage = 'dashboard' | 'companies' | 'usage'
export type Surface = 'marketing' | 'app' | 'internal'
export type CompanyPage = 'dashboard' | 'campaigns' | 'subscribers' | 'content' | 'analytics' | 'settings'

export type NavItem<T extends string> = { id: T; label: string }

export type PageAction = ReactNode
