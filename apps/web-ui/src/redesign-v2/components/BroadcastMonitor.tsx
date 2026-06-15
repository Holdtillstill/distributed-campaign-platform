import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { formatNumber, useV2Data } from "../mockData";

export function BroadcastMonitor() {
  const { campaigns } = useV2Data();
  const monitorable = campaigns.filter((campaign) => campaign.status === "queued" || campaign.status === "scheduled");
  const defaultCampaign = monitorable.find((campaign) => campaign.status === "queued") ?? monitorable[0] ?? campaigns[0];
  const [selectedId, setSelectedId] = useState(defaultCampaign?.id ?? "");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const selected = campaigns.find((campaign) => campaign.id === selectedId) ?? defaultCampaign;
  const pct = selected?.status === "queued" ? Math.min(95, 35 + refreshCount * 3) : 0;
  const sampleMessages = selected?.sample ?? 0;
  const sent = Math.round(sampleMessages * (pct / 100));
  const queued = Math.max(sampleMessages - sent, 0);
  const retried = selected?.status === "queued" ? Math.min(12 + refreshCount, Math.max(sent, 0)) : 0;
  const throughputMin = selected?.status === "queued" ? 23.6 + refreshCount * 0.8 : 0;
  const throughputSec = throughputMin / 60;
  const projected = selected?.status === "queued" ? "Jun 14, 2026 8:14 AM" : selected?.date ?? "Not scheduled";
  const lastUpdated = `8:${String(6 + refreshCount).padStart(2, "0")}:42 AM`;
  const refresh = () => {
    setRefreshing(true);
    setRefreshCount((current) => current + 1);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <div className="flex flex-col min-h-full" style={{ background: "#07080C" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: "1px solid rgba(15,235,168,0.1)", background: "rgba(15,235,168,0.02)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#0FEBA8", boxShadow: "0 0 8px rgba(15,235,168,0.6)" }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(15,235,168,0.6)" }}>Broadcast Monitor</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
          <select aria-label="Monitored campaign" value={selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)} className="rounded-lg border px-3 text-[13px] font-semibold focus:outline-none"
            style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.08)", height: 32 }}>
            {monitorable.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </div>
        <button onClick={refresh}
          className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-70 px-3 py-1.5 rounded-lg"
          style={{ color: "rgba(255,255,255,0.72)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : `Updated ${lastUpdated}`}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-[1100px] mx-auto w-full">

        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Percent complete */}
          <div className="lg:col-span-2 rounded-2xl p-6 relative overflow-hidden"
            style={{ background: "rgba(15,235,168,0.04)", border: "1px solid rgba(15,235,168,0.12)" }}>
            {/* glow */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #0FEBA8 50%, transparent)" }} />
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-5" style={{ background: "#0FEBA8", filter: "blur(40px)" }} />

            <div className="relative">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(15,235,168,0.6)" }}>Campaign progress</p>
                  <p className="text-[17px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>{selected?.name ?? "No active broadcast"}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(15,235,168,0.12)", color: "#0FEBA8", border: "1px solid rgba(15,235,168,0.2)" }}>
                  {selected?.status === "queued" ? "In progress" : "Scheduled"}
                </span>
              </div>

              <div className="flex items-end gap-3 mb-4">
                <span className="text-[80px] font-black leading-none tabular-nums"
                  style={{ color: "#0FEBA8", textShadow: "0 0 60px rgba(15,235,168,0.3)" }}>
                  {pct}%
                </span>
                <span className="text-[14px] mb-3" style={{ color: "rgba(255,255,255,0.72)" }}>complete</span>
              </div>

              <div className="h-2 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${pct}%`, background: "linear-gradient(90deg, #0BC8A0, #0FEBA8)", boxShadow: "0 0 20px rgba(15,235,168,0.4)" }} />
              </div>
              <div className="flex justify-between text-[11px]" style={{ color: "rgba(255,255,255,0.72)" }}>
                <span>0</span>
                <span>{formatNumber(sampleMessages)} sample msgs</span>
              </div>
            </div>
          </div>

          {/* Status counts */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.72)" }}>Message status</p>
            <div className="space-y-3.5">
              {[
                { l: "Queued",        v: queued,       c: "#FBBF24" },
                { l: "Sent",          v: sent,         c: "#34D399" },
                { l: "Retried",       v: retried,      c: "#60A5FA" },
                { l: "Failed",        v: 0,            c: "#F87171" },
                { l: "Dead-lettered", v: 0,            c: "#A1ABC2" },
              ].map(({ l, v, c }) => (
                <div key={l}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.72)" }}>{l}</span>
                    <span className="text-[16px] font-bold tabular-nums" style={{ color: c }}>{formatNumber(v)}</span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${sampleMessages > 0 ? (v / sampleMessages) * 100 : 0}%`, background: c, boxShadow: `0 0 6px ${c}60` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l: "Modeled audience", v: formatNumber(selected?.reach ?? 0), s: selected?.list ?? "Total universe" },
            { l: "Sample messages",  v: formatNumber(sampleMessages),       s: "Local sends" },
            { l: "Throughput",       v: selected?.status === "queued" ? `${throughputMin.toFixed(1)}/min` : "0/min", s: `${throughputSec.toFixed(2)}/sec` },
            { l: "ETA",              v: selected?.status === "queued" ? "~14 min" : "Scheduled", s: `Done ~${projected}` },
          ].map(({ l, v, s }) => (
            <div key={l} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.72)" }}>{l}</p>
              <p className="text-[22px] font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.9)" }}>{v}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.72)" }}>{s}</p>
            </div>
          ))}
        </div>

        {/* Timeline + note */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.72)" }}>Timeline</p>
            <div className="space-y-3">
              {[
                { l: selected?.status === "queued" ? "Campaign started" : "Scheduled start", v: selected?.date ?? "n/a", done: true },
                { l: "Last status update",   v: lastUpdated, done: true },
                { l: "Projected completion", v: projected, done: false },
              ].map(({ l, v, done }) => (
                <div key={l} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: done ? "#0FEBA8" : "rgba(255,255,255,0.12)", boxShadow: done ? "0 0 8px rgba(15,235,168,0.5)" : "none" }} />
                  <span className="text-[12px] w-48 shrink-0" style={{ color: "rgba(255,255,255,0.72)" }}>{l}</span>
                  <span className="text-[12px] tabular-nums font-medium" style={{ color: done ? "rgba(255,255,255,0.75)" : "#0FEBA8" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-5" style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)" }}>
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle size={14} style={{ color: "#FBBF24" }} className="shrink-0 mt-0.5" />
              <p className="text-[12px] font-bold" style={{ color: "#FCD34D" }}>Sample mode active</p>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              Only <span className="font-bold" style={{ color: "#FCD34D" }}>{formatNumber(sampleMessages)}</span> messages
              are sent to sampled recipients. The{" "}
              <span className="font-medium" style={{ color: "rgba(255,255,255,0.82)" }}>{formatNumber(selected?.reach ?? 0)}</span>{" "}
              modeled audience is a projection, not a live broadcast.
            </p>
            <p className="text-[10px] mt-3 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.72)" }}>
              Progress reflects sample sends only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
