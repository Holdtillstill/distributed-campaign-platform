import { useState } from "react";
import { Bell, Copy, Plus } from "lucide-react";
import { Btn, DataTable, InlineSelect, MetricCard, Panel, PageHeader, RoleStrip, SearchInput, StatusChip } from "./ui-primitives";
import { compactNumber, formatNumber, useV2Data } from "../mockData";

type Tab = "overview" | "scheduled" | "sent" | "followups";

export function Campaigns({ onNavigate }: { onNavigate: (k: string) => void }) {
  const { campaigns, subscriberLists } = useV2Data();
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const tabs = [
    { key: "overview" as Tab,  label: "Overview" },
    { key: "scheduled" as Tab, label: "Scheduled" },
    { key: "sent" as Tab,      label: "Sent / Past" },
    { key: "followups" as Tab, label: "Follow-ups" },
  ];

  const filtered = campaigns.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (tab === "scheduled" && c.status !== "scheduled" && c.status !== "queued") return false;
    if (tab === "sent" && !["sent", "failed", "cancelled"].includes(c.status)) return false;
    if (statusFilter !== "All statuses" && c.status !== statusFilter.toLowerCase()) return false;
    if (fromDate && c.dateISO < fromDate) return false;
    if (toDate && c.dateISO > toDate) return false;
    return true;
  });
  const scheduledCampaigns = campaigns.filter((c) => c.status === "scheduled");
  const sentPastCampaigns = campaigns.filter((c) => ["sent", "failed", "cancelled"].includes(c.status));
  const queuedAndScheduled = campaigns.filter((c) => c.status === "scheduled" || c.status === "queued");
  const totalSubscribers = subscriberLists.find((list) => list.name === "All Subscribers")?.count ?? Number.MAX_SAFE_INTEGER;
  const scheduledReach = Math.min(
    queuedAndScheduled.reduce((total, campaign) => total + campaign.reach, 0),
    totalSubscribers,
  );
  const reminderOpps = campaigns.reduce((total, campaign) => total + campaign.reminders, 0);
  const copyCampaign = (id: string) => {
    const campaign = campaigns.find((item) => item.id === id);
    if (!campaign) return;
    const text = `${campaign.name}\n${campaign.date}\nAudience: ${campaign.list}\nReach: ${formatNumber(campaign.reach)}\n${campaign.body ?? ""}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--background)" }}>
      <PageHeader title="Campaigns" description="Manage and monitor your SMS/MMS campaigns"
        action={
          <Btn variant="accent" size="sm" onClick={() => onNavigate("new-campaign")}>
            <Plus size={13} /> New campaign
          </Btn>
        }
      />
      <RoleStrip role="Customer Company Admin" company="Demo Retail Co" scope="Demo Retail Co only · All Markets" />

      <div className="flex-1 p-5 space-y-4 max-w-[1300px] mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Scheduled" value={String(scheduledCampaigns.length)} sub="Future sends" />
          <MetricCard label="Sent / Past" value={String(sentPastCampaigns.length)} sub="Last 90 days" />
          <MetricCard label="Scheduled reach" value={compactNumber(scheduledReach)} sub="Deduped modeled reach" accent />
          <MetricCard label="Reminder opportunities" value={formatNumber(reminderOpps)} sub={`${campaigns.length} campaigns`} />
        </div>

        <Panel noPad>
          {/* Tab bar */}
          <div className="flex items-center justify-between px-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="px-3 py-3 text-[12px] font-semibold border-b-2 transition-colors"
                  style={tab === t.key
                    ? { borderColor: "#0FEBA8", color: "#0FEBA8" }
                    : { borderColor: "transparent", color: "var(--muted-foreground)" }}>
                  {t.label}
                </button>
              ))}
              <button onClick={() => onNavigate("monitor")}
                className="px-3 py-3 text-[12px] font-semibold border-b-2 transition-colors flex items-center gap-1.5"
                style={{ borderColor: "transparent", color: "var(--muted-foreground)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#0FEBA8" }} />
                Monitor
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap" style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.01)" }}>
            <SearchInput placeholder="Search campaigns…" value={search} onChange={setSearch} className="w-52" />
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <InlineSelect ariaLabel="Campaign status filter" value={statusFilter} onChange={setStatusFilter} options={["All statuses", "Scheduled", "Queued", "Sent", "Failed", "Cancelled"]} />
              <input aria-label="From campaign date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-7 rounded border px-2 text-[12px] focus:outline-none"
                style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }}
                 />
              <input aria-label="To campaign date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-7 rounded border px-2 text-[12px] focus:outline-none"
                style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }}
                 />
            </div>
          </div>

          <DataTable
            columns={[
              { key: "name",      label: "Campaign" },
              { key: "status",    label: "Status" },
              { key: "date",      label: "Date" },
              { key: "type",      label: "Type" },
              { key: "list",      label: "List" },
              { key: "reach",     label: "Reach",    align: "right", mono: true },
              { key: "sample",    label: "Sample",   align: "right", mono: true },
              { key: "credits",   label: "Credits",  align: "right", mono: true },
              { key: "reminders", label: "Reminders",align: "center" },
              { key: "actions",   label: "" },
            ]}
            rows={filtered.map((c) => ({
              name: <span className="font-semibold" style={{ color: "var(--foreground)" }}>{c.name}</span>,
              status: <StatusChip status={c.status} />,
              date: <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>{c.date}</span>,
              type: (
                <span className="text-[10px] px-1.5 py-0.5 rounded border font-mono font-semibold"
                  style={c.type === "MMS"
                    ? { background: "rgba(167,139,250,0.1)", color: "#A78BFA", borderColor: "rgba(167,139,250,0.2)" }
                    : { background: "rgba(96,165,250,0.1)",  color: "#60A5FA",  borderColor: "rgba(96,165,250,0.2)"  }}>
                  {c.type}
                </span>
              ),
              list: <span className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{c.list}</span>,
              reach:   formatNumber(c.reach),
              sample:  formatNumber(c.sample),
              credits: formatNumber(c.credits),
              reminders: c.reminders > 0
                ? <span className="flex items-center justify-center gap-1 text-[11px]" style={{ color: "#FBBF24" }}>
                    <Bell size={10} /> {c.reminders}
                  </span>
                : <span style={{ color: "var(--muted-foreground)" }}>—</span>,
              actions: (
                <button onClick={() => copyCampaign(c.id)} className="flex items-center gap-1 text-[11px] font-medium transition-opacity hover:opacity-70"
                  style={{ color: "var(--muted-foreground)" }}>
                  <Copy size={10} /> {copied === c.id ? "Copied" : "Copy"}
                </button>
              ),
            }))}
            emptyMessage="No campaigns match your filters"
          />
        </Panel>
      </div>
    </div>
  );
}
