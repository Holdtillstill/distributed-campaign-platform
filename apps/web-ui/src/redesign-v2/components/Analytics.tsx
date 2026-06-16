import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MetricCard, PageHeader, Panel, StatusChip } from "./ui-primitives";
import { compactNumber, formatNumber, useV2Data } from "../mockData";

const monthly = [
  { month: "Jan", reach: 2100000, sample: 850, credits: 2100, clicks: 38200, redemptions: 6800 },
  { month: "Feb", reach: 1950000, sample: 780, credits: 1950, clicks: 35100, redemptions: 6200 },
  { month: "Mar", reach: 2300000, sample: 920, credits: 2300, clicks: 41800, redemptions: 7400 },
  { month: "Apr", reach: 2450000, sample: 940, credits: 2450, clicks: 44200, redemptions: 7900 },
  { month: "May", reach: 2600000, sample: 930, credits: 2640, clicks: 40500, redemptions: 7200 },
  { month: "Jun", reach: 2650000, sample: 950, credits: 2250, clicks: 41820, redemptions: 7405 },
];

const axisStyle = { fontSize: 11, fill: "rgba(255,255,255,0.3)" };
const gridStyle = { stroke: "rgba(255,255,255,0.04)" };

const TT = ({ active, payload, label }: any) => active && payload?.length ? (
  <div className="rounded-lg p-2.5 shadow-xl text-[12px]"
    style={{ background: "#1A1C28", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.9)" }}>
    <p className="font-bold mb-1">{label}</p>
    {payload.map((p: any) => <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value?.toLocaleString()}</p>)}
  </div>
) : null;

export function Analytics() {
  const { campaigns, subscriberLists, activeTenant } = useV2Data();
  const totalSubscribers = subscriberLists.find((list) => list.name === "All Subscribers")?.count ?? Number.MAX_SAFE_INTEGER;
  const scheduledReach = Math.min(
    campaigns
      .filter((campaign) => campaign.status === "scheduled" || campaign.status === "queued")
      .reduce((total, campaign) => total + campaign.reach, 0),
    totalSubscribers,
  );
  const activeLists = subscriberLists.filter((list) => list.name !== "All Subscribers").length;
  const messagesSentThisMonth = activeTenant.messages;
  const monthlyLimit = activeTenant.monthlyLimit;
  const clickTotal = activeTenant.clicks;
  const redemptionTotal = Math.round(activeTenant.clicks * 0.18);
  const campaignRows = campaigns.map((campaign) => {
    const hasPerformance = campaign.status === "sent";
    const clicks = hasPerformance ? Math.round(campaign.reach * 0.022) : null;
    const redemptions = hasPerformance ? Math.round((clicks ?? 0) * 0.18) : null;
    return {
      ...campaign,
      clicks: clicks === null ? "-" : formatNumber(clicks),
      redemptions: redemptions === null ? "-" : formatNumber(redemptions),
    };
  });

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--background)" }}>
      <PageHeader title="Analytics" description="Campaign performance and subscriber engagement"
        action={
          <select aria-label="Analytics date range" className="h-7 rounded border px-2 text-[12px] focus:outline-none"
            style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }}>
            <option>Last 6 months</option><option>Last 3 months</option><option>This month</option>
          </select>
        }
      />
      <div className="flex-1 p-5 space-y-5 max-w-[1300px] mx-auto w-full">

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <MetricCard label="Scheduled reach" value={compactNumber(scheduledReach)} sub="Next 30 days" />
          <MetricCard label="Campaigns" value={String(campaigns.length)} sub="Last 6 months" />
          <MetricCard label="Messages sent" value={formatNumber(messagesSentThisMonth)} />
          <MetricCard label="Lists" value={String(activeLists)} sub="Active" />
          <MetricCard label="Clicks" value={formatNumber(clickTotal)} trend={{ dir: "up", label: "+3.3%" }} accent />
          <MetricCard label="Redemptions" value={formatNumber(redemptionTotal)} trend={{ dir: "up", label: "+2.8%" }} />
          <MetricCard label="Quota used" value={`${((messagesSentThisMonth / monthlyLimit) * 100).toFixed(2)}%`} sub={`${formatNumber(messagesSentThisMonth)} / ${compactNumber(monthlyLimit)}`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Modeled reach — 6 months">
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0FEBA8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0FEBA8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
                <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip content={<TT />} />
                <Area type="monotone" dataKey="reach" stroke="#0FEBA8" strokeWidth={2} fill="url(#rg)" name="Reach" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Clicks & redemptions">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
                <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<TT />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px", color: "rgba(255,255,255,0.5)" }} />
                <Bar dataKey="clicks" fill="#60A5FA" name="Clicks" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="redemptions" fill="#34D399" name="Redemptions" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Credit usage per month">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
                <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                <Tooltip content={<TT />} />
                <Bar dataKey="credits" fill="#A78BFA" name="Credits used" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Sample message volume">
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
                <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                <Tooltip content={<TT />} />
                <Area type="monotone" dataKey="sample" stroke="#FBBF24" strokeWidth={2} fill="url(#sg)" name="Sample msgs" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* Campaign table */}
        <Panel title="Campaign analytics" noPad>
          <div className="overflow-x-auto" tabIndex={0}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Campaign", "Status", "Reach", "Sample", "Credits", "Follow-ups", "Clicks", "Redemptions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                      style={{ color: "var(--muted-foreground)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaignRows.map((c) => (
                  <tr key={c.name} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td className="px-4 py-3 font-semibold max-w-[220px] truncate text-[13px]" style={{ color: "var(--foreground)" }}>{c.name}</td>
                    <td className="px-4 py-3"><StatusChip status={c.status} /></td>
                    <td className="px-4 py-3 text-right font-mono text-[12px]" style={{ color: "var(--foreground)" }}>{formatNumber(c.reach)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[12px]" style={{ color: "var(--foreground)" }}>{formatNumber(c.sample)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[12px]" style={{ color: "var(--foreground)" }}>{formatNumber(c.credits)}</td>
                    <td className="px-4 py-3 text-right text-[13px]" style={{ color: "var(--foreground)" }}>{c.reminders || "-"}</td>
                    <td className="px-4 py-3 text-right font-mono text-[12px]" style={{ color: "#60A5FA" }}>{c.clicks}</td>
                    <td className="px-4 py-3 text-right font-mono text-[12px]" style={{ color: "#34D399" }}>{c.redemptions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
