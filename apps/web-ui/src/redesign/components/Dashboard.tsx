import { AlertCircle, ArrowRight, CheckCircle2, ChevronRight, MessageSquare, Send, Zap, Clock, Users } from "lucide-react";
import { MetricCard, Panel, QuotaMeter, RoleBudgetStrip, SectionHeader, StatusChip, PageHeader, Button } from "./ui-primitives";

export function Dashboard({ onNavigate }: { onNavigate: (k: string) => void }) {
  return (
    <div className="flex flex-col min-h-full bg-background">
      <RoleBudgetStrip role="Customer Admin" company="Demo Retail Co" scope="All Markets" budget="Unlimited" />

      <div className="flex-1 p-5 space-y-5 max-w-[1280px] mx-auto w-full">

        {/* Command bar */}
        <div className="rounded-md p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4" style={{ background: "#111827" }}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded bg-teal-500/20 flex items-center justify-center shrink-0">
              <Send size={16} className="text-teal-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Next scheduled send</p>
              <p className="text-[15px] font-semibold text-white truncate">Seattle VIP Double Points</p>
              <p className="text-[12px] text-white/45 mt-0.5">Jun 15, 2026 · 10:00 AM · 2,650,000 modeled reach · 950 sample msgs</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <StatusChip status="scheduled" />
            <button onClick={() => onNavigate("monitor")} className="flex items-center gap-1 text-[12px] text-teal-400 hover:text-teal-300 font-medium">
              Monitor <ArrowRight size={12} />
            </button>
            <Button size="sm" onClick={() => onNavigate("campaigns")} className="text-[12px] bg-teal-600 hover:bg-teal-500 border-0">
              View campaigns
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard label="Subscribers" value="2.65M" sub="All lists" trend={{ dir: "up", label: "+12.4% MoM" }} />
          <MetricCard label="Active campaigns" value="3" sub="2 scheduled · 1 queued" />
          <MetricCard label="Messages sent" value="2,250" sub="This month" />
          <MetricCard label="Credits remaining" value="4,797,750" sub="of 4,800,000" accent />
          <MetricCard label="Click rate" value="4.9%" sub="41,820 total clicks" trend={{ dir: "up", label: "+0.3% vs last" }} />
        </div>

        {/* 2-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">

            {/* Quota */}
            <Panel title="Monthly send quota" action={<span className="text-[11px] text-muted-foreground">Jun 2026</span>}>
              <QuotaMeter label="Messages sent this month" used={2250} total={4800000} />
              <div className="mt-4 grid grid-cols-3 gap-3 pt-3 border-t border-border text-center">
                {[["Used", "2,250"], ["Scheduled reach", "2,650,000"], ["Monthly limit", "4,800,000"]].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-[11px] text-muted-foreground mb-0.5">{l}</p>
                    <p className="text-[15px] font-semibold tabular-nums">{v}</p>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Reporting */}
            <Panel title="Reporting summary" action={
              <button onClick={() => onNavigate("analytics")} className="text-[11px] text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                View analytics <ChevronRight size={11} />
              </button>
            }>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Clicks", value: "41,820", Icon: Zap, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Redemptions", value: "7,405", Icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Scheduled reach", value: "2.65M", Icon: Users, color: "text-teal-600", bg: "bg-teal-50" },
                  { label: "Reminder opps", value: "18,340", Icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                ].map(({ label, value, Icon, color, bg }) => (
                  <div key={label}>
                    <div className={`w-7 h-7 rounded ${bg} flex items-center justify-center mb-2`}><Icon size={14} className={color} /></div>
                    <p className="text-[20px] font-semibold tabular-nums">{value}</p>
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Upcoming campaigns */}
            <Panel title="Upcoming campaigns" action={
              <Button variant="ghost" size="sm" onClick={() => onNavigate("campaigns")} className="text-[12px] h-7">View all</Button>
            }>
              <div className="space-y-2">
                {[
                  { name: "Seattle VIP Double Points", status: "scheduled" as const, date: "Jun 15", reach: "2,650,000", credits: "2,650" },
                  { name: "West Region Summer Preview", status: "scheduled" as const, date: "Jun 18", reach: "1,840,000", credits: "3,680" },
                  { name: "Spring Clearance", status: "queued" as const, date: "Jun 14", reach: "950", credits: "950" },
                ].map((c) => (
                  <div key={c.name} className="flex items-center gap-3 p-2.5 rounded border border-border hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center shrink-0">
                      <MessageSquare size={13} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.date} · {c.reach} reach · {c.credits} credits</p>
                    </div>
                    <StatusChip status={c.status} />
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* Right col */}
          <div className="space-y-4">
            {/* Live monitor preview */}
            <div className="rounded-md border border-teal-900/40 p-4 cursor-pointer hover:border-teal-600/50 transition-colors" style={{ background: "#0D1117" }} onClick={() => onNavigate("monitor")}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-white/35 uppercase tracking-widest font-medium">Broadcast Monitor</span>
                <span className="flex items-center gap-1 text-[11px] text-teal-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />Live
                </span>
              </div>
              <p className="text-[12px] text-white/50 mb-2">Spring Clearance</p>
              <div className="text-[40px] font-bold text-teal-400 tabular-nums leading-none mb-2">35%</div>
              <div className="h-1.5 bg-white/8 rounded-full mb-3"><div className="h-full w-[35%] bg-teal-500 rounded-full" /></div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                {[["Sent", "330", "text-emerald-400"], ["Queued", "620", "text-amber-400"], ["Failed", "0", "text-red-400"]].map(([l, v, cls]) => (
                  <div key={l}><p className={`text-[16px] font-semibold tabular-nums ${cls}`}>{v}</p><p className="text-[10px] text-white/30">{l}</p></div>
                ))}
              </div>
              <div className="pt-2.5 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-white/30">ETA: ~14 min</span>
                <span className="text-[11px] text-teal-400 flex items-center gap-1">Open <ArrowRight size={10} /></span>
              </div>
            </div>

            {/* Team */}
            <Panel title="Team access">
              <div className="space-y-2.5">
                {[
                  { name: "Sarah K.", role: "Campaign Manager", init: "SK" },
                  { name: "Marcus T.", role: "Regional Manager", init: "MT" },
                  { name: "Alex R.", role: "Campaign Manager", init: "AR" },
                ].map((u) => (
                  <div key={u.init} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-600 shrink-0">{u.init}</div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-foreground">{u.name}</p>
                      <p className="text-[11px] text-muted-foreground">{u.role}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <Button variant="outline" size="sm" className="text-[12px] h-7" onClick={() => onNavigate("settings")}>Manage team</Button>
              </div>
            </Panel>

            {/* Compliance */}
            <Panel title="Compliance status">
              <div className="space-y-2">
                {[
                  { label: "Consent coverage", ok: true },
                  { label: "STOP suppression active", ok: true },
                  { label: "Quiet hours enforced", ok: true },
                  { label: "Sender ID configured", ok: true },
                  { label: "Opt-in page live", ok: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.ok
                      ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      : <AlertCircle size={13} className="text-amber-500 shrink-0" />}
                    <span className={`text-[12px] ${item.ok ? "text-foreground" : "text-amber-700"}`}>{item.label}</span>
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
