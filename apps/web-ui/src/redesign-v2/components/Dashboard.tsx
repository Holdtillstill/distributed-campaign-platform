import { AlertCircle, ArrowRight, CheckCircle2, ChevronRight, MessageSquare, Send, Users, Zap, Clock } from "lucide-react";
import { Btn, MetricCard, Panel, QuotaMeter, RoleStrip, StatusChip } from "./ui-primitives";
import { compactNumber, formatNumber, useV2Data } from "../mockData";

export function Dashboard({ onNavigate }: { onNavigate: (k: string) => void }) {
  const { campaigns, subscriberLists, teamMembers, activeTenant, activeCompanyName, activeRoleLabel } = useV2Data();
  const totalSubscribers = subscriberLists.find((list) => list.name === "All Subscribers")?.count ?? 0;
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "scheduled" || campaign.status === "queued");
  const scheduledCampaigns = campaigns.filter((campaign) => campaign.status === "scheduled");
  const queuedCampaigns = campaigns.filter((campaign) => campaign.status === "queued");
  const scheduledReach = Math.min(
    activeCampaigns.reduce((total, campaign) => total + campaign.reach, 0),
    totalSubscribers || Number.MAX_SAFE_INTEGER,
  );
  const nextScheduled = scheduledCampaigns.slice().sort((a, b) => a.dateISO.localeCompare(b.dateISO))[0] ?? activeCampaigns[0];
  const liveCampaign = queuedCampaigns[0] ?? activeCampaigns[0];
  const monthlyLimit = activeTenant.monthlyLimit;
  const creditsRemaining = activeTenant.creditsRemaining;
  const messagesSentThisMonth = Math.max(0, monthlyLimit - creditsRemaining);
  const clicks = activeTenant.clicks;
  const clickRate = 4.9;
  const redemptions = 7405;
  const reminderOpps = 18340;
  const livePct = liveCampaign?.status === "queued" ? 35 : 0;
  const liveSent = liveCampaign ? Math.round(liveCampaign.sample * (livePct / 100)) : 0;
  const liveQueued = liveCampaign ? Math.max(liveCampaign.sample - liveSent, 0) : 0;

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--background)" }}>
      <RoleStrip role={activeRoleLabel} company={activeCompanyName} scope={`${activeCompanyName} only · All Markets`} />

      <div className="flex-1 p-5 space-y-5 max-w-[1300px] mx-auto w-full">

        {/* ── Command bar ─────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border p-5"
          style={{ background: "var(--card)", borderColor: "rgba(15,235,168,0.18)" }}>
          {/* subtle glow line at top */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent 0%, #0FEBA8 40%, #0FEBA8 60%, transparent 100%)", opacity: 0.6 }} />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(15,235,168,0.12)", border: "1px solid rgba(15,235,168,0.2)" }}>
                <Send size={18} style={{ color: "#0FEBA8" }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(15,235,168,0.7)" }}>
                  Next scheduled send
                </p>
                <p className="text-[17px] font-semibold tracking-tight truncate" style={{ color: "var(--foreground)" }}>
                  {nextScheduled?.name ?? "No campaign scheduled"}
                </p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{nextScheduled?.date ?? "Create a campaign to fill the schedule"}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded font-mono"
                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                    {formatNumber(nextScheduled?.reach ?? 0)} reach
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded font-mono"
                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                    {formatNumber(nextScheduled?.sample ?? 0)} sample msgs
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <StatusChip status={nextScheduled?.status ?? "scheduled"} />
              <button onClick={() => onNavigate("monitor")}
                className="flex items-center gap-1 text-[12px] font-semibold transition-opacity hover:opacity-70"
                style={{ color: "#0FEBA8" }}>
                Live monitor <ArrowRight size={12} />
              </button>
              <Btn variant="accent" size="sm" onClick={() => onNavigate("campaigns")}>View campaigns</Btn>
            </div>
          </div>
        </div>

        {/* ── KPI strip ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard label="Subscribers" value={compactNumber(totalSubscribers)} sub="All lists" trend={{ dir: "up", label: "+12.4% MoM" }} />
          <MetricCard label="Active campaigns" value={String(activeCampaigns.length)} sub={`${scheduledCampaigns.length} sched · ${queuedCampaigns.length} queued`} />
          <MetricCard label="Messages sent" value={formatNumber(messagesSentThisMonth)} sub="This month" />
          <MetricCard label="Credits remaining" value={formatNumber(creditsRemaining)} sub={`of ${formatNumber(monthlyLimit)}`} accent />
          <MetricCard label="Click rate" value={`${clickRate.toFixed(1)}%`} sub={`${formatNumber(clicks)} clicks`} trend={{ dir: "up", label: "+0.3%" }} />
        </div>

        {/* ── Main layout ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left — quota + reporting + campaigns */}
          <div className="lg:col-span-2 space-y-4">

            {/* Quota */}
            <Panel title="Monthly send quota" action={
              <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>Jun 2026</span>
            }>
              <QuotaMeter label="Messages sent" used={messagesSentThisMonth} total={monthlyLimit} />
              <div className="mt-4 grid grid-cols-3 gap-0 pt-4 text-center" style={{ borderTop: "1px solid var(--border)" }}>
                {[["Used", formatNumber(messagesSentThisMonth)], ["Scheduled reach", formatNumber(scheduledReach)], ["Monthly limit", formatNumber(monthlyLimit)]].map(([l, v]) => (
                  <div key={l} className="px-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: "var(--muted-foreground)" }}>{l}</p>
                    <p className="text-[16px] font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{v}</p>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Reporting */}
            <Panel title="Reporting summary" action={
              <button onClick={() => onNavigate("analytics")}
                className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-70"
                style={{ color: "#0FEBA8" }}>
                View analytics <ChevronRight size={11} />
              </button>
            }>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                {[
                  { label: "Clicks", value: formatNumber(clicks),  icon: Zap,           color: "#60A5FA" },
                  { label: "Redemptions", value: formatNumber(redemptions), icon: CheckCircle2, color: "#34D399" },
                  { label: "Sched. reach", value: compactNumber(scheduledReach), icon: Users,        color: "#0FEBA8" },
                  { label: "Reminder opps", value: formatNumber(reminderOpps), icon: Clock,        color: "#FBBF24" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                      style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
                      <Icon size={15} style={{ color }} />
                    </div>
                    <p className="text-[22px] font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{value}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</p>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Upcoming */}
            <Panel title="Upcoming campaigns" action={
              <Btn variant="ghost" size="xs" onClick={() => onNavigate("campaigns")}>View all</Btn>
            }>
              <div className="space-y-2">
                {activeCampaigns.slice(0, 5).map((c) => (
                  <div key={c.name}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                    style={{ border: "1px solid var(--border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)" }}>
                      <MessageSquare size={14} style={{ color: "#60A5FA" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: "var(--foreground)" }}>{c.name}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                        {c.date.split(", 2026")[0]} · {formatNumber(c.reach)} reach · {formatNumber(c.credits)} credits
                      </p>
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
            <div
              className="rounded-xl border p-4 cursor-pointer relative overflow-hidden"
              style={{ background: "#0A1A16", borderColor: "rgba(15,235,168,0.2)" }}
              onClick={() => onNavigate("monitor")}
            >
              <div className="absolute inset-0 opacity-20"
                style={{ background: "radial-gradient(circle at 70% 30%, rgba(15,235,168,0.15) 0%, transparent 60%)" }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(15,235,168,0.5)" }}>Broadcast Monitor</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "#0FEBA8" }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#0FEBA8" }} />Live
                  </span>
                </div>
                <p className="text-[12px] mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>{liveCampaign?.name ?? "No active broadcast"}</p>
                <div className="text-[52px] font-black leading-none tabular-nums mb-3" style={{ color: "#0FEBA8" }}>{livePct}%</div>
                <div className="h-1 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full"
                    style={{ width: `${livePct}%`, background: "#0FEBA8", boxShadow: "0 0 12px rgba(15,235,168,0.5)" }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  {[["Sent", formatNumber(liveSent), "#34D399"], ["Queued", formatNumber(liveQueued), "#FBBF24"], ["Failed", "0", "#F87171"]].map(([l, v, c]) => (
                    <div key={l}>
                      <p className="text-[18px] font-bold tabular-nums" style={{ color: c }}>{v}</p>
                      <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.28)" }}>{l}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>ETA: {liveCampaign ? "~14 min" : "n/a"}</span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#0FEBA8" }}>
                    Open <ArrowRight size={10} />
                  </span>
                </div>
              </div>
            </div>

            {/* Team */}
            <Panel title="Team access">
              <div className="space-y-3">
                {teamMembers.filter((member) => member.email !== activeTenant.admin).slice(0, 3).map((u) => (
                  <div key={u.email} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ background: `${u.rc}20`, color: u.rc, border: `1px solid ${u.rc}30` }}>
                      {u.name.split(" ").map((part) => part[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>{u.name}</p>
                      <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{u.role}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <Btn variant="outline" size="xs" onClick={() => onNavigate("settings")}>Manage team</Btn>
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
                      ? <CheckCircle2 size={13} style={{ color: "#34D399" }} />
                      : <AlertCircle size={13} style={{ color: "#FBBF24" }} />
                    }
                    <span className="text-[12px]"
                      style={{ color: item.ok ? "var(--foreground)" : "#FBBF24" }}>
                      {item.label}
                    </span>
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
