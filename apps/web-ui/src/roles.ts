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
    description: 'Owns the tenant, team access, role assignment, and user credit allocations.',
    permissionSummary: 'Full workspace control: campaigns, audiences, content, analytics, invites, and budgets.',
    marketScope: 'All company markets and segments',
    canInvite: true,
    canManageBudget: true,
    canCreateCampaign: true,
    canViewAnalytics: true,
    isReadOnly: false,
  },
  campaign_manager: {
    label: 'Campaign manager',
    description: 'Builds and schedules campaigns using the budget assigned by an admin.',
    permissionSummary: 'Can create campaigns, manage content, and view performance. Cannot invite users or change budgets.',
    marketScope: 'Assigned campaign segments',
    canInvite: false,
    canManageBudget: false,
    canCreateCampaign: true,
    canViewAnalytics: true,
    isReadOnly: false,
  },
  regional_manager: {
    label: 'Regional manager',
    description: 'Owns a market segment and campaigns against that allocated regional budget.',
    permissionSummary: 'Can create campaigns for assigned market lists and view regional performance.',
    marketScope: 'Assigned regional market and customer lists',
    canInvite: false,
    canManageBudget: false,
    canCreateCampaign: true,
    canViewAnalytics: true,
    isReadOnly: false,
  },
  analyst: {
    label: 'Analyst',
    description: 'Reviews campaign, audience, and quota reporting without changing operational data.',
    permissionSummary: 'Reporting-only access to dashboards, subscriber samples, campaign history, and analytics.',
    marketScope: 'Reporting across assigned company data',
    canInvite: false,
    canManageBudget: false,
    canCreateCampaign: false,
    canViewAnalytics: true,
    isReadOnly: true,
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only workspace access for stakeholders who need status visibility.',
    permissionSummary: 'Read-only visibility. Campaign, invite, budget, subscriber, and content changes are disabled.',
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
