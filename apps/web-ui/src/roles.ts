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
    description: 'Campaigns, media, reporting, team access, and limits.',
    permissionSummary: 'Campaigns / media / reporting / team access / limits',
    marketScope: 'All company markets and segments',
    canInvite: true,
    canManageBudget: true,
    canCreateCampaign: true,
    canViewAnalytics: true,
    isReadOnly: false,
  },
  campaign_manager: {
    label: 'Campaign manager',
    description: 'Builds, schedules, and monitors campaigns inside budget.',
    permissionSummary: 'Campaigns / media / performance',
    marketScope: 'Assigned campaign segments',
    canInvite: false,
    canManageBudget: false,
    canCreateCampaign: true,
    canViewAnalytics: true,
    isReadOnly: false,
  },
  regional_manager: {
    label: 'Regional manager',
    description: 'Runs campaigns for assigned regional lists.',
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
    description: 'Reads campaign, audience, quota, and analytics data.',
    permissionSummary: 'Reporting / history / analytics',
    marketScope: 'Reporting across assigned company data',
    canInvite: false,
    canManageBudget: false,
    canCreateCampaign: false,
    canViewAnalytics: true,
    isReadOnly: true,
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only workspace status.',
    permissionSummary: 'Read-only status',
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
  description: 'Role managed by a company admin.',
  permissionSummary: 'Workspace access',
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
