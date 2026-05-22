export function formatNumber(value?: number | null, emptyLabel = 'Not configured'): string {
  if (value === null || value === undefined) return emptyLabel
  return new Intl.NumberFormat().format(value)
}

export function formatCount(value?: number | null): string {
  if (value === null || value === undefined) return '0'
  return new Intl.NumberFormat().format(value)
}

export function formatActivity(value?: number | null): string {
  if (value === null || value === undefined) return 'No data yet'
  return new Intl.NumberFormat().format(value)
}

export function formatLocalDateTime(value?: string | null): string {
  if (!value) return 'Immediate'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}
