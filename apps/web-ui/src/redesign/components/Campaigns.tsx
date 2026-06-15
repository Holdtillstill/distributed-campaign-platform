import { useState } from "react";
import { Copy, Plus, Bell } from "lucide-react";
import { Button, DataTable, MetricCard, Panel, PageHeader, RoleBudgetStrip, SearchInput, StatusChip } from "./ui-primitives";

type Tab = "overview" | "scheduled" | "sent" | "followups";

const campaigns = [
  { name: "Seattle VIP Double Points",   status: "scheduled" as const, date: "Jun 15, 2026 10:00 AM", type: "SMS",  reach: "2,650,000", sample: "950", credits: "2,650", reminders: 2, list: "Seattle VIP" },
  { name: "West Region Summer Preview",  status: "scheduled" as const, date: "Jun 18, 2026 9:00 AM",  type: "MMS",  reach: "1,840,000", sample: "820", credits: "3,680", reminders: 1, list: "West Loyalty" },
  { name: "Spring Clearance",            status: "queued"    as const, date: "Jun 14, 2026 8:00 AM",  type: "SMS",  reach: "950",        sample: "950", credits: "950",   reminders: 0, list: "Winback Shoppers" },
  { name: "Mother's Day VIP Offer",      status: "sent"      as const, date: "May 11, 2026 10:00 AM", type: "SMS",  reach: "2,640,000", sample: "930", credits: "2,640", reminders: 3, list: "Seattle VIP" },
  { name: "Easter Flash Sale",           status: "sent"      as const, date: "Mar 30, 2026 9:00 AM",  type: "MMS",  reach: "1,820,000", sample: "810", credits: "3,640", reminders: 2, list: "West Loyalty" },
  { name: "Valentine's Winback",         status: "failed"    as const, date: "Feb 13, 2026 8:00 AM",  type: "SMS",  reach: "940",        sample: "940", credits: "940",   reminders: 0, list: "Winback Shoppers" },
  { name: "January Clearance",           status: "cancelled" as const, date: "Jan 5, 2026",           type: "SMS",  reach: "950,000",    sample: "780", credits: "950",   reminders: 1, list: "West Loyalty" },
];

export function Campaigns({ onNavigate }: { onNavigate: (k: string) => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");

  const tabs = [
    { key: "overview" as Tab, label: "Overview" },
    { key: "scheduled" as Tab, label: "Scheduled" },
    { key: "sent" as Tab, label: "Sent / Past" },
    { key: "followups" as Tab, label: "Follow-ups" },
  ];

  const filtered = campaigns.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (tab === "scheduled") return c.status === "scheduled" || c.status === "queued";
    if (tab === "sent") return ["sent", "failed", "cancelled"].includes(c.status);
    return true;
  });

  return (
    <div className="flex flex-col min-h-full bg-background">
      <PageHeader
        title="Campaigns"
        description="Manage and monitor your SMS/MMS campaigns"
        action={
          <Button size="sm" onClick={() => onNavigate("new-campaign")} className="bg-foreground text-white hover:bg-gray-800 text-[12px] h-8">
            <Plus size={13} /> New campaign
          </Button>
        }
      />
      <RoleBudgetStrip role="Customer Admin" company="Demo Retail Co" scope="All Markets" budget="Unlimited" />

      <div className="flex-1 p-5 space-y-4 max-w-[1280px] mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Scheduled" value="2" sub="Jun 15 & Jun 18" />
          <MetricCard label="Sent / Past" value="4" sub="Last 90 days" />
          <MetricCard label="Scheduled reach" value="4.49M" sub="Combined audience" accent />
          <MetricCard label="Reminder opportunities" value="18,340" sub="Across 3 campaigns" />
        </div>

        <Panel>
          <div className="-m-4">
            {/* Tab bar */}
            <div className="flex items-center justify-between border-b border-border px-4">
              <div className="flex">
                {tabs.map((t) => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`px-3 py-2.5 text-[12px] font-medium border-b-2 transition-colors ${
                      tab === t.key ? "border-teal-600 text-teal-700" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}>
                    {t.label}
                  </button>
                ))}
                <button onClick={() => onNavigate("monitor")}
                  className="px-3 py-2.5 text-[12px] font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />Monitor
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-gray-50/60">
              <SearchInput placeholder="Search campaigns…" value={search} onChange={setSearch} className="w-52" />
              <div className="flex items-center gap-1.5 ml-auto">
                <select className="h-7 rounded border border-border bg-white text-[12px] text-foreground px-2 focus:outline-none">
                  <option>All statuses</option>
                  <option>Scheduled</option>
                  <option>Queued</option>
                  <option>Sent</option>
                  <option>Failed</option>
                </select>
                <input type="date" className="h-7 rounded border border-border bg-white text-[12px] px-2 focus:outline-none" defaultValue="2026-01-01" />
                <input type="date" className="h-7 rounded border border-border bg-white text-[12px] px-2 focus:outline-none" defaultValue="2026-06-30" />
              </div>
            </div>

            <DataTable
              columns={[
                { key: "name", label: "Campaign" },
                { key: "status", label: "Status" },
                { key: "date", label: "Date" },
                { key: "type", label: "Type" },
                { key: "list", label: "List" },
                { key: "reach", label: "Reach", align: "right", mono: true },
                { key: "sample", label: "Sample", align: "right", mono: true },
                { key: "credits", label: "Credits", align: "right", mono: true },
                { key: "reminders", label: "Reminders", align: "center" },
                { key: "actions", label: "" },
              ]}
              rows={filtered.map((c) => ({
                name: <span className="font-medium text-foreground">{c.name}</span>,
                status: <StatusChip status={c.status} />,
                date: <span className="text-[12px] text-muted-foreground whitespace-nowrap">{c.date}</span>,
                type: <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-medium ${c.type === "MMS" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{c.type}</span>,
                list: <span className="text-[12px] text-muted-foreground">{c.list}</span>,
                reach: c.reach,
                sample: c.sample,
                credits: c.credits,
                reminders: c.reminders > 0
                  ? <span className="flex items-center justify-center gap-1"><Bell size={11} className="text-amber-500" />{c.reminders}</span>
                  : <span className="text-muted-foreground">—</span>,
                actions: <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"><Copy size={11} /> Copy</button>,
              }))}
              emptyMessage="No campaigns match your filters"
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
