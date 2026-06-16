import { useState } from "react";
import { Copy, Plus, Shield, Trash2, UserCog } from "lucide-react";
import { Btn, DataTable, PageHeader, Panel, QuotaMeter } from "./ui-primitives";
import { companyInitials, formatNumber, useV2Data } from "../mockData";

const DEMO_TODAY = "2026-06-14";
const MAX_ACCESS_CODE_DAYS = 30;

function isoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(value: string, days: number) {
  const next = isoDate(value);
  next.setDate(next.getDate() + days);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
    .format(isoDate(value));
}

function isISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function Settings() {
  const {
    teamMembers,
    accessCodes,
    activeTenant,
    activeCompanyName,
    activeCompanySlug,
    activeUserEmail,
    activeRoleLabel,
    addTeamMember,
    generateAccessCode: createAccessCode,
    deleteAccessCode,
    deleteTeamMember,
  } = useV2Data();
  const [copied, setCopied] = useState<string | null>(null);
  const [teamMessage, setTeamMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("Campaign Manager");
  const [memberBudget, setMemberBudget] = useState("$10,000");
  const minExpiry = DEMO_TODAY;
  const maxExpiry = addDays(DEMO_TODAY, MAX_ACCESS_CODE_DAYS);
  const [newRole, setNewRole] = useState("Campaign Manager");
  const [newExpiry, setNewExpiry] = useState(addDays(DEMO_TODAY, 14));
  const monthlyLimit = activeTenant.monthlyLimit;
  const creditsRemaining = activeTenant.creditsRemaining;
  const expiryOutOfRange = !isISODate(newExpiry) || newExpiry < minExpiry || newExpiry > maxExpiry;
  const canGenerateAccessCode = !expiryOutOfRange && !accessCodeError;
  const copy = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code); setTimeout(() => setCopied(null), 1500);
  };
  const handleGenerateAccessCode = () => {
    if (!canGenerateAccessCode) return;
    try {
      const code = createAccessCode(newRole, newExpiry, minExpiry);
      setAccessCodeError(null);
      setCopied(code.code);
      setTimeout(() => setCopied(null), 1500);
    } catch (error) {
      setAccessCodeError(error instanceof Error ? error.message : "Access code expiry is not allowed.");
    }
  };
  const startInvite = () => {
    setInviting(true);
    setEditingEmail(null);
    setMemberName("");
    setMemberEmail("");
    setMemberRole("Campaign Manager");
    setMemberBudget("$10,000");
  };
  const startEditMember = (email: string) => {
    const member = teamMembers.find((item) => item.email === email);
    if (!member) return;
    setInviting(true);
    setEditingEmail(member.email);
    setMemberName(member.name);
    setMemberEmail(member.email);
    setMemberRole(member.role);
    setMemberBudget(member.budget);
  };
  const saveTeamMember = () => {
    if (!memberName.trim() || !memberEmail.includes("@")) return;
    try {
      const member = addTeamMember({
        name: memberName.trim(),
        email: memberEmail.trim(),
        role: memberRole,
        budget: memberBudget.trim() || "$10,000",
      });
      setTeamMessage({ text: `${editingEmail ? "Updated" : "Invited"} ${member.name}`, tone: "success" });
      setInviting(false);
    } catch (error) {
      setTeamMessage({ text: error instanceof Error ? error.message : "Team member could not be saved.", tone: "error" });
    }
  };

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--background)" }}>
      <PageHeader title="Settings" description="Company identity, team access, compliance, and credits" />
      <div className="flex-1 p-5 max-w-[1100px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left 2-col */}
          <div className="lg:col-span-2 space-y-4">

            {/* Identity */}
            <Panel title="Company identity">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[20px] font-black shrink-0"
                  style={{ background: "linear-gradient(135deg, #0FEBA8, #0BC8A0)", color: "#0C0D12" }}>{companyInitials(activeCompanyName)}</div>
                <div>
                  <p className="text-[16px] font-bold" style={{ color: "var(--foreground)" }}>{activeCompanyName}</p>
                  <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{activeCompanySlug} · {activeUserEmail}</p>
                </div>
              </div>
              <div className="space-y-0 divide-y" style={{ borderColor: "var(--border)" }}>
                {[["Slug", activeCompanySlug], ["Plan", "Enterprise"], ["Timezone", "America/Los_Angeles"], ["Member since", activeTenant.created]].map(([l, v]) => (
                  <div key={l} className="flex justify-between py-2.5 text-[13px]">
                    <span style={{ color: "var(--muted-foreground)" }}>{l}</span>
                    <span className="font-semibold" style={{ color: "var(--foreground)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Team */}
            <Panel title="Team members" action={
              <Btn variant="accent" size="xs" onClick={startInvite}><Plus size={11} /> Invite</Btn>
            } noPad>
              {teamMessage && (
                <div className="px-4 py-2 text-[11px]" style={{ color: teamMessage.tone === "success" ? "#0FEBA8" : "#F87171", borderBottom: "1px solid var(--border)" }}>
                  {teamMessage.text}
                </div>
              )}
              <DataTable
                columns={[
                  { key: "name", label: "Name" },
                  { key: "email", label: "Email" },
                  { key: "role", label: "Role" },
                  { key: "budget", label: "Budget", align: "right" },
                  { key: "actions", label: "" },
                ]}
                rows={teamMembers.map((m) => ({
                  name: (
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: `${m.rc}20`, color: m.rc }}>
                        {m.name.split(" ").map((p) => p[0]).join("")}
                      </div>
                      <span className="font-semibold text-[13px]" style={{ color: "var(--foreground)" }}>{m.name}</span>
                    </div>
                  ),
                  email: <span className="text-[12px] font-mono" style={{ color: "var(--muted-foreground)" }}>{m.email}</span>,
                  role: (
                    <span className="text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider"
                      style={{ background: `${m.rc}10`, color: m.rc, borderColor: `${m.rc}25` }}>
                      {m.role}
                    </span>
                  ),
                  budget: <span className="font-mono text-[12px]" style={{ color: "var(--foreground)" }}>{m.budget}</span>,
                  actions: (
                    <div className="flex gap-1">
                      <button onClick={() => startEditMember(m.email)} className="w-6 h-6 flex items-center justify-center rounded transition-opacity hover:opacity-70"
                        style={{ color: "var(--muted-foreground)" }} aria-label={`Edit ${m.name}`}><UserCog size={12} /></button>
                      <button
                        className="w-6 h-6 flex items-center justify-center rounded transition-opacity hover:opacity-70 disabled:opacity-25 disabled:cursor-not-allowed"
                        style={{ color: "rgba(248,113,113,0.6)" }}
                        disabled={m.email === activeTenant.admin}
                        aria-label={m.email === activeTenant.admin ? "Owner cannot be removed" : `Remove ${m.name}`}
                        onClick={() => deleteTeamMember(m.email)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ),
                }))}
              />
              {inviting && (
                <div className="p-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Name</label>
                      <input aria-label="Team member name" value={memberName} onChange={(e) => setMemberName(e.target.value)}
                        className="w-full h-8 rounded border px-3 text-[13px] focus:outline-none"
                        style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Email</label>
                      <input aria-label="Team member email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} disabled={Boolean(editingEmail)}
                        className="w-full h-8 rounded border px-3 text-[13px] focus:outline-none disabled:opacity-55"
                        style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Role</label>
                      <select aria-label="Team member role" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}
                        className="w-full h-8 rounded border px-3 text-[13px] focus:outline-none"
                        style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }}>
                        {["Campaign Manager", "Regional Manager", "Customer Company Admin"].map((role) => <option key={role}>{role}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Budget</label>
                      <input aria-label="Team member budget" value={memberBudget} onChange={(e) => setMemberBudget(e.target.value)}
                        className="w-full h-8 rounded border px-3 text-[13px] focus:outline-none"
                        style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Btn variant="ghost" size="xs" onClick={() => setInviting(false)}>Cancel</Btn>
                    <Btn variant="accent" size="xs" disabled={!memberName.trim() || !memberEmail.includes("@")} onClick={saveTeamMember}>
                      {editingEmail ? "Save member" : "Send invite"}
                    </Btn>
                  </div>
                </div>
              )}
            </Panel>

            {/* Access codes */}
            <Panel title="Access codes">
              <div className="space-y-2.5 mb-4">
                {accessCodes.map((c) => (
                  <div key={c.code} className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-[13px] font-mono font-bold" style={{ color: "#0FEBA8" }}>{c.code}</code>
                        <button aria-label={`Copy access code ${c.code}`} onClick={() => copy(c.code)} className="transition-opacity hover:opacity-70"
                          style={{ color: "var(--muted-foreground)" }}><Copy size={11} /></button>
                        {copied === c.code && <span className="text-[10px] font-bold" style={{ color: "#0FEBA8" }}>Copied!</span>}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] flex-wrap">
                        <span className="px-1.5 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider"
                          style={{ background: "rgba(96,165,250,0.1)", color: "#60A5FA", border: "1px solid rgba(96,165,250,0.2)" }}>
                          {c.role}
                        </span>
                        <span style={{ color: "var(--muted-foreground)" }}>Uses: {c.uses}/{c.max}</span>
                        <span style={{ color: "var(--muted-foreground)" }}>Exp: {c.expires}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteAccessCode(c.code)} className="transition-opacity hover:opacity-70" style={{ color: "rgba(248,113,113,0.5)" }} aria-label={`Delete access code ${c.code}`}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>Create access code</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Role</label>
                    <select aria-label="Access code role" value={newRole} onChange={(e) => setNewRole(e.target.value)}
                      className="w-full h-8 rounded border px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#0FEBA8]/30"
                      style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }}>
                      {["Campaign Manager", "Regional Manager", "Customer Company Admin"].map((role) => <option key={role}>{role}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Expires</label>
                    <input aria-label="Access code expiry date" aria-invalid={expiryOutOfRange || Boolean(accessCodeError)} type="date" value={newExpiry} min={minExpiry} max={maxExpiry}
                      onChange={(e) => { setAccessCodeError(null); setNewExpiry(e.target.value); }}
                      onInput={(e) => { setAccessCodeError(null); setNewExpiry(e.currentTarget.value); }}
                      className="w-full h-8 rounded border px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#0FEBA8]/30"
                      style={{ background: "var(--input)", color: "var(--foreground)", borderColor: expiryOutOfRange || accessCodeError ? "rgba(248,113,113,0.55)" : "var(--border)" }} />
                  </div>
                </div>
                <p className="text-[11px]" style={{ color: expiryOutOfRange || accessCodeError ? "#F87171" : "var(--muted-foreground)" }}>
                  {accessCodeError ?? (expiryOutOfRange
                    ? `Choose a date from ${displayDate(minExpiry)} through ${displayDate(maxExpiry)}. Access codes can expire no later than ${displayDate(maxExpiry)} (${MAX_ACCESS_CODE_DAYS} days from creation).`
                    : `Access codes can expire no later than ${displayDate(maxExpiry)} (${MAX_ACCESS_CODE_DAYS} days from creation).`)}
                </p>
                <Btn variant="accent" size="sm" disabled={!canGenerateAccessCode} onClick={handleGenerateAccessCode}><Plus size={12} /> Generate access code</Btn>
              </div>
            </Panel>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <Panel title="Your permissions">
              <div className="flex items-center gap-2 mb-3 p-3 rounded-lg"
                style={{ background: "rgba(15,235,168,0.06)", border: "1px solid rgba(15,235,168,0.18)" }}>
                <Shield size={14} style={{ color: "#0FEBA8" }} />
                <span className="text-[12px] font-bold" style={{ color: "#0FEBA8" }}>{activeRoleLabel}</span>
              </div>
              <div className="space-y-2">
                {["Create & manage campaigns","Manage subscribers & lists","View full analytics","Manage team access","Set user budgets","Configure compliance","Manage content library"].map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full shrink-0" style={{ background: "#0FEBA8" }} />
                    <span className="text-[12px]" style={{ color: "var(--foreground)" }}>{p}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Credits & budget">
              <QuotaMeter label="Monthly send quota" used={monthlyLimit - creditsRemaining} total={monthlyLimit} />
              <div className="mt-3 space-y-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                {[["Company balance", formatNumber(creditsRemaining)], ["Monthly limit", formatNumber(monthlyLimit)], ["Your budget", "Unlimited"], ["MMS multiplier", "2x"]].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-[12px]">
                    <span style={{ color: "var(--muted-foreground)" }}>{l}</span>
                    <span className="font-mono font-semibold" style={{ color: "var(--foreground)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Compliance">
              <div className="space-y-2">
                {[["Quiet hours", "8 AM – 9 PM local"], ["STOP suppression", "Enabled"], ["Consent expiry", "24 months"], ["Opt-out message", "Reply STOP"]].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-[12px]">
                    <span style={{ color: "var(--muted-foreground)" }}>{l}</span>
                    <span className="font-semibold" style={{ color: "var(--foreground)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
