export function QuotaBar({
  label,
  used,
  limit,
  helper,
}: {
  label: string
  used?: number | null
  limit?: number | null
  helper?: string
}) {
  const safeUsed = used ?? 0
  const hasLimit = limit !== null && limit !== undefined && limit > 0
  const percentage = hasLimit ? Math.min(100, Math.round((safeUsed / limit) * 100)) : 0

  return (
    <div className="quota-card">
      <div className="quota-header">
        <strong>{label}</strong>
        <span>{hasLimit ? `${percentage}% used` : 'Not configured'}</span>
      </div>
      <div className="quota-track" aria-label={`${label} quota usage`}>
        <span style={{ width: `${percentage}%` }} />
      </div>
      <p>{helper ?? (hasLimit ? `${safeUsed.toLocaleString()} of ${limit.toLocaleString()} credits used.` : 'Add a monthly send limit to enable quota tracking.')}</p>
    </div>
  )
}
