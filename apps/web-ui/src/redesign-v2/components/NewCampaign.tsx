import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronRight, Image, X } from "lucide-react";
import { Btn, Field, Panel, PageHeader, QuotaMeter, RoleStrip } from "./ui-primitives";
import { formatNumber, isCampaignScheduleInFuture, QUIET_HOUR_END, QUIET_HOUR_START, useV2Data, type MessageType } from "../mockData";

type Step = "audience" | "message" | "review";

const compliance = [
  { label: "Consent coverage",           failureLabel: "Select a consented audience", dep: "audience" },
  { label: "STOP language present",      failureLabel: "Add STOP opt-out language",   dep: "stop" },
  { label: "Schedule is not in the past",failureLabel: "Schedule cannot be in the past", dep: "future" },
  { label: "Quiet hours (8am–9pm)",      failureLabel: "Choose an 8am–9pm send time", dep: "quiet" },
  { label: "Sender identity verified",   failureLabel: "Sender identity not verified", dep: "always" },
  { label: "Modeled reach confirmed",    failureLabel: "Confirm modeled reach",       dep: "audience" },
];

export function NewCampaign({ onBack, onNavigate }: { onBack: () => void; onNavigate: (k: string) => void }) {
  const { subscriberLists, selectedTemplate, selectedMediaAsset, mediaAssets, activeTenant, activeCompanyName, activeRoleLabel, createCampaign, selectTemplate, selectMediaAsset } = useV2Data();
  const lists = subscriberLists.filter((list) => list.name !== "All Subscribers");
  const monthlyLimit = activeTenant.monthlyLimit;
  const creditsRemaining = activeTenant.creditsRemaining;
  const [step, setStep] = useState<Step>("audience");
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("2026-06-15");
  const [time, setTime] = useState("10:00");
  const [smsType, setSmsType] = useState<"regular" | "smart">("regular");
  const [messageType, setMessageType] = useState<MessageType>("SMS");
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTemplate) return;
    setName(selectedTemplate.name);
    setBody(selectedTemplate.preview);
    setMessageType(selectedTemplate.type);
    setStep("audience");
  }, [selectedTemplate]);

  useEffect(() => {
    if (!selectedMediaAsset) return;
    setMessageType("MMS");
  }, [selectedMediaAsset]);

  useEffect(() => {
    setScheduleError(null);
  }, [body, date, messageType, name, selectedLists, time]);

  const toggle = (name: string) =>
    setSelectedLists((p) => p.includes(name) ? p.filter((x) => x !== name) : [...p, name]);

  const allSubscribers = subscriberLists.find((list) => list.key === "all")?.count ?? Number.MAX_SAFE_INTEGER;
  const summedReach = selectedLists.reduce((a, name) => a + (lists.find((l) => l.name === name)?.count ?? 0), 0);
  const reach = Math.min(summedReach, allSubscribers);
  const audienceWasDeduped = summedReach > reach;
  const estCredits = Math.ceil(reach * (messageType === "MMS" ? 0.002 : 0.001));
  const sample = Math.min(Math.ceil(reach * 0.00036), 1000);
  const sendHour = Number(time.split(":")[0] ?? 0);
  const hasAudience = selectedLists.length > 0;
  const hasStopLanguage = /\bSTOP\b/i.test(body);
  const isFutureSchedule = isCampaignScheduleInFuture(date, time);
  const isWithinQuietHours = sendHour >= QUIET_HOUR_START && sendHour < QUIET_HOUR_END;
  const hasMessage = body.trim().length > 0;
  const hasCampaignName = name.trim().length > 0;

  const checkOk = (dep: string) => {
    if (dep === "always") return true;
    if (dep === "audience") return hasAudience;
    if (dep === "stop") return hasStopLanguage;
    if (dep === "future") return isFutureSchedule;
    if (dep === "quiet") return isWithinQuietHours;
    return false;
  };
  const allOk = compliance.every((c) => checkOk(c.dep));
  const canReview = hasAudience && hasMessage && isFutureSchedule && isWithinQuietHours && hasStopLanguage;
  const canSchedule = allOk && hasCampaignName && hasMessage;
  const handleCancel = () => {
    selectTemplate(null);
    selectMediaAsset(null);
    onBack();
  };
  const handleSchedule = () => {
    try {
      createCampaign({ name, listNames: selectedLists, body, dateISO: date, time, type: messageType });
      setScheduleError(null);
      onBack();
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : "Campaign could not be scheduled.");
    }
  };

  const steps = [
    { key: "audience" as Step, num: 1, label: "Audience" },
    { key: "message"  as Step, num: 2, label: "Message" },
    { key: "review"   as Step, num: 3, label: "Review" },
  ];
  const stepIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--background)" }}>
      <PageHeader title="New Campaign" breadcrumb="Campaigns / New" description={`Step ${stepIdx + 1} of 3`}
        action={<Btn variant="ghost" size="sm" onClick={handleCancel}><X size={13} /> Cancel</Btn>}
      />
      <RoleStrip role={activeRoleLabel} company={activeCompanyName} scope={`${activeCompanyName} only · All Markets`} />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Main */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Step tabs */}
          <div className="flex items-center gap-1">
            {steps.map((s, i) => {
              const done = stepIdx > i;
              const cur = s.key === step;
              return (
                <div key={s.key} className="flex items-center gap-1">
                  <button onClick={() => done && setStep(s.key)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                    style={cur
                      ? { background: "#0FEBA8", color: "#0C0D12" }
                      : done
                      ? { background: "rgba(15,235,168,0.1)", color: "#0FEBA8", cursor: "pointer" }
                      : { background: "transparent", color: "var(--muted-foreground)", cursor: "default" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ background: cur ? "rgba(0,0,0,0.2)" : done ? "rgba(15,235,168,0.2)" : "rgba(255,255,255,0.06)" }}>
                      {done ? "✓" : s.num}
                    </span>
                    {s.label}
                  </button>
                  {i < steps.length - 1 && <ChevronRight size={13} style={{ color: "var(--muted-foreground)" }} />}
                </div>
              );
            })}
          </div>

          {selectedMediaAsset && (
            <div className="rounded-lg px-3 py-2 flex items-center justify-between gap-3"
              style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.22)", color: "#C4B5FD" }}>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold truncate">MMS asset loaded: {selectedMediaAsset.name}</p>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>{selectedMediaAsset.type} · {selectedMediaAsset.dims} · {selectedMediaAsset.size}</p>
              </div>
              <Btn variant="ghost" size="xs" onClick={() => selectMediaAsset(null)}>Clear</Btn>
            </div>
          )}

          {/* ── Step 1: Audience ── */}
          {step === "audience" && (
            <Panel title="Select subscriber lists">
              <div className="space-y-2 mb-4">
                {lists.map((l) => {
                  const sel = selectedLists.includes(l.name);
                  return (
                    <label key={l.key}
                      className="flex items-center gap-3 p-3.5 rounded-lg cursor-pointer transition-all"
                      style={{
                        border: sel ? `1px solid ${l.color}40` : "1px solid var(--border)",
                        background: sel ? `${l.color}08` : "transparent",
                      }}>
                      <input type="checkbox" checked={sel} onChange={() => toggle(l.name)}
                        className="w-4 h-4 rounded accent-[#0FEBA8]" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>{l.name}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded font-mono font-semibold"
                            style={{ background: `${l.color}12`, color: l.color, border: `1px solid ${l.color}25` }}>
                            {formatNumber(l.count)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Consent</p>
                        <p className="text-[12px] font-bold" style={{ color: "#34D399" }}>{l.consent}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end mt-4">
                <Btn variant="accent" disabled={selectedLists.length === 0} onClick={() => setStep("message")}>
                  Continue <ChevronRight size={13} />
                </Btn>
              </div>
            </Panel>
          )}

          {/* ── Step 2: Message ── */}
          {step === "message" && (
            <Panel title="Campaign details">
              <div className="space-y-4">
                {selectedTemplate && (
                  <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(15,235,168,0.06)", border: "1px solid rgba(15,235,168,0.18)", color: "#0FEBA8" }}>
                    Loaded template: {selectedTemplate.name}
                  </div>
                )}
                <Field label="Campaign name" placeholder="e.g. Seattle VIP Double Points" value={name} onChange={setName} />
                <div>
                  <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                    SMS body
                  </label>
                  <textarea aria-label="SMS body" value={body} onChange={(e) => setBody(e.target.value)} rows={5}
                    placeholder="Type your message… Use {first_name} for personalization. Reply STOP to opt out."
                    className="w-full rounded border text-[13px] px-3 py-2 focus:outline-none resize-none"
                    style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                  <div className="flex justify-between mt-1 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                    <span>{body.length}/160 chars · {Math.max(1, Math.ceil(body.length / 160))} segment{body.length > 160 ? "s" : ""}</span>
                    <span>{"{"}"first_name{"}"}</span>
                  </div>
                  {!hasStopLanguage && body && (
                    <p className="text-[11px] mt-1" style={{ color: "#F87171" }}>Add STOP opt-out language before review.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Scheduled date" type="date" value={date} onChange={setDate} />
                  <Field label="Send time" type="time" value={time} onChange={setTime} />
                </div>
                {(!isFutureSchedule || !isWithinQuietHours) && (
                  <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.22)", color: "#F87171" }}>
                    Schedule must be in the future and between 8:00 AM and 9:00 PM local time.
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-bold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Message type</p>
                  <div className="flex gap-2">
                    {(["SMS", "MMS"] as const).map((type) => (
                      <button key={type} onClick={() => {
                        if (selectedMediaAsset && type === "SMS") return;
                        setMessageType(type);
                      }}
                        disabled={Boolean(selectedMediaAsset && type === "SMS")}
                        className="px-3 py-2 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                        style={messageType === type
                          ? { background: "rgba(15,235,168,0.1)", color: "#0FEBA8", border: "1px solid rgba(15,235,168,0.25)" }
                          : { background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                        {type}
                      </button>
                    ))}
                  </div>
                  {selectedMediaAsset && (
                    <p className="text-[11px] mt-1.5" style={{ color: "var(--muted-foreground)" }}>Media attachments require MMS.</p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-bold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Send type</p>
                  <div className="flex gap-2">
                    {[{ k: "regular" as const, l: "Regular SMS", d: "Send all at once" }, { k: "smart" as const, l: "Smart SMS", d: "Throttled delivery" }].map((t) => (
                      <button key={t.k} onClick={() => setSmsType(t.k)}
                        className="flex-1 p-3 rounded-lg text-left transition-all"
                        style={{
                          border: smsType === t.k ? "1px solid rgba(15,235,168,0.3)" : "1px solid var(--border)",
                          background: smsType === t.k ? "rgba(15,235,168,0.06)" : "transparent",
                        }}>
                        <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>{t.l}</p>
                        <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t.d}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold mb-1.5 uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Media (optional MMS)</p>
                  {selectedMediaAsset ? (
                    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                      <div className="aspect-video max-h-52 overflow-hidden">
                        <img src={selectedMediaAsset.url} alt={selectedMediaAsset.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold truncate" style={{ color: "var(--foreground)" }}>{selectedMediaAsset.name}</p>
                          <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{selectedMediaAsset.type} · {selectedMediaAsset.dims} · {selectedMediaAsset.size}</p>
                        </div>
                        <Btn variant="outline" size="xs" onClick={() => selectMediaAsset(null)}>Clear</Btn>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg p-5 text-center cursor-pointer transition-all"
                      style={{ border: "1.5px dashed var(--border)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(15,235,168,0.4)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
                      <div className="w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
                        <Image size={16} style={{ color: "var(--muted-foreground)" }} />
                      </div>
                      <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>Drop image or video</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>JPG, PNG, GIF, MP4 · max 1MB</p>
                      <div className="mt-3 flex justify-center gap-2">
                        <Btn variant="outline" size="xs" onClick={() => {
                          selectMediaAsset(mediaAssets[0] ?? null);
                          setMessageType("MMS");
                        }}>Use demo asset</Btn>
                        <Btn variant="ghost" size="xs" onClick={() => onNavigate("content")}>Content library</Btn>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between pt-1">
                  <Btn variant="ghost" onClick={() => setStep("audience")}>← Back</Btn>
                  <Btn variant="accent" disabled={!canReview || !hasCampaignName} onClick={() => setStep("review")}>Review <ChevronRight size={13} /></Btn>
                </div>
              </div>
            </Panel>
          )}

          {/* ── Step 3: Review ── */}
          {step === "review" && (
            <div className="space-y-4">
              <Panel title="Compliance readiness">
                <div className="space-y-2.5">
                  {compliance.map((item) => {
                    const ok = checkOk(item.dep);
                    const label = ok ? item.label : item.failureLabel;
                    return (
                      <div key={item.label} className="flex items-center gap-2">
                        {ok
                          ? <CheckCircle2 size={14} style={{ color: "#34D399" }} />
                          : <AlertCircle size={14} style={{ color: "#F87171" }} />
                        }
                        <span className="text-[13px]" style={{ color: ok ? "var(--foreground)" : "#F87171" }}>{label}</span>
                        {!ok && <span className="ml-auto text-[10px] font-bold uppercase tracking-wider" style={{ color: "#F87171" }}>Required</span>}
                      </div>
                    );
                  })}
                </div>
              </Panel>
              <Panel title="Campaign summary">
                <div className="space-y-0 divide-y" style={{ borderColor: "var(--border)" }}>
                  {[
                    { l: "Campaign name", v: name || "Untitled" },
                    { l: "Scheduled",     v: `${date} at ${time}` },
                    { l: "Send mode",     v: `${smsType} ${messageType}` },
                    { l: "Lists",         v: selectedLists.length > 0 ? selectedLists.join(", ") : "None" },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex justify-between py-2.5 text-[13px]">
                      <span style={{ color: "var(--muted-foreground)" }}>{l}</span>
                      <span className="font-semibold capitalize" style={{ color: "var(--foreground)" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <div className="flex justify-between">
                <Btn variant="ghost" onClick={() => setStep("message")}>← Back</Btn>
                <Btn variant="accent" disabled={!canSchedule} onClick={handleSchedule}>Schedule campaign →</Btn>
              </div>
              {scheduleError && (
                <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.22)", color: "#F87171" }}>
                  {scheduleError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Inspector ── */}
        <div className="hidden lg:flex flex-col w-72 shrink-0 overflow-y-auto"
          style={{ background: "var(--card)", borderLeft: "1px solid var(--border)" }}>
          <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Campaign Inspector</p>
          </div>
          <div className="p-4 space-y-5 flex-1">

            {/* Credits */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted-foreground)" }}>Credit estimate</p>
              <div className="space-y-2">
                {[
                  { l: "Modeled audience",  v: formatNumber(reach) },
                  { l: "Sample recipients", v: formatNumber(sample) },
                  { l: "Est. cost",         v: `${formatNumber(estCredits)} credits` },
                  { l: "Company balance",   v: formatNumber(creditsRemaining) },
                  { l: "Your budget",       v: "Unlimited" },
                ].map(({ l, v }) => (
                  <div key={l} className="flex justify-between text-[12px]">
                    <span style={{ color: "var(--muted-foreground)" }}>{l}</span>
                    <span className="font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <QuotaMeter label="Monthly quota" used={(monthlyLimit - creditsRemaining) + estCredits} total={monthlyLimit} />
              </div>
            </div>

            {/* Audience */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted-foreground)" }}>Audience</p>
              {selectedLists.length === 0
                ? <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>No lists selected</p>
                : (
                  <div className="space-y-1.5">
                    {selectedLists.map((name) => {
                      const l = lists.find((x) => x.name === name)!;
                      return (
                        <div key={name} className="flex justify-between text-[12px]">
                          <span style={{ color: "var(--foreground)" }}>{l.name}</span>
                          <span className="font-mono" style={{ color: l.color }}>{formatNumber(l.count)}</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between text-[12px] pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                      <span className="font-semibold" style={{ color: "var(--foreground)" }}>Total reach</span>
                      <span className="font-bold font-mono" style={{ color: "#0FEBA8" }}>{formatNumber(reach)}</span>
                    </div>
                    {audienceWasDeduped && (
                      <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                        Overlapping list members deduped at All Subscribers.
                      </p>
                    )}
                  </div>
                )}
            </div>

            {/* Compliance */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted-foreground)" }}>Compliance</p>
              <div className="space-y-1.5">
                {compliance.map((item) => {
                  const ok = checkOk(item.dep);
                  const label = ok ? item.label : item.failureLabel;
                  return (
                    <div key={item.label} className="flex items-center gap-1.5">
                      {ok ? <CheckCircle2 size={11} style={{ color: "#34D399" }} /> : <AlertCircle size={11} style={{ color: "#F87171" }} />}
                      <span className="text-[11px]" style={{ color: ok ? "var(--muted-foreground)" : "#F87171" }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Message preview */}
            {body && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted-foreground)" }}>Preview</p>
                <div className="rounded-lg p-3" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--foreground)" }}>{body}</p>
                  <p className="text-[10px] mt-2" style={{ color: "var(--muted-foreground)" }}>{body.length} chars · 1 segment</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
