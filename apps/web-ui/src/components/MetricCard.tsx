export function MetricCard({
  label,
  value,
  trend,
  tone = 'neutral',
}: {
  label: string
  value: string
  trend?: string
  tone?: 'neutral' | 'good' | 'warning'
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {trend ? <small>{trend}</small> : null}
    </div>
  )
}
