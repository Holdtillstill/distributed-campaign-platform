import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { compactNumber, formatNumber, useV2Data } from "../mockData";
import { MetricCard, PageHeader, Panel, QuotaMeter } from "./ui-primitives";

const TT = ({ active, payload, label }: any) => active && payload?.length ? (
  <div className="rounded-lg p-2.5 shadow-xl text-[12px]"
    style={{ background: "#1A1C28", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.9)" }}>
    <p className="font-bold mb-1">{label}</p>
    {payload.map((p: any) => <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value?.toLocaleString()}</p>)}
  </div>
) : null;

const axisStyle = { fontSize: 11, fill: "rgba(255,255,255,0.3)" };
const gridStyle = { stroke: "rgba(255,255,255,0.04)" };
const trendMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const trendMultipliers = [0.64, 0.71, 0.81, 0.88, 0.94, 1];
const palette = ["#0FEBA8", "#60A5FA", "#F87171", "#A78BFA", "#FBBF24", "#34D399", "#C084FC"];

export function Usage() {
  const { platformTenants } = useV2Data();
  const [fromDate, setFromDate] = useState("2026-06-01");
  const [toDate, setToDate] = useState("2026-06-13");
  const tenantRows = platformTenants.map((tenant, index) => {
    const quota = tenant.monthlyLimit > 0 ? ((tenant.monthlyLimit - tenant.creditsRemaining) / tenant.monthlyLimit) * 100 : 0;
    const qc = tenant.status === "suspended" || quota >= 80 ? "#F87171" : quota >= 50 ? "#FBBF24" : "#34D399";
    return { ...tenant, quota, qc, color: palette[index % palette.length] };
  });
  const trend = trendMonths.map((month, index) => {
    const row: Record<string, string | number> = { month };
    tenantRows.forEach((tenant) => {
      row[tenant.slug] = Math.round(tenant.messages * trendMultipliers[index]);
    });
    return row;
  });
  const topByVolume = tenantRows.slice().sort((a, b) => b.messages - a.messages)[0];
  const highestQuota = tenantRows.slice().sort((a, b) => b.quota - a.quota)[0];
  const totalMessages = tenantRows.reduce((total, tenant) => total + tenant.messages, 0);
  const totalMedia = tenantRows.reduce((total, tenant) => total + tenant.media, 0);
  const totalLinks = tenantRows.reduce((total, tenant) => total + tenant.links, 0);
  const totalClicks = tenantRows.reduce((total, tenant) => total + tenant.clicks, 0);
  const totalReminders = tenantRows.reduce((total, tenant) => total + tenant.reminders, 0);
  const scheduledReach = tenantRows.reduce((total, tenant) => total + tenant.scheduledReach, 0);
  const marketableSubscribers = tenantRows.reduce((total, tenant) => total + tenant.subscribers, 0);

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--background)" }}>
      <PageHeader title="Platform Usage" breadcrumb="Admin Console" description="Cross-tenant usage reporting and company health"
        action={
          <div className="flex items-center gap-2">
            <input aria-label="Usage from date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="h-7 rounded border px-2 text-[12px] focus:outline-none"
              style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
            <span className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>to</span>
            <input aria-label="Usage to date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="h-7 rounded border px-2 text-[12px] focus:outline-none"
              style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
          </div>
        }
      />
      <div className="flex-1 p-5 space-y-5 max-w-[1400px] mx-auto w-full">

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Top by volume" value={topByVolume?.name.split(" ")[0] ?? "None"} sub={`${formatNumber(topByVolume?.messages ?? 0)} messages`} accent />
          <MetricCard label="Scheduled reach" value={compactNumber(scheduledReach)} sub={`${fromDate} to ${toDate}`} />
          <MetricCard label="Highest quota" value={`${(highestQuota?.quota ?? 0).toFixed(1)}%`} sub={highestQuota?.name ?? "No tenants"} trend={{ dir: (highestQuota?.quota ?? 0) >= 80 ? "down" : "neutral", label: (highestQuota?.quota ?? 0) >= 80 ? "At risk" : "Healthy" }} />
          <MetricCard label="Marketable subscribers" value={compactNumber(marketableSubscribers)} sub="Opted-in, all tenants" />
        </div>

        <Panel title="Message volume by tenant - 6 month trend">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
              <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<TT />} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px", color: "rgba(255,255,255,0.5)" }} />
              {tenantRows.slice(0, 7).map((tenant, index) => (
                <Bar key={tenant.slug} dataKey={tenant.slug} name={tenant.name} fill={tenant.color} radius={index === tenantRows.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]} stackId="a" isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Company usage breakdown" noPad>
          <div className="overflow-x-auto" tabIndex={0}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Company", "Messages", "Media", "Tracked links", "Clicks", "Reminders", "Quota usage"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                      style={{ color: "var(--muted-foreground)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenantRows.map((tenant) => (
                  <tr key={tenant.slug} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td className="px-4 py-3 font-semibold text-[13px]" style={{ color: "var(--foreground)" }}>{tenant.name}</td>
                    <td className="px-4 py-3 font-mono text-[12px]" style={{ color: "var(--foreground)" }}>{formatNumber(tenant.messages)}</td>
                    <td className="px-4 py-3 text-center text-[13px]" style={{ color: "var(--foreground)" }}>{tenant.media}</td>
                    <td className="px-4 py-3 text-center text-[13px]" style={{ color: "var(--foreground)" }}>{tenant.links}</td>
                    <td className="px-4 py-3 font-mono text-[12px]" style={{ color: "#60A5FA" }}>{formatNumber(tenant.clicks)}</td>
                    <td className="px-4 py-3 text-center text-[13px]" style={{ color: "var(--foreground)" }}>{tenant.reminders}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(tenant.quota, 100)}%`, background: tenant.qc, boxShadow: `0 0 6px ${tenant.qc}60` }} />
                        </div>
                        <span className="text-[11px] font-bold tabular-nums whitespace-nowrap" style={{ color: tenant.qc }}>{tenant.quota.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                  <td className="px-4 py-3 font-bold text-[13px]" style={{ color: "var(--foreground)" }}>All tenants</td>
                  <td className="px-4 py-3 font-mono font-bold text-[12px]" style={{ color: "#0FEBA8" }}>{formatNumber(totalMessages)}</td>
                  <td className="px-4 py-3 text-center font-bold" style={{ color: "var(--foreground)" }}>{totalMedia}</td>
                  <td className="px-4 py-3 text-center font-bold" style={{ color: "var(--foreground)" }}>{totalLinks}</td>
                  <td className="px-4 py-3 font-mono font-bold text-[12px]" style={{ color: "#60A5FA" }}>{formatNumber(totalClicks)}</td>
                  <td className="px-4 py-3 text-center font-bold" style={{ color: "var(--foreground)" }}>{totalReminders}</td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: "var(--muted-foreground)" }}>-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Company health - quota meters">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tenantRows.map((tenant) => (
              <div key={tenant.slug}>
                <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--foreground)" }}>{tenant.name}</p>
                <QuotaMeter label="Monthly usage" used={tenant.monthlyLimit - tenant.creditsRemaining} total={tenant.monthlyLimit} warnAt={0.5} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
