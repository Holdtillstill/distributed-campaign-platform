import { useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { compactNumber, formatNumber, useV2Data } from "../mockData";
import { MetricCard, PageHeader, Panel } from "./ui-primitives";

const sysCks = [
  { label: "API liveness",       status: "ok",   ep: "/health/live" },
  { label: "API readiness",      status: "ok",   ep: "/health/ready" },
  { label: "Prometheus metrics", status: "ok",   ep: "/metrics" },
  { label: "Trace smoke",        status: "warn", ep: "/trace/smoke" },
];

const observabilityLinks = [
  { label: "Grafana", href: "http://127.0.0.1:3000", detail: "Dashboards" },
  { label: "Tempo traces", href: "http://127.0.0.1:3000/explore", detail: "Trace explorer" },
  { label: "Prometheus", href: "http://127.0.0.1:9090", detail: "Metrics UI" },
];

export function AdminDashboard() {
  const { platformTenants, accessCodes } = useV2Data();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("just now");
  const tenantRows = platformTenants.map((tenant) => {
    const quota = tenant.monthlyLimit > 0 ? ((tenant.monthlyLimit - tenant.creditsRemaining) / tenant.monthlyLimit) * 100 : 0;
    const health = tenant.status === "suspended" ? "danger" : quota >= 80 ? "danger" : quota >= 50 ? "warn" : "good";
    return { ...tenant, quota, health };
  });
  const activeTenants = tenantRows.filter((tenant) => tenant.status === "active");
  const alertTenants = tenantRows.filter((tenant) => tenant.health !== "good");
  const totalSubscribers = tenantRows.reduce((total, tenant) => total + tenant.subscribers, 0);
  const totalMessages = tenantRows.reduce((total, tenant) => total + tenant.messages, 0);
  const totalScheduledReach = tenantRows.reduce((total, tenant) => total + tenant.scheduledReach, 0);
  const totalCredits = tenantRows.reduce((total, tenant) => total + tenant.creditsRemaining, 0);
  const activeAccessCodes = accessCodes.length + tenantRows.filter((tenant) => tenant.status === "active").length;
  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setLastRefreshed("moments ago");
    }, 700);
  };

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--background)" }}>
      <PageHeader title="Internal Admin Dashboard" breadcrumb="Admin Console"
        description="Platform operator console — tenant health, quota, and system status"
        action={
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#34D399" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34D399" }} />
            All systems operational
          </div>
        }
      />
      <div className="flex-1 p-5 space-y-4 max-w-[1400px] mx-auto w-full">

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard label="Active companies" value={String(activeTenants.length)} sub={`${alertTenants.length} alert${alertTenants.length === 1 ? "" : "s"}`} />
          <MetricCard label="Subscribers" value={compactNumber(totalSubscribers)} sub="All tenants" />
          <MetricCard label="Messages this month" value={formatNumber(totalMessages)} />
          <MetricCard label="Scheduled reach" value={compactNumber(totalScheduledReach)} accent />
          <MetricCard label="Credits remaining" value={compactNumber(totalCredits)} />
          <MetricCard label="Active access codes" value={String(activeAccessCodes)} sub={`${accessCodes.length} user invite codes`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tenant table */}
          <div className="lg:col-span-2">
            <Panel title="Tenant health" noPad action={
              <button onClick={refresh} className="flex items-center gap-1 text-[11px] transition-opacity hover:opacity-70"
                style={{ color: "var(--muted-foreground)" }}>
                <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Refreshing..." : `Refresh · ${lastRefreshed}`}
              </button>
            }>
              <div className="overflow-x-auto" tabIndex={0}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Company", "Subscribers", "Campaigns", "Reach", "Credits", "Limit", "Quota", "Access code", ""].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                          style={{ color: "var(--muted-foreground)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tenantRows.map((t) => {
                      const qc = t.quota >= 80 || t.status === "suspended" ? "#F87171" : t.quota >= 50 ? "#FBBF24" : "#34D399";
                      return (
                        <tr key={t.slug} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                          <td className="px-3 py-2.5">
                            <p className="font-semibold text-[13px]" style={{ color: "var(--foreground)" }}>{t.name}</p>
                            <p className="text-[10px] font-mono" style={{ color: "var(--muted-foreground)" }}>{t.slug}</p>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[12px]" style={{ color: "var(--foreground)" }}>{formatNumber(t.subscribers)}</td>
                          <td className="px-3 py-2.5 text-center text-[13px]" style={{ color: "var(--foreground)" }}>{t.campaigns}</td>
                          <td className="px-3 py-2.5 font-mono text-[12px]" style={{ color: "var(--foreground)" }}>{formatNumber(t.scheduledReach)}</td>
                          <td className="px-3 py-2.5 font-mono text-[12px]" style={{ color: "#0FEBA8" }}>{formatNumber(t.creditsRemaining)}</td>
                          <td className="px-3 py-2.5 font-mono text-[12px]" style={{ color: "var(--muted-foreground)" }}>{formatNumber(t.monthlyLimit)}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.min(t.quota, 100)}%`, background: qc, boxShadow: `0 0 6px ${qc}60` }} />
                              </div>
                              <span className="text-[11px] font-bold tabular-nums" style={{ color: qc }}>{t.quota.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <code className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(255,255,255,0.04)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                              {t.accessCode}
                            </code>
                          </td>
                          <td className="px-3 py-2.5">
                            {t.health === "good" ? <CheckCircle2 size={14} style={{ color: "#34D399" }} />
                              : t.health === "warn" ? <AlertTriangle size={14} style={{ color: "#FBBF24" }} />
                              : <AlertTriangle size={14} style={{ color: "#F87171" }} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {/* Right col */}
          <div className="space-y-4">
            <Panel title="Quota alerts">
              <div className="space-y-3">
                {alertTenants.length === 0 && (
                  <p className="text-[12px] px-1" style={{ color: "var(--muted-foreground)" }}>All tenants are within quota thresholds.</p>
                )}
                {alertTenants.slice(0, 3).map((tenant) => {
                  const danger = tenant.health === "danger";
                  return (
                    <div key={tenant.slug} className="p-3 rounded-lg" style={{ background: danger ? "rgba(248,113,113,0.05)" : "rgba(251,191,36,0.05)", border: `1px solid ${danger ? "rgba(248,113,113,0.15)" : "rgba(251,191,36,0.15)"}` }}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={13} style={{ color: danger ? "#F87171" : "#FBBF24" }} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[12px] font-bold" style={{ color: danger ? "#FCA5A5" : "#FCD34D" }}>{tenant.name} - {tenant.quota.toFixed(1)}%</p>
                          <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{formatNumber(tenant.creditsRemaining)} of {formatNumber(tenant.monthlyLimit)} credits remaining.</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="text-[12px] px-1" style={{ color: "var(--muted-foreground)" }}>{tenantRows.length - alertTenants.length} other tenants healthy</p>
              </div>
            </Panel>

            <Panel title="System status">
              <div className="space-y-2.5">
                {sysCks.map((c) => (
                  <div key={c.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {c.status === "ok"
                        ? <CheckCircle2 size={13} style={{ color: "#34D399" }} />
                        : <AlertTriangle size={13} style={{ color: "#FBBF24" }} />}
                      <span className="text-[12px]" style={{ color: "var(--foreground)" }}>{c.label}</span>
                    </div>
                    <code className="text-[10px] font-mono" style={{ color: "var(--muted-foreground)" }}>{c.ep}</code>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted-foreground)" }}>Observability</p>
                {observabilityLinks.map((tool) => (
                  <a
                    key={tool.label}
                    href={tool.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-[12px] font-medium transition-colors"
                    style={{ color: "#0FEBA8", border: "1px solid transparent" }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = "rgba(15,235,168,0.06)";
                      event.currentTarget.style.borderColor = "rgba(15,235,168,0.16)";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = "transparent";
                      event.currentTarget.style.borderColor = "transparent";
                    }}
                    aria-label={`Open ${tool.label} at ${tool.href}`}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <ExternalLink size={11} className="shrink-0" />
                      <span>{tool.label}</span>
                    </span>
                    <span className="hidden text-[10px] font-mono sm:inline" style={{ color: "var(--muted-foreground)" }}>{tool.detail}</span>
                  </a>
                ))}
                <p className="px-2 pt-1 text-[10px] leading-4" style={{ color: "var(--muted-foreground)" }}>
                  Opens the local observability stack in a new tab when those services are running.
                </p>
              </div>
            </Panel>

            <Panel title="Ops queue">
              <div className="space-y-2">
                {[
                  { a: "Credit top-up request", t: "Coastal Brands", time: "2h ago", p: "#F87171" },
                  { a: "New tenant onboarding",  t: "Metro Dining",   time: "4h ago", p: "#60A5FA" },
                  { a: "Access code renewal",    t: "Demo Retail Co", time: "1d ago", p: "rgba(255,255,255,0.2)" },
                ].map((item) => (
                  <div key={item.a} className="flex items-start gap-2.5 p-2 rounded-lg transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: item.p }} />
                    <div>
                      <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>{item.a}</p>
                      <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{item.t} · {item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
