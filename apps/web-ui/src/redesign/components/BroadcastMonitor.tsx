import { useState } from "react";
import { RefreshCw, AlertTriangle, Clock, Zap, Radio } from "lucide-react";

const data = {
  campaign: "Spring Clearance",
  pct: 35,
  queued: 620, sent: 330, failed: 0, retried: 12, deadLettered: 0,
  modeledAudience: 2650000, sampleMessages: 950,
  throughputMin: 23.6, throughputSec: 0.39,
  eta: "~14 min", projected: "Jun 14, 2026 8:14 AM",
  started: "Jun 14, 2026 8:00 AM", lastUpdated: "8:06:42 AM",
};

export function BroadcastMonitor() {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1200); };

  return (
    <div className="flex flex-col min-h-full" style={{ background: "#0D1117" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">Broadcast Monitor</span>
          </div>
          <span className="text-white/15">·</span>
          <select className="bg-white/5 border border-white/10 rounded text-[13px] text-white/75 px-2 py-1 focus:outline-none">
            <option>Spring Clearance</option>
            <option>Seattle VIP Double Points</option>
            <option>West Region Summer Preview</option>
          </select>
        </div>
        <button onClick={refresh}
          className="flex items-center gap-1.5 text-[12px] text-white/35 hover:text-white/60 transition-colors px-2 py-1 rounded hover:bg-white/5">
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : `Updated ${data.lastUpdated}`}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-[1100px] mx-auto w-full">
        {/* Hero + status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Big % */}
          <div className="lg:col-span-2 rounded-md p-6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium mb-1">Campaign progress</p>
                <p className="text-[15px] font-semibold text-white">{data.campaign}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/15 text-teal-400 font-semibold uppercase tracking-wider" style={{ border: "1px solid rgba(20,184,166,0.2)" }}>
                In progress
              </span>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <span className="text-[68px] font-bold text-teal-400 leading-none tabular-nums">{data.pct}%</span>
              <span className="text-[13px] text-white/25 mb-2">complete</span>
            </div>
            <div className="h-3 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${data.pct}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-white/25">
              <span>0</span>
              <span>{data.sampleMessages.toLocaleString()} sample msgs</span>
            </div>
          </div>

          {/* Status counts */}
          <div className="rounded-md p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium mb-4">Message status</p>
            <div className="space-y-3">
              {[
                { l: "Queued",       v: data.queued,       cls: "text-amber-400",   bar: "#F59E0B" },
                { l: "Sent",         v: data.sent,         cls: "text-emerald-400", bar: "#10B981" },
                { l: "Retried",      v: data.retried,      cls: "text-blue-400",    bar: "#3B82F6" },
                { l: "Failed",       v: data.failed,       cls: "text-red-400",     bar: "#EF4444" },
                { l: "Dead-lettered",v: data.deadLettered, cls: "text-gray-500",    bar: "#6B7280" },
              ].map(({ l, v, cls, bar }) => (
                <div key={l}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[12px] text-white/45">{l}</span>
                    <span className={`text-[15px] font-semibold tabular-nums ${cls}`}>{v.toLocaleString()}</span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full" style={{ width: `${data.sampleMessages > 0 ? (v / data.sampleMessages) * 100 : 0}%`, background: bar }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metric tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l: "Modeled audience",   v: data.modeledAudience.toLocaleString(), s: "Total universe" },
            { l: "Sample messages",    v: data.sampleMessages.toLocaleString(),  s: "Local sends" },
            { l: "Throughput",         v: `${data.throughputMin}/min`,            s: `${data.throughputSec}/sec` },
            { l: "ETA",                v: data.eta,                              s: `Done ~${data.projected}` },
          ].map(({ l, v, s }) => (
            <div key={l} className="rounded-md p-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium mb-1">{l}</p>
              <p className="text-[20px] font-semibold text-white tabular-nums">{v}</p>
              <p className="text-[11px] text-white/25 mt-0.5">{s}</p>
            </div>
          ))}
        </div>

        {/* Timeline + note */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-md p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium mb-4">Timeline</p>
            <div className="space-y-2.5">
              {[
                { l: "Campaign started",    v: data.started,   done: true },
                { l: "Last status update",  v: data.lastUpdated, done: true },
                { l: "Projected completion",v: data.projected, done: false },
              ].map(({ l, v, done }) => (
                <div key={l} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${done ? "bg-teal-500" : "bg-white/15"}`} />
                  <span className="text-[12px] text-white/35 w-48 shrink-0">{l}</span>
                  <span className={`text-[12px] tabular-nums ${done ? "text-white/65" : "text-teal-400"}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md p-5" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[12px] font-medium text-amber-300">Sample mode active</p>
            </div>
            <p className="text-[12px] text-white/40 leading-relaxed">
              This campaign runs in <span className="text-white/65 font-medium">sample mode</span>. Only{" "}
              <span className="text-amber-300 font-medium">{data.sampleMessages.toLocaleString()}</span> messages are sent to sampled recipients.
              The <span className="text-white/65">{data.modeledAudience.toLocaleString()}</span> modeled audience is a projection.
            </p>
            <p className="text-[11px] text-white/20 mt-3">Progress reflects sample sends only.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
