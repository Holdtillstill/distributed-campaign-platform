import { useState } from "react";
import { ChevronRight, Copy, Plus, X } from "lucide-react";
import { Button, PageHeader, Panel, QuotaMeter } from "./ui-primitives";

const companies = [
  { name: "Demo Retail Co",    slug: "demo-retail",     admin: "owner@demo-retail.test",  subs: "2,650,000", limit: "4,800,000", credits: "4,797,750", campaigns: 3, created: "Jan 1, 2026",  code: "DMRT-A4F2-K8X1" },
  { name: "Pacific Grocery",   slug: "pacific-grocery", admin: "ops@pacific-grocery.test", subs: "1,230,000", limit: "2,000,000", credits: "1,850,000", campaigns: 2, created: "Feb 15, 2026", code: "PCGR-X1B2-N3M4" },
  { name: "Northwest Fitness", slug: "nw-fitness",      admin: "admin@nwfitness.test",     subs: "84,000",    limit: "200,000",   credits: "190,000",   campaigns: 1, created: "Mar 1, 2026",  code: "NWFT-K3Y7-P8Q2" },
  { name: "Coastal Brands",    slug: "coastal-brands",  admin: "campaigns@coastal.test",   subs: "420,000",   limit: "500,000",   credits: "48,000",    campaigns: 4, created: "Apr 10, 2026", code: "CSBL-V5W8-R1T6" },
  { name: "Urban Eats",        slug: "urban-eats",      admin: "team@urbaneats.test",      subs: "210,000",   limit: "350,000",   credits: "320,000",   campaigns: 0, created: "May 5, 2026",  code: "URBT-J2H9-E4F3" },
];

export function Companies() {
  const [selected, setSelected] = useState<typeof companies[0] | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      <PageHeader title="Companies" breadcrumb="Admin Console" description="Tenant management — create, configure, and monitor companies"
        action={<Button size="sm" onClick={() => { setCreating(true); setSelected(null); }} className="bg-foreground hover:bg-gray-800 text-[12px] h-8"><Plus size={13} /> Create company</Button>}
      />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5">
          <Panel title="All companies" action={<span className="text-[11px] text-muted-foreground">{companies.length} tenants</span>}>
            <div className="-mx-4 -mb-4 overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Company", "Admin", "Subscribers", "Monthly limit", "Credits", "Campaigns", "Created", ""].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.slug} onClick={() => { setSelected(c); setCreating(false); }}
                      className={`border-b border-border/50 hover:bg-gray-50 transition-colors cursor-pointer ${selected?.slug === c.slug ? "bg-teal-50/40" : ""}`}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {c.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{c.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{c.admin}</td>
                      <td className="px-3 py-2.5 font-mono text-[12px]">{c.subs}</td>
                      <td className="px-3 py-2.5 font-mono text-[12px]">{c.limit}</td>
                      <td className="px-3 py-2.5 font-mono text-[12px]">{c.credits}</td>
                      <td className="px-3 py-2.5 text-center">{c.campaigns}</td>
                      <td className="px-3 py-2.5 text-[12px] text-muted-foreground whitespace-nowrap">{c.created}</td>
                      <td className="px-3 py-2.5"><ChevronRight size={13} className="text-muted-foreground" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* Side panel */}
        {(selected || creating) && (
          <div className="w-80 shrink-0 border-l border-border bg-white flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <p className="text-[13px] font-semibold">{creating ? "Create company" : selected?.name}</p>
              <button onClick={() => { setSelected(null); setCreating(false); }} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-5">
              {creating && (
                <div className="space-y-3">
                  {[
                    { l: "Company name", t: "text", ph: "e.g. Acme Retail Co" },
                    { l: "Slug", t: "text", ph: "e.g. acme-retail" },
                    { l: "Initial admin email", t: "email", ph: "admin@company.test" },
                  ].map(({ l, t, ph }) => (
                    <div key={l}>
                      <label className="block text-[12px] font-medium mb-1.5">{l}</label>
                      <input type={t} placeholder={ph} className="w-full h-8 rounded border border-border bg-white text-[13px] px-3 focus:outline-none focus:ring-1 focus:ring-teal-500/30" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5">Monthly send limit</label>
                    <input type="number" placeholder="e.g. 4800000" className="w-full h-8 rounded border border-border bg-white text-[13px] px-3 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5">Contract credits</label>
                    <input type="number" placeholder="e.g. 4800000" className="w-full h-8 rounded border border-border bg-white text-[13px] px-3 focus:outline-none" />
                  </div>
                  <Button size="sm" className="w-full bg-foreground hover:bg-gray-800 text-[12px]">Create company & generate code</Button>
                </div>
              )}

              {selected && !creating && (
                <>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Access code</p>
                    <div className="p-3 rounded bg-teal-50 border border-teal-200">
                      <div className="flex items-center gap-2">
                        <code className="text-[13px] font-mono font-semibold text-teal-800 flex-1">{selected.code}</code>
                        <button onClick={() => copy(selected.code)} className="text-teal-600 hover:text-teal-800"><Copy size={13} /></button>
                      </div>
                      {copied === selected.code && <p className="text-[11px] text-teal-600 mt-1">Copied!</p>}
                      <p className="text-[11px] text-teal-700 mt-1.5">Share with the company admin to activate their workspace.</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quota & credits</p>
                    <QuotaMeter label="Monthly usage" used={parseInt(selected.credits.replace(/,/g, ""))} total={parseInt(selected.limit.replace(/,/g, ""))} />
                    <div className="mt-3 space-y-1.5 text-[12px]">
                      {[["Credits remaining", selected.credits], ["Monthly limit", selected.limit]].map(([l, v]) => (
                        <div key={l} className="flex justify-between">
                          <span className="text-muted-foreground">{l}</span>
                          <span className="font-mono font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Company stats</p>
                    <div className="space-y-1.5 text-[12px]">
                      {[["Subscribers", selected.subs], ["Active campaigns", selected.campaigns], ["Created", selected.created], ["Admin", selected.admin]].map(([l, v]) => (
                        <div key={String(l)} className="flex justify-between">
                          <span className="text-muted-foreground">{l}</span>
                          <span className="font-mono font-medium truncate ml-2">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" className="text-[11px] h-7">Edit limits</Button>
                    <Button variant="destructive" size="sm" className="text-[11px] h-7">Suspend</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
