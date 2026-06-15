import { useState } from "react";
import { Plus, Upload, UserPlus, Link, X } from "lucide-react";
import { Button, Panel, PageHeader, RoleBudgetStrip, SearchInput, SectionHeader, DataTable } from "./ui-primitives";

type PanelType = "none" | "create-list" | "csv" | "single" | "optin";

const listCards = [
  { name: "All Subscribers", count: "2,650,000", consent: "99.1%", cls: "border-blue-200 bg-blue-50/60" },
  { name: "Seattle VIP",     count: "2,650,000", consent: "100%",  cls: "border-teal-200 bg-teal-50/60" },
  { name: "West Loyalty",    count: "1,840,000", consent: "99.2%", cls: "border-emerald-200 bg-emerald-50/60" },
  { name: "Winback Shoppers",count: "950",        consent: "97.8%", cls: "border-amber-200 bg-amber-50/60" },
];

const subs = [
  { phone: "+1 (206) 555-0142", source: "CSV Import",   region: "Seattle, WA",   list: "Seattle VIP",     consent: "Opted In",  mkt: "Active",     created: "Jan 12, 2026" },
  { phone: "+1 (503) 555-0281", source: "API",           region: "Portland, OR",  list: "West Loyalty",    consent: "Opted In",  mkt: "Active",     created: "Feb 3, 2026" },
  { phone: "+1 (425) 555-0193", source: "Opt-in Form",  region: "Bellevue, WA",  list: "Seattle VIP",     consent: "Opted In",  mkt: "Active",     created: "Mar 7, 2026" },
  { phone: "+1 (360) 555-0348", source: "CSV Import",   region: "Tacoma, WA",    list: "Winback Shoppers",consent: "Opted In",  mkt: "Inactive",   created: "Nov 20, 2025" },
  { phone: "+1 (509) 555-0172", source: "API",           region: "Spokane, WA",   list: "West Loyalty",    consent: "Opted Out", mkt: "Suppressed", created: "Oct 4, 2025" },
  { phone: "+1 (702) 555-0219", source: "CSV Import",   region: "Las Vegas, NV", list: "West Loyalty",    consent: "Opted In",  mkt: "Active",     created: "Apr 15, 2026" },
];

export function Subscribers() {
  const [panel, setPanel] = useState<PanelType>("none");
  const [search, setSearch] = useState("");
  const [consent, setConsent] = useState("all");

  const filtered = subs.filter((s) => {
    if (search && !s.phone.includes(search) && !s.region.toLowerCase().includes(search.toLowerCase())) return false;
    if (consent === "opted-in" && s.consent !== "Opted In") return false;
    if (consent === "opted-out" && s.consent !== "Opted Out") return false;
    return true;
  });

  return (
    <div className="flex flex-col min-h-full bg-background">
      <PageHeader title="Subscribers" description="Lists, consent, and subscriber management"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPanel("csv")} className="text-[12px] h-8">
              <Upload size={12} /> CSV import
            </Button>
            <Button size="sm" onClick={() => setPanel("single")} className="bg-foreground hover:bg-gray-800 text-[12px] h-8">
              <UserPlus size={12} /> Add subscriber
            </Button>
          </div>
        }
      />
      <RoleBudgetStrip role="Customer Admin" company="Demo Retail Co" scope="All Markets" budget="Unlimited" />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* List cards */}
          <div>
            <SectionHeader title="Subscriber lists" action={
              <Button variant="ghost" size="sm" onClick={() => setPanel("create-list")} className="text-[12px] h-7">
                <Plus size={11} /> New list
              </Button>
            } />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {listCards.map((l) => (
                <div key={l.name} className={`rounded-md border p-3.5 cursor-pointer hover:shadow-sm transition-all ${l.cls}`}>
                  <p className="text-[13px] font-semibold text-foreground">{l.name}</p>
                  <p className="text-[22px] font-bold tabular-nums text-foreground mt-1">{l.count}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-muted-foreground">Consent</span>
                    <span className="text-[12px] font-medium text-emerald-700">{l.consent}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <Panel title="All subscribers" action={
            <div className="flex items-center gap-2 flex-wrap">
              <SearchInput placeholder="Search…" value={search} onChange={setSearch} className="w-40" />
              <select value={consent} onChange={(e) => setConsent(e.target.value)}
                className="h-7 rounded border border-border bg-white text-[12px] px-2 focus:outline-none">
                <option value="all">All consent</option>
                <option value="opted-in">Opted in</option>
                <option value="opted-out">Opted out</option>
              </select>
              <select className="h-7 rounded border border-border bg-white text-[12px] px-2 focus:outline-none">
                <option>25/page</option><option>50/page</option><option>100/page</option>
              </select>
            </div>
          }>
            <div className="-mx-4 -mb-4">
              <DataTable
                columns={[
                  { key: "phone", label: "Phone", mono: true },
                  { key: "source", label: "Source" },
                  { key: "region", label: "Region" },
                  { key: "list", label: "List" },
                  { key: "consent", label: "Consent" },
                  { key: "mkt", label: "Marketing" },
                  { key: "created", label: "Created" },
                ]}
                rows={filtered.map((s) => ({
                  phone: s.phone,
                  source: <span className="text-muted-foreground text-[12px]">{s.source}</span>,
                  region: <span className="text-muted-foreground text-[12px]">{s.region}</span>,
                  list: <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">{s.list}</span>,
                  consent: <span className={`text-[11px] font-medium ${s.consent === "Opted In" ? "text-emerald-700" : "text-red-600"}`}>{s.consent}</span>,
                  mkt: <span className={`text-[11px] font-medium ${s.mkt === "Active" ? "text-emerald-700" : s.mkt === "Suppressed" ? "text-red-600" : "text-muted-foreground"}`}>{s.mkt}</span>,
                  created: <span className="text-[12px] text-muted-foreground">{s.created}</span>,
                }))}
              />
            </div>
          </Panel>
        </div>

        {/* Side panel */}
        {panel !== "none" && (
          <div className="w-80 shrink-0 border-l border-border bg-white flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <p className="text-[13px] font-semibold text-foreground">
                {{ "create-list": "Create list", csv: "CSV import", single: "Add subscriber", optin: "Public opt-in link" }[panel]}
              </p>
              <button onClick={() => setPanel("none")} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>

            {/* Switcher tabs */}
            <div className="flex border-b border-border shrink-0">
              {(["create-list", "csv", "single", "optin"] as PanelType[]).filter(p => p !== "none").map((p) => (
                <button key={p} onClick={() => setPanel(p)}
                  className={`flex-1 py-1.5 text-[10px] font-medium border-b-2 transition-colors ${panel === p ? "border-teal-600 text-teal-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {{ "create-list": "List", csv: "CSV", single: "Single", optin: "Opt-in" }[p]}
                </button>
              ))}
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {panel === "create-list" && (
                <div className="space-y-3">
                  <Field label="List name" type="text" placeholder="e.g. Pacific NW VIP" />
                  <div>
                    <label className="block text-[12px] font-medium text-foreground mb-1.5">Description</label>
                    <textarea rows={3} placeholder="Optional…" className="w-full rounded border border-border bg-white text-[13px] px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-teal-500/30" />
                  </div>
                  <Field label="Region scope" type="select" options={["All markets", "Seattle metro", "West region", "National"]} />
                  <Button size="sm" className="w-full bg-foreground hover:bg-gray-800 text-[12px]">Create list</Button>
                </div>
              )}
              {panel === "csv" && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-md p-5 text-center hover:border-teal-400 transition-colors cursor-pointer">
                    <Upload size={18} className="text-muted-foreground mx-auto mb-2" />
                    <p className="text-[13px] font-medium">Drop CSV file</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Phone, first_name, last_name, region</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-foreground mb-2">Or paste CSV data</p>
                    <textarea rows={5} placeholder="+12065550142,Jane,Smith,Seattle&#10;+15035550281,John,Doe,Portland"
                      className="w-full rounded border border-border bg-white text-[11px] font-mono px-3 py-2 resize-none focus:outline-none" />
                  </div>
                  <Field label="Import to list" type="select" options={["Seattle VIP", "West Loyalty", "Winback Shoppers"]} />
                  <Button size="sm" className="w-full bg-foreground hover:bg-gray-800 text-[12px]">Import subscribers</Button>
                </div>
              )}
              {panel === "single" && (
                <div className="space-y-3">
                  <Field label="Phone number" type="tel" placeholder="+1 (206) 555-0142" />
                  <Field label="First name" type="text" placeholder="Jane" />
                  <Field label="Last name" type="text" placeholder="Smith" />
                  <Field label="Email (optional)" type="email" placeholder="jane@example.com" />
                  <Field label="Add to list" type="select" options={["Seattle VIP", "West Loyalty", "Winback Shoppers"]} />
                  <label className="flex items-center gap-2 py-1">
                    <input type="checkbox" className="accent-teal-600" defaultChecked />
                    <span className="text-[12px]">Confirm subscriber consent</span>
                  </label>
                  <Button size="sm" className="w-full bg-foreground hover:bg-gray-800 text-[12px]">Add subscriber</Button>
                </div>
              )}
              {panel === "optin" && (
                <div className="space-y-3">
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-md">
                    <p className="text-[12px] font-medium text-teal-800 mb-1">Public opt-in link</p>
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] bg-white border border-teal-200 rounded px-2 py-1 flex-1 text-teal-700 truncate">campaignos.io/optin/demo-retail</code>
                      <button className="text-teal-600 hover:text-teal-800"><Link size={13} /></button>
                    </div>
                  </div>
                  <Field label="Landing page title" type="text" placeholder="Join Demo Retail SMS" />
                  <Field label="Default list" type="select" options={["Seattle VIP", "West Loyalty"]} />
                  <Button size="sm" className="w-full bg-foreground hover:bg-gray-800 text-[12px]">Save opt-in page</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, type, placeholder, options }: { label: string; type: string; placeholder?: string; options?: string[] }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-foreground mb-1.5">{label}</label>
      {type === "select" ? (
        <select className="w-full h-8 rounded border border-border bg-white text-[13px] px-2 focus:outline-none">
          {options?.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} placeholder={placeholder}
          className="w-full h-8 rounded border border-border bg-white text-[13px] px-3 focus:outline-none focus:ring-1 focus:ring-teal-500/30" />
      )}
    </div>
  );
}
