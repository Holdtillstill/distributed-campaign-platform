import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { MetricCard, PageHeader, Panel, QuotaMeter } from "./ui-primitives";

const tenants = [
  { name: "Demo Retail Co",   slug: "demo-retail",     subs: "2,650,000", campaigns: 3, reach: "4,490,000", credits: "4,797,750", limit: "4,800,000", quota: 0.05,  code: "DMRT-A4F2-K8X1", health: "good" as const },
  { name: "Pacific Grocery",  slug: "pacific-grocery", subs: "1,230,000", campaigns: 2, reach: "2,100,000", credits: "1,850,000", limit: "2,000,000", quota: 7.5,   code: "PCGR-X1B2-N3M4", health: "warn" as const },
  { name: "Northwest Fitness",slug: "nw-fitness",      subs: "84,000",    campaigns: 1, reach: "84,000",    credits: "190,000",   limit: "200,000",   quota: 5.0,   code: "NWFT-K3Y7-P8Q2", health: "good" as const },
  { name: "Coastal Brands",   slug: "coastal-brands",  subs: "420,000",   campaigns: 4, reach: "1,200,000", credits: "48,000",    limit: "500,000",   quota: 90.4,  code: "CSBL-V5W8-R1T6", health: "danger" as const },
  { name: "Urban Eats",       slug: "urban-eats",      subs: "210,000",   campaigns: 0, reach: "0",          credits: "320,000",   limit: "350,000",   quota: 8.6,   code: "URBT-J2H9-E4F3", health: "good" as const },
];

const sysCx = [
  { label: "API liveness",       status: "ok",   ep: "/health/live" },
  { label: "API readiness",      status: "ok",   ep: "/health/ready" },
  { label: "Prometheus metrics", status: "ok",   ep: "/metrics" },
  { label: "Trace smoke",        status: "warn", ep: "/trace/smoke" },
];

export function AdminDashboard() {
  return (
    <div className="flex flex-col min-h-full bg-background">
      <PageHeader title="Internal Admin Dashboard" breadcrumb="Admin Console"
        description="Platform operator console — tenant health, quota, and system status"
        action={<div className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />All systems operational</div>}
      />
      <div className="flex-1 p-5 space-y-4 max-w-[1400px] mx-auto w-full">

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard label="Active companies" value="5" sub="1 alert" />
          <MetricCard label="Subscribers" value="4.59M" sub="All tenants" />
          <MetricCard label="Messages this month" value="28,420" />
          <MetricCard label="Scheduled reach" value="7.87M" sub="Next 30 days" accent />
          <MetricCard label="Credits remaining" value="7.23M" sub="Aggregate" />
          <MetricCard label="Active access codes" value="12" sub="3 expiring soon" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tenant table */}
          <div className="lg:col-span-2">
            <Panel title="Tenant health" action={
              <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"><RefreshCw size={11} /> Refresh</button>
            }>
              <div className="-mx-4 -mb-4 overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["Company", "Subs", "Camp.", "Sched. reach", "Credits", "Limit", "Quota", "Access code", ""].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => (
                      <tr key={t.slug} className="border-b border-border/50 hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-foreground">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{t.slug}</p>
                        </td>
                        <td className="px-3 py-2.5 font-mono">{t.subs}</td>
                        <td className="px-3 py-2.5 text-center">{t.campaigns}</td>
                        <td className="px-3 py-2.5 font-mono">{t.reach}</td>
                        <td className="px-3 py-2.5 font-mono">{t.credits}</td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">{t.limit}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${t.quota >= 80 ? "bg-red-500" : t.quota >= 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                                style={{ width: `${Math.min(t.quota, 100)}%` }} />
                            </div>
                            <span className={`text-[11px] font-medium tabular-nums ${t.quota >= 80 ? "text-red-600" : t.quota >= 50 ? "text-amber-600" : "text-muted-foreground"}`}>{t.quota}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5"><code className="text-[10px] font-mono text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">{t.code}</code></td>
                        <td className="px-3 py-2.5">
                          {t.health === "good" ? <CheckCircle2 size={13} className="text-emerald-500" />
                            : t.health === "warn" ? <AlertTriangle size={13} className="text-amber-500" />
                            : <AlertTriangle size={13} className="text-red-500" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <Panel title="Quota alerts">
              <div className="space-y-3">
                <div className="p-3 rounded bg-red-50 border border-red-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={13} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[12px] font-semibold text-red-800">Coastal Brands — 90.4%</p>
                      <p className="text-[11px] text-red-600 mt-0.5">48,000 of 500,000 credits remaining.</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[12px] font-semibold text-amber-800">Pacific Grocery — 7.5%</p>
                      <p className="text-[11px] text-amber-600 mt-0.5">150,000 credits remaining.</p>
                    </div>
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground px-1">3 other tenants healthy · no alerts</p>
              </div>
            </Panel>

            <Panel title="System status">
              <div className="space-y-2.5">
                {sysCx.map((c) => (
                  <div key={c.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {c.status === "ok" ? <CheckCircle2 size={13} className="text-emerald-500" /> : <AlertTriangle size={13} className="text-amber-500" />}
                      <span className="text-[12px]">{c.label}</span>
                    </div>
                    <code className="text-[10px] text-muted-foreground font-mono">{c.ep}</code>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Observability</p>
                <div className="space-y-1.5">
                  {[["Grafana", "#"], ["Tempo traces", "#"], ["Prometheus", "#"]].map(([l, h]) => (
                    <a key={l} href={h} className="flex items-center gap-1.5 text-[12px] text-teal-600 hover:text-teal-800">
                      <ExternalLink size={11} /> {l}
                    </a>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel title="Ops queue">
              <div className="space-y-2">
                {[
                  { action: "Credit top-up request", tenant: "Coastal Brands", time: "2h ago", p: "high" },
                  { action: "New tenant onboarding",  tenant: "Metro Dining",   time: "4h ago", p: "normal" },
                  { action: "Access code renewal",    tenant: "Demo Retail Co", time: "1d ago", p: "low" },
                ].map((item) => (
                  <div key={item.action} className="flex items-start gap-2.5 p-2 rounded hover:bg-gray-50 transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${item.p === "high" ? "bg-red-500" : item.p === "normal" ? "bg-blue-500" : "bg-gray-400"}`} />
                    <div>
                      <p className="text-[12px] font-medium">{item.action}</p>
                      <p className="text-[11px] text-muted-foreground">{item.tenant} · {item.time}</p>
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
