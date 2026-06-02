const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export class ApiClientError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

export const API_BASE_URL = window.__APP_CONFIG__?.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL ?? '/api'

export const API_UNAVAILABLE_MESSAGE =
  'Campaign API is not connected for this static portfolio host. Start an approved demo environment or use the local demo stack for API-backed workflows.'

export const PUBLIC_DESIGN_ROUTES_ENABLED =
  import.meta.env.DEV ||
  window.__APP_CONFIG__?.enableDesignRoutes === true ||
  import.meta.env.VITE_ENABLE_PUBLIC_DESIGN_ROUTES === 'true'

const isLocalHost = LOCAL_HOSTS.has(window.location.hostname)

export const OBSERVABILITY_LINKS = {
  grafana:
    window.__APP_CONFIG__?.grafanaUrl ?? import.meta.env.VITE_GRAFANA_URL ?? (isLocalHost ? 'http://127.0.0.1:3000' : ''),
  tempo:
    window.__APP_CONFIG__?.tempoUrl ?? import.meta.env.VITE_TEMPO_URL ?? (isLocalHost ? 'http://127.0.0.1:3000/explore' : ''),
  prometheus:
    window.__APP_CONFIG__?.prometheusUrl ?? import.meta.env.VITE_PROMETHEUS_URL ?? (isLocalHost ? 'http://127.0.0.1:9090' : ''),
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message
  return fallback
}

export async function readApiJson<T>(response: Response): Promise<T> {
  const contentType = response.headers?.get?.('content-type')?.toLowerCase() ?? ''
  if (contentType && !contentType.includes('application/json')) {
    throw new ApiClientError(API_UNAVAILABLE_MESSAGE, response.status)
  }
  return (await response.json()) as T
}

export function apiStatusDetail(response: Response, path: string): string {
  const contentType = response.headers?.get?.('content-type')?.toLowerCase() ?? ''
  if (response.ok && contentType.includes('text/html')) return API_UNAVAILABLE_MESSAGE
  if (!response.ok) return `${response.status} ${response.statusText}`
  return `${path} responded ${response.status}`
}
