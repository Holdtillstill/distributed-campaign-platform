import { useId } from "react";
import { cn } from "./ui/utils";

// ─── Status chip ─────────────────────────────────────────────────────────────
export type StatusType = "scheduled" | "queued" | "sent" | "failed" | "cancelled" | "live" | "active" | "draft";

const statusCfg: Record<StatusType, { label: string; style: React.CSSProperties; pulse?: boolean }> = {
  scheduled: { label: "Scheduled", style: { background: "rgba(96,165,250,0.1)",  color: "#93C5FD", borderColor: "rgba(96,165,250,0.22)"  } },
  queued:    { label: "Queued",    style: { background: "rgba(251,191,36,0.1)",  color: "#FCD34D", borderColor: "rgba(251,191,36,0.22)"  } },
  sent:      { label: "Sent",      style: { background: "rgba(52,211,153,0.1)",  color: "#6EE7B7", borderColor: "rgba(52,211,153,0.22)"  } },
  failed:    { label: "Failed",    style: { background: "rgba(248,113,113,0.1)", color: "#FCA5A5", borderColor: "rgba(248,113,113,0.22)" } },
  cancelled: { label: "Cancelled", style: { background: "rgba(107,114,128,0.08)",color: "#A1ABC2", borderColor: "rgba(107,114,128,0.18)" } },
  live:      { label: "Live",      style: { background: "rgba(15,235,168,0.1)",  color: "#0FEBA8", borderColor: "rgba(15,235,168,0.28)"  }, pulse: true },
  active:    { label: "Active",    style: { background: "rgba(52,211,153,0.1)",  color: "#6EE7B7", borderColor: "rgba(52,211,153,0.22)"  } },
  draft:     { label: "Draft",     style: { background: "rgba(107,114,128,0.08)",color: "#A1ABC2", borderColor: "rgba(107,114,128,0.18)" } },
};

export function StatusChip({ status, className }: { status: StatusType; className?: string }) {
  const c = statusCfg[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold tracking-widest uppercase", className)}
      style={c.style}
    >
      {c.pulse && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#0FEBA8" }} />}
      {c.label}
    </span>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────
export function MetricCard({ label, value, sub, trend, accent, wide }: {
  label: string; value: string; sub?: string;
  trend?: { dir: "up" | "down" | "neutral"; label: string };
  accent?: boolean; wide?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border p-4 flex flex-col gap-1 relative overflow-hidden",
      wide ? "col-span-2" : ""
    )}
      style={{
        background: accent ? "rgba(15,235,168,0.04)" : "var(--card)",
        borderColor: accent ? "rgba(15,235,168,0.2)" : "var(--border)",
      }}>
      {accent && (
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #0FEBA8, transparent)" }} />
      )}
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className={cn("text-[26px] font-bold tabular-nums leading-none tracking-tight")}
        style={{ color: accent ? "#0FEBA8" : "var(--foreground)" }}>
        {value}
      </p>
      {sub && <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{sub}</p>}
      {trend && (
        <p className={cn("text-[11px] font-semibold mt-0.5")}
          style={{ color: trend.dir === "up" ? "#34D399" : trend.dir === "down" ? "#F87171" : "var(--muted-foreground)" }}>
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
  const fillColor = isDanger ? "#F87171" : isWarn ? "#FBBF24" : "#0FEBA8";
  const glowColor = isDanger ? "rgba(248,113,113,0.3)" : isWarn ? "rgba(251,191,36,0.3)" : "rgba(15,235,168,0.3)";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium" style={{ color: "var(--foreground)" }}>{label}</span>
        <span className="text-[11px] tabular-nums" style={{ color: "var(--muted-foreground)" }}>
          {used.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct * 100}%`, background: fillColor, boxShadow: `0 0 8px ${glowColor}` }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[11px] font-medium" style={{ color: isDanger ? "#F87171" : isWarn ? "#FBBF24" : "var(--muted-foreground)" }}>
          {Math.round(pct * 100)}% used
        </span>
        <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          {(total - used).toLocaleString()} remaining
        </span>
      </div>
    </div>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────
export function PageHeader({ title, description, action, breadcrumb, border = true }: {
  title: string; description?: string; action?: React.ReactNode; breadcrumb?: string; border?: boolean;
}) {
  return (
    <div
      className={cn("flex items-center justify-between px-6 py-4 shrink-0", border && "border-b")}
      style={{ background: "var(--background)", borderColor: "var(--border)" }}
    >
      <div>
        {breadcrumb && (
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: "var(--muted-foreground)" }}>{breadcrumb}</p>
        )}
        <h1 className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>{title}</h1>
        {description && <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

// ─── Role strip ───────────────────────────────────────────────────────────────
export function RoleStrip({ role, company, scope }: { role: string; company: string; scope: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-2 border-b shrink-0 text-[11px]"
      style={{ background: "rgba(255,255,255,0.015)", borderColor: "var(--border)" }}>
      <span className="font-medium" style={{ color: "var(--foreground)" }}>{company}</span>
      <span style={{ color: "rgba(255,255,255,0.12)" }}>·</span>
      <span className="px-2 py-0.5 rounded font-semibold text-[10px] uppercase tracking-wider"
        style={{ background: "rgba(15,235,168,0.12)", color: "#0FEBA8", border: "1px solid rgba(15,235,168,0.22)" }}>
        {role}
      </span>
      <span style={{ color: "var(--muted-foreground)" }}>{scope}</span>
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────
export function Panel({ children, className, title, action, noPad }: {
  children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode; noPad?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border", className)} style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>{title}</span>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={noPad ? "" : "p-4"}>{children}</div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>{title}</p>
      {action}
    </div>
  );
}

// ─── Btn ────────────────────────────────────────────────────────────────────
export function Btn({ children, variant = "primary", size = "sm", onClick, className, disabled }: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline" | "accent";
  size?: "xs" | "sm" | "md";
  onClick?: () => void; className?: string; disabled?: boolean;
}) {
  const sizes = {
    xs: "px-2 py-1 text-[11px] h-6",
    sm: "px-3 py-1.5 text-[12px] h-7",
    md: "px-4 py-2 text-[13px] h-9",
  };
  const variants: Record<string, React.CSSProperties> = {
    primary:     { background: "var(--foreground)", color: "var(--background)" },
    accent:      { background: "#0FEBA8", color: "#0C0D12" },
    secondary:   { background: "var(--secondary)", color: "var(--secondary-foreground)", border: "1px solid var(--border)" },
    ghost:       { background: "transparent", color: "var(--muted-foreground)" },
    outline:     { background: "transparent", color: "var(--foreground)", border: "1px solid var(--border)" },
    destructive: { background: "rgba(240,82,82,0.12)", color: "#F05252", border: "1px solid rgba(240,82,82,0.22)" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn("inline-flex items-center gap-1.5 font-semibold rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-80 shrink-0", sizes[size], className)}
      style={variants[variant]}
    >
      {children}
    </button>
  );
}

// ─── Search input ────────────────────────────────────────────────────────────
export function SearchInput({ placeholder, value, onChange, className }: {
  placeholder?: string; value?: string; onChange?: (v: string) => void; className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--muted-foreground)" }}>
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-7 w-full rounded border pl-8 pr-3 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0FEBA8]/30"
        style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }}
      />
    </div>
  );
}

// ─── Field ───────────────────────────────────────────────────────────────────
export function Field({ label, type = "text", placeholder, options, value, onChange }: {
  label: string; type?: string; placeholder?: string; options?: string[]; value?: string; onChange?: (v: string) => void;
}) {
  const id = useId();
  const cls = "w-full rounded border px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#0FEBA8]/30";
  const style: React.CSSProperties = { height: 32, background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" };
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{label}</label>
      {type === "select" ? (
        <select id={id} className={cls} style={style} value={value} onChange={(e) => onChange?.(e.target.value)}>
          {options?.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea id={id} className={cls} placeholder={placeholder} rows={4}
          style={{ ...style, height: "auto", paddingTop: 8, paddingBottom: 8, resize: "none" }}
          onChange={(e) => onChange?.(e.target.value)} />
      ) : (
        <input id={id} type={type} placeholder={placeholder} className={cls} style={style}
          value={value} onChange={(e) => onChange?.(e.target.value)} />
      )}
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
    <div className="overflow-x-auto" tabIndex={0}>
      <table className="w-full min-w-[720px]">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {columns.map((col) => (
              <th key={col.key}
                className={cn("px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap",
                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left")}
                style={{ color: "var(--muted-foreground)" }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-3 py-10 text-center text-[13px]" style={{ color: "var(--muted-foreground)" }}>{emptyMessage}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} className="transition-colors"
              style={{ borderBottom: "1px solid var(--border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {columns.map((col) => (
                <td key={col.key}
                  className={cn("px-3 py-2.5 text-[13px]",
                    col.align === "right" ? "text-right tabular-nums" : col.align === "center" ? "text-center" : "",
                    col.mono ? "font-mono text-[12px]" : "")}
                  style={{ color: "var(--foreground)" }}>
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Inline select ────────────────────────────────────────────────────────────
export function InlineSelect({ value, onChange, options, className, ariaLabel }: {
  value?: string; onChange?: (v: string) => void; options: string[]; className?: string; ariaLabel?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn("h-7 rounded border px-2 text-[12px] focus:outline-none", className)}
      style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }}
    >
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}
