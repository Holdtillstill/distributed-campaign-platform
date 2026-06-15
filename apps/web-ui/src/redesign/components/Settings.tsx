import { useState } from "react";
import { Copy, Moon, Plus, Shield, Sun, Trash2, UserCog } from "lucide-react";
import { Button, DataTable, PageHeader, Panel, QuotaMeter } from "./ui-primitives";
import type { DesignTheme } from "../theme";

const team = [
  { name: "Owner Demo", email: "owner@demo-retail.test", role: "Customer Admin",    budget: "Unlimited" },
  { name: "Sarah K.",   email: "sk@demo-retail.test",    role: "Campaign Manager",  budget: "$50,000" },
  { name: "Marcus T.",  email: "mt@demo-retail.test",    role: "Regional Manager",  budget: "$25,000" },
  { name: "Alex R.",    email: "ar@demo-retail.test",    role: "Campaign Manager",  budget: "$10,000" },
];

const codes = [
  { code: "DMRT-A4F2-K8X1", role: "Campaign Manager",  created: "Jun 1, 2026",  uses: 1, max: 3, expires: "Jul 1, 2026" },
  { code: "DMRT-B9C3-M2Y7", role: "Regional Manager",  created: "May 15, 2026", uses: 1, max: 1, expires: "Jun 30, 2026" },
];

export function Settings({
  theme = "light",
  onThemeChange,
}: {
  theme?: DesignTheme;
  onThemeChange?: (theme: DesignTheme) => void;
}) {
  const [codeRole, setCodeRole] = useState("Campaign Manager");
  const [codeExpiry, setCodeExpiry] = useState("2026-07-31");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      <PageHeader title="Settings" description="Company identity, team access, compliance, and credits" />
      <div className="flex-1 p-5 max-w-[1100px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left 2-col */}
          <div className="lg:col-span-2 space-y-4">

            {/* Company identity */}
            <Panel title="Company identity">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-md bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl shrink-0">DR</div>
                <div>
                  <p className="text-[15px] font-semibold">Demo Retail Co</p>
                  <p className="text-[12px] text-muted-foreground">demo-retail · owner@demo-retail.test</p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto text-[12px] h-7">Edit</Button>
              </div>
              <div className="grid grid-cols-2 gap-0 divide-y divide-border text-[13px]">
                {[["Slug", "demo-retail"], ["Plan", "Enterprise"], ["Timezone", "America/Los_Angeles"], ["Member since", "Jan 1, 2026"]].map(([l, v]) => (
                  <div key={l} className="flex justify-between py-2">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Team */}
            <Panel title="Team members" action={<Button size="sm" className="bg-foreground hover:bg-gray-800 text-[11px] h-7"><Plus size={11} /> Invite</Button>}>
              <div className="-mx-4 -mb-4">
                <DataTable
                  columns={[
                    { key: "name", label: "Name" },
                    { key: "email", label: "Email" },
                    { key: "role", label: "Role" },
                    { key: "budget", label: "Budget", align: "right" },
                    { key: "actions", label: "" },
                  ]}
                  rows={team.map((m) => ({
                    name: (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-600 shrink-0">
                          {m.name.split(" ").map((p) => p[0]).join("")}
                        </div>
                        <span className="font-medium">{m.name}</span>
                      </div>
                    ),
                    email: <span className="text-[12px] text-muted-foreground font-mono">{m.email}</span>,
                    role: (
                      <span className={`text-[11px] px-1.5 py-0.5 rounded border font-medium ${
                        m.role === "Customer Admin" ? "bg-teal-50 text-teal-700 border-teal-200"
                        : m.role === "Regional Manager" ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                      }`}>{m.role}</span>
                    ),
                    budget: <span className="font-mono text-[12px]">{m.budget}</span>,
                    actions: (
                      <div className="flex gap-1">
                        <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-muted-foreground hover:text-foreground"><UserCog size={12} /></button>
                        <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"><Trash2 size={12} /></button>
                      </div>
                    ),
                  }))}
                />
              </div>
            </Panel>

            {/* Access codes */}
            <Panel title="Access codes">
              <div className="space-y-2.5 mb-4">
                {codes.map((c) => (
                  <div key={c.code} className="flex items-center gap-3 p-3 rounded border border-border bg-gray-50/60">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-[12px] font-mono font-semibold text-foreground">{c.code}</code>
                        <button onClick={() => copy(c.code)} className="text-muted-foreground hover:text-foreground"><Copy size={11} /></button>
                        {copied === c.code && <span className="text-[10px] text-teal-600">Copied!</span>}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">{c.role}</span>
                        <span>Uses: {c.uses}/{c.max}</span>
                        <span>Exp: {c.expires}</span>
                      </div>
                    </div>
                    <button className="text-muted-foreground hover:text-red-600 p-1 rounded hover:bg-red-50"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-[12px] font-medium mb-3">Create access code</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Role</label>
                    <select value={codeRole} onChange={(e) => setCodeRole(e.target.value)}
                      className="w-full h-8 rounded border border-border bg-white text-[13px] px-2">
                      {["Campaign Manager", "Regional Manager", "Customer Admin"].map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Expires</label>
                    <input type="date" value={codeExpiry} onChange={(e) => setCodeExpiry(e.target.value)}
                      className="w-full h-8 rounded border border-border bg-white text-[13px] px-3" />
                  </div>
                </div>
                <Button size="sm" className="bg-foreground hover:bg-gray-800 text-[12px] h-8"><Plus size={12} /> Generate access code</Button>
              </div>
            </Panel>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <Panel title="Your permissions">
              <div className="flex items-center gap-2 mb-3 p-2.5 bg-teal-50 rounded border border-teal-200">
                <Shield size={14} className="text-teal-600" />
                <span className="text-[12px] font-semibold text-teal-800">Customer Admin</span>
              </div>
              <div className="space-y-2">
                {["Create & manage campaigns","Manage subscribers & lists","View full analytics","Manage team access","Set user budgets","Configure compliance","Manage content library"].map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                    <span className="text-[12px]">{p}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Credits & budget">
              <QuotaMeter label="Monthly send quota" used={2250} total={4800000} />
              <div className="mt-3 space-y-1.5 pt-3 border-t border-border text-[12px]">
                {[["Company balance", "4,797,750"], ["Monthly limit", "4,800,000"], ["Your budget", "Unlimited"], ["MMS multiplier", "2×"]].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-mono font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Compliance">
              <div className="space-y-2">
                {[["Quiet hours", "8 AM – 9 PM local"], ["STOP suppression", "Enabled"], ["Consent expiry", "24 months"], ["Opt-out message", "Reply STOP"]].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <Button variant="outline" size="sm" className="text-[11px] h-7">Edit compliance settings</Button>
              </div>
            </Panel>

            {onThemeChange && (
              <Panel title="Appearance">
                <div className="grid grid-cols-2 gap-1 rounded border border-border bg-gray-50/60 p-1">
                  {(["light", "dark"] as const).map((option) => {
                    const Icon = option === "light" ? Sun : Moon;
                    const isActive = theme === option;
                    return (
                      <button
                        key={option}
                        onClick={() => onThemeChange(option)}
                        className={`flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[12px] font-semibold capitalize transition-colors ${
                          isActive ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                        aria-pressed={isActive}
                      >
                        <Icon size={13} />
                        {option}
                      </button>
                    );
                  })}
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
