import type { Membership, Session, Surface } from '../types'

export const SESSION_KEY = 'campaign-platform-session'

export function loadStoredSession(): Session | null {
  try {
    const rawSession = window.localStorage.getItem(SESSION_KEY)
    if (!rawSession) return null
    const parsed = JSON.parse(rawSession) as Session
    if (parsed.role === 'internal_admin' || parsed.role === 'company_user') return parsed
  } catch {
    window.localStorage.removeItem(SESSION_KEY)
  }
  return null
}

export function surfaceFromLocation(): Surface {
  const host = window.location.hostname.toLowerCase()
  const path = window.location.pathname
  if (host.startsWith('admin.') || host.startsWith('ops.') || path.startsWith('/internal')) return 'internal'
  if (path.startsWith('/app')) return 'app'
  return 'marketing'
}

export function asMemberships(payload: unknown): Membership[] {
  if (Array.isArray(payload)) return payload as Membership[]
  if (payload && typeof payload === 'object' && 'memberships' in payload) {
    const memberships = (payload as { memberships?: unknown }).memberships
    return Array.isArray(memberships) ? (memberships as Membership[]) : []
  }
  return []
}
