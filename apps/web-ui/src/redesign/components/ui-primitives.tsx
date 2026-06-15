import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export { Button, Badge };

// ─── Status chip ────────────────────────────────────────────────────────────
export type StatusType = "scheduled" | "queued" | "sent" | "failed" | "cancelled" | "live" | "active" | "draft";

const statusCfg: Record<StatusType, { label: string; cls: string; pulse?: boolean }> = {
  scheduled: { label: "Scheduled", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  queued:    { label: "Queued",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
  sent:      { label: "Sent",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed:    { label: "Failed",    cls: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-500 border-gray-200" },
  live:      { label: "Live",      cls: "bg-teal-50 text-teal-700 border-teal-200", pulse: true },
  active:    { label: "Active",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  draft:     { label: "Draft",     cls: "bg-gray-100 text-gray-600 border-gray-200" },
};

export function StatusChip({ status, className }: { status: StatusType; className?: string }) {
  const c = statusCfg[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium tracking-wide uppercase", c.cls, className)}>
      {c.pulse && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />}
      {c.label}
    </span>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────
export function MetricCard({ label, value, sub, trend, accent }: {
  label: string; value: string; sub?: string;
  trend?: { dir: "up" | "down" | "neutral"; label: string }; accent?: boolean;
}) {
  return (
    <div className={cn("bg-white border border-border rounded-md p-4", accent && "border-teal-200 bg-teal-50/40")}>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={cn("text-[22px] font-semibold tabular-nums leading-tight", accent ? "text-teal-700" : "text-foreground")}>{value}</p>
      {sub && <p className="text-[12px] text-muted-foreground mt-0.5">{sub}</p>}
      {trend && (
        <p className={cn("text-[11px] mt-1 font-medium",
          trend.dir === "up" ? "text-emerald-600" : trend.dir === "down" ? "text-red-500" : "text-muted-foreground")}>
          {trend.dir === "up" ? "↑" : trend.dir === "down" ? "↓" : "—"} {trend.label}
        </p>
      )}
    </div>
  );
}

// ─── Quota meter ─────────────────────────────────────────────────────────────
export function QuotaMeter({ label, used, total, warnAt = 0.8 }: {
  label: string; used: number; total: number; warnAt?: number;
}) {
  const pct = total > 0 ? Math.min(used / total, 1) : 0;
  const isWarn = pct >= warnAt && pct < 0.95;
  const isDanger = pct >= 0.95;
  const barColor = isDanger ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-teal-500";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">{used.toLocaleString()} / {total.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="flex justify-between text-[11px]">
        <span className={cn("font-medium", isDanger ? "text-red-600" : isWarn ? "text-amber-600" : "text-muted-foreground")}>
          {Math.round(pct * 100)}% used
        </span>
        <span className="text-muted-foreground">{(total - used).toLocaleString()} remaining</span>
      </div>
    </div>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────
export function PageHeader({ title, description, action, breadcrumb }: {
  title: string; description?: string; action?: React.ReactNode; breadcrumb?: string;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white shrink-0">
      <div>
        {breadcrumb && <p className="text-[11px] text-muted-foreground mb-0.5 uppercase tracking-wider">{breadcrumb}</p>}
        <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>
        {description && <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

// ─── Role/budget strip ────────────────────────────────────────────────────────
export function RoleBudgetStrip({ role, company, scope, budget }: {
  role: string; company: string; scope: string; budget: string;
}) {
  return (
    <div className="flex items-center gap-3 px-6 py-2 bg-white border-b border-border text-[12px] shrink-0">
      <span className="font-medium text-foreground">{company}</span>
      <span className="text-border/80">·</span>
      <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded text-[11px] font-medium">{role}</span>
      <span className="text-muted-foreground">{scope}</span>
      <span className="ml-auto text-muted-foreground">Budget: <span className="font-medium text-foreground">{budget}</span></span>
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────
export function Panel({ children, className, title, action }: {
  children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode;
}) {
  return (
    <div className={cn("bg-white border border-border rounded-md", className)}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, description, action }: {
  title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
        {description && <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── Simple input ─────────────────────────────────────────────────────────────
export function SearchInput({ placeholder, value, onChange, className }: {
  placeholder?: string; value?: string; onChange?: (v: string) => void; className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-8 w-full rounded border border-border bg-white text-[13px] text-foreground placeholder:text-muted-foreground pl-8 pr-3 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
      />
    </div>
  );
}

// ─── Data table ───────────────────────────────────────────────────────────────
export function DataTable({ columns, rows, emptyMessage = "No data" }: {
  columns: { key: string; label: string; align?: "left" | "right" | "center"; mono?: boolean }[];
  rows: Record<string, React.ReactNode>[];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={col.key} className={cn(
                "px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap",
                col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
              )}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">{emptyMessage}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-gray-50/80 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className={cn(
                  "px-3 py-2.5",
                  col.align === "right" ? "text-right tabular-nums" : col.align === "center" ? "text-center" : "",
                  col.mono ? "font-mono text-[12px]" : ""
                )}>{row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
