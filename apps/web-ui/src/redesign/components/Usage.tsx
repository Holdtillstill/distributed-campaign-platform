import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MetricCard, PageHeader, Panel, QuotaMeter } from "./ui-primitives";

const byCompany = [
  { company: "Demo Retail Co",    messages: 12780, media: 6,  links: 24, clicks: 41820, reminders: 8, quota: 0.27 },
  { company: "Pacific Grocery",   messages: 8240,  media: 4,  links: 18, clicks: 28400, reminders: 4, quota: 4.12 },
  { company: "Northwest Fitness", messages: 3110,  media: 2,  links: 9,  clicks: 10200, reminders: 2, quota: 1.56 },
  { company: "Coastal Brands",    messages: 2890,  media: 8,  links: 31, clicks: 9800,  reminders: 6, quota: 90.4 },
  { company: "Urban Eats",        messages: 1400,  media: 1,  links: 6,  clicks: 5100,  reminders: 1, quota: 0.4 },
];

const trend = [
  { month: "Jan", demos: 8200,  pacific: 5100, coastal: 1200, fitness: 1800, urban: 800 },
  { month: "Feb", demos: 9100,  pacific: 6200, coastal: 1600, fitness: 2100, urban: 900 },
  { month: "Mar", demos: 10400, pacific: 7300, coastal: 2100, fitness: 2400, urban: 1100 },
  { month: "Apr", demos: 11200, pacific: 7800, coastal: 2400, fitness: 2800, urban: 1200 },
  { month: "May", demos: 11900, pacific: 8100, coastal: 2700, fitness: 3000, urban: 1300 },
  { month: "Jun", demos: 12780, pacific: 8240, coastal: 2890, fitness: 3110, urban: 1400 },
];

export function Usage() {
  return (
    <div className="flex flex-col min-h-full bg-background">
      <PageHeader title="Usage" breadcrumb="Admin Console" description="Cross-tenant usage reporting and company health"
        action={
          <div className="flex items-center gap-2">
            <input type="date" defaultValue="2026-06-01" className="h-7 rounded border border-border bg-white text-[12px] px-2 focus:outline-none" />
            <span className="text-muted-foreground text-[12px]">→</span>
            <input type="date" defaultValue="2026-06-13" className="h-7 rounded border border-border bg-white text-[12px] px-2 focus:outline-none" />
          </div>
        }
      />

      <div className="flex-1 p-5 space-y-5 max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Top by volume" value="Demo Retail" sub="12,780 messages" accent />
          <MetricCard label="Scheduled reach (30d)" value="7.87M" sub="All tenants" />
          <MetricCard label="Highest quota usage" value="90.4%" sub="Coastal Brands" trend={{ dir: "down", label: "At risk" }} />
          <MetricCard label="Marketable subscribers" value="4.59M" sub="Opted-in, all tenants" />
        </div>

        <Panel title="Message volume by tenant — 6 month trend">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px", border: "1px solid #E5E7EB" }} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Bar dataKey="demos"   name="Demo Retail"    fill="#0D9488" radius={[0, 0, 0, 0]} stackId="a" />
              <Bar dataKey="pacific" name="Pacific Grocery" fill="#3B82F6" radius={[0, 0, 0, 0]} stackId="a" />
              <Bar dataKey="coastal" name="Coastal Brands"  fill="#EF4444" radius={[0, 0, 0, 0]} stackId="a" />
              <Bar dataKey="fitness" name="NW Fitness"      fill="#8B5CF6" radius={[0, 0, 0, 0]} stackId="a" />
              <Bar dataKey="urban"   name="Urban Eats"      fill="#F59E0B" radius={[2, 2, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Company usage breakdown">
          <div className="-mx-4 -mb-4 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  {["Company", "Messages", "Media", "Tracked links", "Clicks", "Reminders", "Quota usage"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byCompany.map((r) => (
                  <tr key={r.company} className="border-b border-border/50 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 font-medium">{r.company}</td>
                    <td className="px-3 py-2.5 font-mono text-[12px]">{r.messages.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-center">{r.media}</td>
                    <td className="px-3 py-2.5 text-center">{r.links}</td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-blue-700">{r.clicks.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-center">{r.reminders}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${r.quota >= 80 ? "bg-red-500" : r.quota >= 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(r.quota, 100)}%` }} />
                        </div>
                        <span className={`text-[11px] font-medium tabular-nums whitespace-nowrap ${r.quota >= 80 ? "text-red-600" : r.quota >= 50 ? "text-amber-600" : "text-muted-foreground"}`}>{r.quota}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-gray-50/60">
                  <td className="px-3 py-2.5 font-semibold">All tenants</td>
                  <td className="px-3 py-2.5 font-mono font-semibold">{byCompany.reduce((a, r) => a + r.messages, 0).toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-center font-semibold">{byCompany.reduce((a, r) => a + r.media, 0)}</td>
                  <td className="px-3 py-2.5 text-center font-semibold">{byCompany.reduce((a, r) => a + r.links, 0)}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-blue-700">{byCompany.reduce((a, r) => a + r.clicks, 0).toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-center font-semibold">{byCompany.reduce((a, r) => a + r.reminders, 0)}</td>
                  <td className="px-3 py-2.5">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>

        <Panel title="Company health — quota meters">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {byCompany.map((r) => (
              <div key={r.company}>
                <p className="text-[12px] font-semibold mb-2">{r.company}</p>
                <QuotaMeter label="Monthly usage" used={Math.round(r.quota * 10)} total={1000} warnAt={0.5} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
