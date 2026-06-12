export type RoleMeta = {
  label: string
  description: string
  permissionSummary: string
  marketScope: string
  canInvite: boolean
  canManageBudget: boolean
  canCreateCampaign: boolean
  canViewAnalytics: boolean
  isReadOnly: boolean
}

const roleMetadata: Record<string, RoleMeta> = {
  customer_admin: {
    label: 'Company admin',
    description: 'Can manage campaigns, media, analytics, team access, and credit limits.',
    permissionSummary: 'Campaigns, audiences, media, analytics, invites, and budgets.',
    marketScope: 'All company markets and segments',
    canInvite: true,
    canManageBudget: true,
    canCreateCampaign: true,
    canViewAnalytics: true,
    isReadOnly: false,
  },
  campaign_manager: {
    label: 'Campaign manager',
    description: 'Can build, schedule, and monitor campaigns within an assigned budget.',
    permissionSummary: 'Campaigns, media, and performance. No team or budget changes.',
    marketScope: 'Assigned campaign segments',
    canInvite: false,
    canManageBudget: false,
    canCreateCampaign: true,
    canViewAnalytics: true,
    isReadOnly: false,
  },
  regional_manager: {
    label: 'Regional manager',
    description: 'Can run campaigns for assigned regional lists.',
    permissionSummary: 'Regional campaigns and performance.',
    marketScope: 'Assigned regional market and customer lists',
    canInvite: false,
    canManageBudget: false,
    canCreateCampaign: true,
    canViewAnalytics: true,
    isReadOnly: false,
  },
  analyst: {
    label: 'Analyst',
    description: 'Can review campaign, audience, quota, and analytics data.',
    permissionSummary: 'Reporting-only dashboards, campaign history, and analytics.',
    marketScope: 'Reporting across assigned company data',
    canInvite: false,
    canManageBudget: false,
    canCreateCampaign: false,
    canViewAnalytics: true,
    isReadOnly: true,
  },
  viewer: {
    label: 'Viewer',
    description: 'Can view workspace status without editing data.',
    permissionSummary: 'Read-only workspace visibility.',
    marketScope: 'Read-only company overview',
    canInvite: false,
    canManageBudget: false,
    canCreateCampaign: false,
    canViewAnalytics: true,
    isReadOnly: true,
  },
}

const fallbackRole: RoleMeta = {
  label: 'Company user',
  description: 'Workspace member with permissions managed by a company admin.',
  permissionSummary: 'Workspace access is active. Specific permissions are configured by role.',
  marketScope: 'Company workspace',
  canInvite: false,
  canManageBudget: false,
  canCreateCampaign: false,
  canViewAnalytics: true,
  isReadOnly: true,
}

export function getRoleMeta(role?: string | null): RoleMeta {
  if (!role) return fallbackRole
  return roleMetadata[role] ?? {
    ...fallbackRole,
    label: humanizeRole(role),
  }
}

export function humanizeRole(role?: string | null): string {
  if (!role) return fallbackRole.label
  return role
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

export function roleOptions() {
  return Object.entries(roleMetadata).map(([value, meta]) => ({
    value,
    label: meta.label,
    description: meta.description,
  }))
}
