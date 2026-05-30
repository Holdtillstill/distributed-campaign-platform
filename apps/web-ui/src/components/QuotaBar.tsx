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
  const rawPercentage = hasLimit ? (safeUsed / limit) * 100 : 0
  const percentage = hasLimit ? Math.min(100, Math.round(rawPercentage)) : 0
  const percentageLabel = hasLimit && safeUsed > 0 && percentage === 0 ? '<1% used' : `${percentage}% used`

  return (
    <div className="quota-card">
      <div className="quota-header">
        <strong>{label}</strong>
        <span>{hasLimit ? percentageLabel : 'Not configured'}</span>
      </div>
      <div
        className="quota-track"
        role="progressbar"
        aria-label={`${label} quota usage`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-valuetext={hasLimit ? percentageLabel : 'Not configured'}
      >
        <span style={{ width: `${Math.max(percentage, hasLimit && safeUsed > 0 ? 1 : 0)}%` }} />
      </div>
      <p>{helper ?? (hasLimit ? `${safeUsed.toLocaleString()} of ${limit.toLocaleString()} credits used.` : 'Add a monthly send limit to enable quota tracking.')}</p>
    </div>
  )
}
