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
