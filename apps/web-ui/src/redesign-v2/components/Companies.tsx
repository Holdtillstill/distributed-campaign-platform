import { useState } from "react";
import { ChevronRight, Copy, Plus, X } from "lucide-react";
import { formatNumber, useV2Data } from "../mockData";
import { Btn, Field, PageHeader, Panel, QuotaMeter } from "./ui-primitives";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function Companies() {
  const {
    platformTenants,
    createPlatformTenant,
    updatePlatformTenantLimits,
    setPlatformTenantStatus,
  } = useV2Data();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [newAdmin, setNewAdmin] = useState("");
  const [newLimit, setNewLimit] = useState("4800000");
  const [newCredits, setNewCredits] = useState("4800000");
  const [editingLimits, setEditingLimits] = useState(false);
  const [limitDraft, setLimitDraft] = useState("");
  const [creditsDraft, setCreditsDraft] = useState("");
  const [companyError, setCompanyError] = useState<string | null>(null);
  const selected = platformTenants.find((tenant) => tenant.slug === selectedSlug) ?? null;
  const effectiveSlug = newSlug.trim() || slugify(newCompanyName);
  const parsedNewLimit = Number(newLimit);
  const parsedNewCredits = Number(newCredits);
  const parsedLimitDraft = Number(limitDraft);
  const parsedCreditsDraft = Number(creditsDraft);
  const slugExists = platformTenants.some((tenant) => tenant.slug === effectiveSlug);
  const createDisabled = !newCompanyName.trim() || !effectiveSlug || slugExists || !newAdmin.includes("@") || !Number.isFinite(parsedNewLimit) || !Number.isFinite(parsedNewCredits) || parsedNewLimit <= 0 || parsedNewCredits < 0 || parsedNewCredits > parsedNewLimit;
  const saveLimitsDisabled = !Number.isFinite(parsedLimitDraft) || !Number.isFinite(parsedCreditsDraft) || parsedLimitDraft <= 0 || parsedCreditsDraft < 0 || parsedCreditsDraft > parsedLimitDraft;

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const createCompany = () => {
    if (createDisabled) return;
    try {
      const tenant = createPlatformTenant({
        name: newCompanyName.trim(),
        slug: effectiveSlug,
        admin: newAdmin.trim(),
        monthlyLimit: parsedNewLimit,
        creditsRemaining: parsedNewCredits,
      });
      setCompanyError(null);
      setSelectedSlug(tenant.slug);
      setCreating(false);
      setNewCompanyName("");
      setNewSlug("");
      setSlugTouched(false);
      setNewAdmin("");
      setNewLimit("4800000");
      setNewCredits("4800000");
    } catch (error) {
      setCompanyError(error instanceof Error ? error.message : "Company could not be created.");
    }
  };

  const startEditLimits = () => {
    if (!selected) return;
    setCompanyError(null);
    setLimitDraft(String(selected.monthlyLimit));
    setCreditsDraft(String(selected.creditsRemaining));
    setEditingLimits(true);
  };

  const saveLimits = () => {
    if (!selected || saveLimitsDisabled) return;
    try {
      updatePlatformTenantLimits(selected.slug, parsedLimitDraft, parsedCreditsDraft);
      setCompanyError(null);
      setEditingLimits(false);
    } catch (error) {
      setCompanyError(error instanceof Error ? error.message : "Tenant limits could not be saved.");
    }
  };

  const toggleSuspend = () => {
    if (!selected) return;
    setPlatformTenantStatus(selected.slug, selected.status === "active" ? "suspended" : "active");
  };

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--background)" }}>
      <PageHeader title="Companies" breadcrumb="Admin Console" description="Tenant management - create, configure, and monitor companies"
        action={
          <Btn variant="accent" size="sm" onClick={() => { setCreating(true); setSelectedSlug(null); setEditingLimits(false); setSlugTouched(false); setCompanyError(null); }}>
            <Plus size={13} /> Create company
          </Btn>
        }
      />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5">
          <Panel title="All companies" noPad action={
            <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{platformTenants.length} tenants</span>
          }>
            <div className="overflow-x-auto" tabIndex={0}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Company", "Admin", "Subscribers", "Monthly limit", "Credits", "Campaigns", "Created", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                        style={{ color: "var(--muted-foreground)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {platformTenants.map((tenant) => (
                    <tr key={tenant.slug}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: "1px solid var(--border)", background: selected?.slug === tenant.slug ? "rgba(15,235,168,0.04)" : "transparent" }}
                      onClick={() => { setSelectedSlug(tenant.slug); setCreating(false); setEditingLimits(false); setCompanyError(null); }}
                      onMouseEnter={(e) => { if (selected?.slug !== tenant.slug) e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = selected?.slug === tenant.slug ? "rgba(15,235,168,0.04)" : "transparent"; }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
                            style={{ background: "linear-gradient(135deg, #0FEBA8, #0BC8A0)", color: "#0C0D12" }}>
                            {tenant.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold text-[13px]" style={{ color: "var(--foreground)" }}>{tenant.name}</p>
                            <p className="text-[10px] font-mono" style={{ color: "var(--muted-foreground)" }}>{tenant.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: "var(--muted-foreground)" }}>{tenant.admin}</td>
                      <td className="px-4 py-3 font-mono text-[12px]" style={{ color: "var(--foreground)" }}>{formatNumber(tenant.subscribers)}</td>
                      <td className="px-4 py-3 font-mono text-[12px]" style={{ color: "var(--foreground)" }}>{formatNumber(tenant.monthlyLimit)}</td>
                      <td className="px-4 py-3 font-mono text-[12px]" style={{ color: "#0FEBA8" }}>{formatNumber(tenant.creditsRemaining)}</td>
                      <td className="px-4 py-3 text-center text-[13px]" style={{ color: "var(--foreground)" }}>{tenant.campaigns}</td>
                      <td className="px-4 py-3 text-[12px] whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>{tenant.created}</td>
                      <td className="px-4 py-3"><ChevronRight size={13} style={{ color: "var(--muted-foreground)" }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {(selected || creating) && (
          <div className="w-80 shrink-0 flex flex-col" style={{ background: "var(--card)", borderLeft: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <p className="text-[13px] font-bold" style={{ color: "var(--foreground)" }}>
                {creating ? "Create company" : selected?.name}
              </p>
              <button aria-label="Close company detail" onClick={() => { setSelectedSlug(null); setCreating(false); setEditingLimits(false); setCompanyError(null); }} style={{ color: "var(--muted-foreground)" }}>
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-5">
              {companyError && (
                <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.22)", color: "#F87171" }}>
                  {companyError}
                </div>
              )}
              {creating && (
                <div className="space-y-3">
                  <Field label="Company name" placeholder="e.g. Acme Retail Co" value={newCompanyName} onChange={(value) => {
                    setNewCompanyName(value);
                    if (!slugTouched) setNewSlug(slugify(value));
                  }} />
                  <Field label="Slug" placeholder="e.g. acme-retail" value={effectiveSlug} onChange={(value) => {
                    setSlugTouched(true);
                    setNewSlug(slugify(value));
                  }} />
                  <Field label="Initial admin email" type="email" placeholder="admin@company.test" value={newAdmin} onChange={setNewAdmin} />
                  <Field label="Monthly send limit" type="number" placeholder="e.g. 4800000" value={newLimit} onChange={setNewLimit} />
                  <Field label="Contract credits" type="number" placeholder="e.g. 4800000" value={newCredits} onChange={setNewCredits} />
                  <Btn variant="accent" className="w-full justify-center" disabled={createDisabled} onClick={createCompany}>Create & generate code</Btn>
                </div>
              )}

              {selected && !creating && (
                <>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted-foreground)" }}>Access code</p>
                    <div className="p-3 rounded-xl relative overflow-hidden" style={{ background: "rgba(15,235,168,0.06)", border: "1px solid rgba(15,235,168,0.2)" }}>
                      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #0FEBA8, transparent)", opacity: 0.5 }} />
                      <div className="flex items-center gap-2">
                        <code className="text-[14px] font-mono font-black flex-1" style={{ color: "#0FEBA8" }}>{selected.accessCode}</code>
                        <button aria-label={`Copy company access code ${selected.accessCode}`} onClick={() => copy(selected.accessCode)} className="transition-opacity hover:opacity-70" style={{ color: "#0FEBA8" }}>
                          <Copy size={14} />
                        </button>
                      </div>
                      {copied === selected.accessCode && <p className="text-[11px] mt-1 font-bold" style={{ color: "#0FEBA8" }}>Copied!</p>}
                      <p className="text-[11px] mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>Share with the company admin to activate their workspace.</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted-foreground)" }}>Quota & credits</p>
                    <QuotaMeter label="Monthly usage" used={selected.monthlyLimit - selected.creditsRemaining} total={selected.monthlyLimit} />
                    {editingLimits && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <input aria-label="Monthly send limit" value={limitDraft} onChange={(e) => setLimitDraft(e.target.value)} type="number"
                          className="h-8 rounded border px-2 text-[12px] focus:outline-none"
                          style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                        <input aria-label="Credits remaining" value={creditsDraft} onChange={(e) => setCreditsDraft(e.target.value)} type="number"
                          className="h-8 rounded border px-2 text-[12px] focus:outline-none"
                          style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                        <Btn variant="ghost" size="xs" onClick={() => setEditingLimits(false)}>Cancel</Btn>
                        <Btn variant="accent" size="xs" disabled={saveLimitsDisabled} onClick={saveLimits}>Save limits</Btn>
                      </div>
                    )}
                    <div className="mt-3 space-y-1.5 text-[12px]">
                      {[["Credits remaining", formatNumber(selected.creditsRemaining)], ["Monthly limit", formatNumber(selected.monthlyLimit)]].map(([l, v]) => (
                        <div key={l} className="flex justify-between">
                          <span style={{ color: "var(--muted-foreground)" }}>{l}</span>
                          <span className="font-mono font-semibold" style={{ color: "var(--foreground)" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted-foreground)" }}>Company stats</p>
                    <div className="space-y-1.5 text-[12px]">
                      {[["Subscribers", formatNumber(selected.subscribers)], ["Campaigns", selected.campaigns], ["Created", selected.created], ["Admin", selected.admin], ["Status", selected.status]].map(([l, v]) => (
                        <div key={String(l)} className="flex justify-between gap-2">
                          <span style={{ color: "var(--muted-foreground)" }}>{l}</span>
                          <span className="font-mono font-semibold truncate" style={{ color: "var(--foreground)" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <Btn variant="outline" size="xs" onClick={startEditLimits}>Edit limits</Btn>
                    <Btn variant={selected.status === "active" ? "destructive" : "outline"} size="xs" onClick={toggleSuspend}>
                      {selected.status === "active" ? "Suspend" : "Reactivate"}
                    </Btn>
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
