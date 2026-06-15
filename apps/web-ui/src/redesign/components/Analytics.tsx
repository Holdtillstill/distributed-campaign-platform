import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MetricCard, PageHeader, Panel, StatusChip } from "./ui-primitives";

const monthly = [
  { month: "Jan", reach: 2100000, sample: 850, credits: 2100, clicks: 38200, redemptions: 6800 },
  { month: "Feb", reach: 1950000, sample: 780, credits: 1950, clicks: 35100, redemptions: 6200 },
  { month: "Mar", reach: 2300000, sample: 920, credits: 2300, clicks: 41800, redemptions: 7400 },
  { month: "Apr", reach: 2450000, sample: 940, credits: 2450, clicks: 44200, redemptions: 7900 },
  { month: "May", reach: 2600000, sample: 930, credits: 2640, clicks: 40500, redemptions: 7200 },
  { month: "Jun", reach: 2650000, sample: 950, credits: 2250, clicks: 41820, redemptions: 7405 },
];

const campaigns = [
  { name: "Seattle VIP Double Points",  status: "scheduled" as const, reach: "2,650,000", sample: "950",  credits: "2,650", followups: 2, clicks: "41,820", redemptions: "7,405" },
  { name: "West Region Summer Preview", status: "scheduled" as const, reach: "1,840,000", sample: "820",  credits: "3,680", followups: 1, clicks: "—",      redemptions: "—" },
  { name: "Spring Clearance",           status: "queued"    as const, reach: "950",        sample: "950",  credits: "950",   followups: 0, clicks: "—",      redemptions: "—" },
  { name: "Mother's Day VIP Offer",     status: "sent"      as const, reach: "2,640,000", sample: "930",  credits: "2,640", followups: 3, clicks: "40,500", redemptions: "7,200" },
  { name: "Easter Flash Sale",          status: "sent"      as const, reach: "1,820,000", sample: "810",  credits: "3,640", followups: 2, clicks: "35,100", redemptions: "6,200" },
];

const TT = ({ active, payload, label }: any) => active && payload?.length ? (
  <div className="bg-white border border-border rounded-md p-2.5 shadow-md text-[12px]">
    <p className="font-medium mb-1">{label}</p>
    {payload.map((p: any) => <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value?.toLocaleString()}</p>)}
  </div>
) : null;

export function Analytics() {
  return (
    <div className="flex flex-col min-h-full bg-background">
      <PageHeader title="Analytics" description="Campaign performance and subscriber engagement"
        action={
          <select className="h-7 rounded border border-border bg-white text-[12px] px-2 focus:outline-none">
            <option>Last 6 months</option><option>Last 3 months</option><option>This month</option>
          </select>
        }
      />
      <div className="flex-1 p-5 space-y-5 max-w-[1280px] mx-auto w-full">

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <MetricCard label="Scheduled reach" value="4.49M" sub="Next 30 days" />
          <MetricCard label="Campaigns" value="7" sub="Last 6 months" />
          <MetricCard label="Messages sent" value="12,780" sub="Total" />
          <MetricCard label="Lists" value="3" sub="Active" />
          <MetricCard label="Clicks" value="41,820" sub="This month" trend={{ dir: "up", label: "+3.3%" }} accent />
          <MetricCard label="Redemptions" value="7,405" sub="This month" trend={{ dir: "up", label: "+2.8%" }} />
          <MetricCard label="Quota used" value="0.05%" sub="2,250 / 4.8M" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Modeled reach — 6 months">
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip content={<TT />} />
                <Area type="monotone" dataKey="reach" stroke="#0D9488" strokeWidth={1.5} fill="url(#rg)" name="Reach" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Clicks & redemptions">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<TT />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                <Bar dataKey="clicks" fill="#3B82F6" name="Clicks" radius={[2, 2, 0, 0]} />
                <Bar dataKey="redemptions" fill="#10B981" name="Redemptions" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Credit usage per month">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                <Tooltip content={<TT />} />
                <Bar dataKey="credits" fill="#8B5CF6" name="Credits used" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Sample message volume">
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                <Tooltip content={<TT />} />
                <Area type="monotone" dataKey="sample" stroke="#F59E0B" strokeWidth={1.5} fill="url(#sg)" name="Sample msgs" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* Campaign table */}
        <Panel title="Campaign analytics">
          <div className="-mx-4 -mb-4 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  {["Campaign", "Status", "Reach", "Sample", "Credits", "Follow-ups", "Clicks", "Redemptions"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.name} className="border-b border-border/50 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 font-medium max-w-[220px] truncate">{c.name}</td>
                    <td className="px-3 py-2.5"><StatusChip status={c.status} /></td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px]">{c.reach}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px]">{c.sample}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px]">{c.credits}</td>
                    <td className="px-3 py-2.5 text-right">{c.followups || "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] text-blue-700">{c.clicks}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] text-emerald-700">{c.redemptions}</td>
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
