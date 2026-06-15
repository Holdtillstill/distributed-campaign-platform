import { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronRight, Image, Search, X } from "lucide-react";
import { Button, Panel, PageHeader, QuotaMeter, RoleBudgetStrip } from "./ui-primitives";

type Step = "audience" | "message" | "review";

const lists = [
  { id: "seattle-vip", name: "Seattle VIP",      count: 2650000, consent: "100%" },
  { id: "west-loyalty", name: "West Loyalty",     count: 1840000, consent: "99.2%" },
  { id: "winback",      name: "Winback Shoppers", count: 950,     consent: "97.8%" },
];

const compliance = [
  { label: "Consent coverage",            key: "audience" },
  { label: "STOP suppression active",     key: "always" },
  { label: "Quiet hours enforced",        key: "always" },
  { label: "Sender identity verified",    key: "always" },
  { label: "Modeled reach confirmed",     key: "audience" },
];

export function NewCampaign({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>("audience");
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("2026-06-15");
  const [time, setTime] = useState("10:00");
  const [smsType, setSmsType] = useState<"regular" | "smart">("regular");

  const toggle = (id: string) =>
    setSelectedLists((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const reach = selectedLists.reduce((a, id) => a + (lists.find((l) => l.id === id)?.count ?? 0), 0);
  const estCredits = Math.ceil(reach * 0.001);
  const sample = Math.min(Math.ceil(reach * 0.00036), 1000);

  const checkOk = (key: string) => key === "always" ? true : key === "audience" ? selectedLists.length > 0 : false;
  const allOk = compliance.every((c) => checkOk(c.key));

  const steps: { key: Step; num: number; label: string }[] = [
    { key: "audience", num: 1, label: "Audience" },
    { key: "message",  num: 2, label: "Message & Media" },
    { key: "review",   num: 3, label: "Review & Schedule" },
  ];
  const stepIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex flex-col min-h-full bg-background">
      <PageHeader title="New Campaign" breadcrumb="Campaigns / New"
        description={`Step ${stepIdx + 1} of 3`}
        action={<Button variant="ghost" size="sm" onClick={onBack} className="text-[12px] h-7"><X size={13} /> Cancel</Button>}
      />
      <RoleBudgetStrip role="Customer Admin" company="Demo Retail Co" scope="All Markets" budget="Unlimited" />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Main */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Step tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {steps.map((s, i) => {
              const done = stepIdx > i;
              const cur = s.key === step;
              return (
                <div key={s.key} className="flex items-center gap-1">
                  <button onClick={() => done && setStep(s.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium transition-colors
                      ${cur ? "bg-foreground text-white" : done ? "text-teal-700 hover:bg-teal-50 cursor-pointer" : "text-muted-foreground cursor-default"}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
                      ${cur ? "bg-white text-foreground" : done ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-400"}`}>
                      {done ? "✓" : s.num}
                    </span>
                    {s.label}
                  </button>
                  {i < steps.length - 1 && <ChevronRight size={13} className="text-muted-foreground" />}
                </div>
              );
            })}
          </div>

          {/* STEP 1 — Audience */}
          {step === "audience" && (
            <Panel title="Select subscriber lists">
              <div className="space-y-2 mb-4">
                {lists.map((l) => {
                  const sel = selectedLists.includes(l.id);
                  return (
                    <label key={l.id} className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-all ${sel ? "border-teal-400 bg-teal-50/40" : "border-border hover:border-gray-300 hover:bg-gray-50"}`}>
                      <input type="checkbox" checked={sel} onChange={() => toggle(l.id)} className="accent-teal-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-medium text-foreground">{l.name}</span>
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono">{l.count.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground">Consent</p>
                        <p className="text-[12px] font-medium text-emerald-600">{l.consent}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-[12px] text-muted-foreground mb-2">Or search for a subscriber directly</p>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="Search by phone or email…" className="w-full h-8 rounded border border-border bg-white text-[13px] pl-8 pr-3 focus:outline-none focus:ring-1 focus:ring-teal-500/30" />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button size="sm" disabled={selectedLists.length === 0} onClick={() => setStep("message")} className="bg-foreground hover:bg-gray-800 text-[12px] h-8">
                  Continue to message <ChevronRight size={13} />
                </Button>
              </div>
            </Panel>
          )}

          {/* STEP 2 — Message */}
          {step === "message" && (
            <Panel title="Campaign details">
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1.5">Campaign name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Seattle VIP Double Points"
                    className="w-full h-8 rounded border border-border bg-white text-[13px] px-3 focus:outline-none focus:ring-1 focus:ring-teal-500/30" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1.5">SMS body</label>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5}
                    placeholder="Type your message… Use {first_name} for personalization. Reply STOP to opt out."
                    className="w-full rounded border border-border bg-white text-[13px] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500/30 resize-none" />
                  <div className="flex justify-between mt-1 text-[11px] text-muted-foreground">
                    <span>{body.length}/160 chars</span>
                    <span>Personalization: {"{first_name}"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-foreground mb-1.5">Scheduled date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                      className="w-full h-8 rounded border border-border bg-white text-[13px] px-3 focus:outline-none focus:ring-1 focus:ring-teal-500/30" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-foreground mb-1.5">Send time</label>
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                      className="w-full h-8 rounded border border-border bg-white text-[13px] px-3 focus:outline-none focus:ring-1 focus:ring-teal-500/30" />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1.5">Send type</label>
                  <div className="flex gap-2">
                    {[{ k: "regular" as const, l: "Regular SMS", d: "Send to all at once" }, { k: "smart" as const, l: "Smart SMS", d: "Throttled delivery" }].map((t) => (
                      <button key={t.k} onClick={() => setSmsType(t.k)}
                        className={`flex-1 p-2.5 rounded border text-left transition-all ${smsType === t.k ? "border-teal-400 bg-teal-50/40" : "border-border hover:border-gray-300"}`}>
                        <p className="text-[12px] font-medium">{t.l}</p>
                        <p className="text-[11px] text-muted-foreground">{t.d}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1.5">Media (optional MMS)</label>
                  <div className="border-2 border-dashed border-border rounded-md p-5 text-center hover:border-teal-400 transition-colors cursor-pointer">
                    <Image size={18} className="text-muted-foreground mx-auto mb-2" />
                    <p className="text-[12px] font-medium">Drop image or video</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG, GIF, MP4 · max 1MB</p>
                    <div className="mt-3 flex justify-center gap-2">
                      <Button variant="outline" size="sm" className="text-[11px] h-7">Browse files</Button>
                      <Button variant="ghost" size="sm" className="text-[11px] h-7">Content library</Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setStep("audience")} className="text-[12px] h-8">← Back</Button>
                  <Button size="sm" onClick={() => setStep("review")} className="bg-foreground hover:bg-gray-800 text-[12px] h-8">
                    Review campaign <ChevronRight size={13} />
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {/* STEP 3 — Review */}
          {step === "review" && (
            <div className="space-y-4">
              <Panel title="Compliance readiness">
                <div className="space-y-2">
                  {compliance.map((item) => {
                    const ok = checkOk(item.key);
                    return (
                      <div key={item.label} className="flex items-center gap-2">
                        {ok ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> : <AlertCircle size={14} className="text-red-500 shrink-0" />}
                        <span className={`text-[13px] ${ok ? "text-foreground" : "text-red-700 font-medium"}`}>{item.label}</span>
                        {!ok && <span className="text-[11px] text-red-500 ml-auto">Required</span>}
                      </div>
                    );
                  })}
                </div>
                {!allOk && (
                  <div className="mt-3 p-2.5 rounded bg-red-50 border border-red-200 flex items-start gap-2">
                    <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-red-700">Resolve all compliance requirements before scheduling.</p>
                  </div>
                )}
              </Panel>
              <Panel title="Campaign summary">
                <div className="space-y-0 divide-y divide-border text-[13px]">
                  {[
                    { l: "Campaign name", v: name || "Untitled" },
                    { l: "Scheduled", v: `${date} at ${time}` },
                    { l: "Send type", v: `${smsType} SMS` },
                    { l: "Lists", v: selectedLists.length > 0 ? selectedLists.join(", ") : "None" },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex justify-between py-2">
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-medium capitalize">{v}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <div className="flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => setStep("message")} className="text-[12px] h-8">← Back</Button>
                <Button size="sm" disabled={!allOk || !name} onClick={onBack} className="bg-teal-600 hover:bg-teal-500 text-[12px] h-8">
                  Schedule campaign →
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Inspector */}
        <div className="hidden lg:flex flex-col w-72 shrink-0 border-l border-border bg-white overflow-y-auto">
          <div className="px-4 py-3 border-b border-border shrink-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Campaign Inspector</p>
          </div>
          <div className="p-4 space-y-5">
            {/* Credits */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Credit estimate</p>
              <div className="space-y-2">
                {[
                  { l: "Modeled audience", v: reach.toLocaleString() },
                  { l: "Sample recipients", v: sample.toLocaleString() },
                  { l: "Est. campaign cost", v: `${estCredits.toLocaleString()} credits` },
                  { l: "Company balance", v: "4,797,750" },
                  { l: "Your budget", v: "Unlimited" },
                ].map(({ l, v }) => (
                  <div key={l} className="flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-medium tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <QuotaMeter label="Monthly quota" used={2250 + estCredits} total={4800000} />
              </div>
            </div>

            {/* Audience */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Audience</p>
              {selectedLists.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">No lists selected</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedLists.map((id) => {
                    const l = lists.find((x) => x.id === id)!;
                    return (
                      <div key={id} className="flex justify-between text-[12px]">
                        <span className="text-foreground">{l.name}</span>
                        <span className="font-mono text-muted-foreground">{l.count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-[12px] pt-1.5 border-t border-border">
                    <span className="font-medium">Total reach</span>
                    <span className="font-semibold text-teal-700 font-mono">{reach.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Compliance */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Compliance</p>
              <div className="space-y-1.5">
                {compliance.map((item) => {
                  const ok = checkOk(item.key);
                  return (
                    <div key={item.label} className="flex items-center gap-1.5">
                      {ok ? <CheckCircle2 size={11} className="text-emerald-500" /> : <AlertCircle size={11} className="text-red-500" />}
                      <span className="text-[11px] text-muted-foreground">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Message preview */}
            {body && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Message preview</p>
                <div className="p-3 rounded bg-gray-50 border border-border">
                  <p className="text-[12px] text-foreground leading-relaxed">{body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{body.length} chars · 1 segment</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
