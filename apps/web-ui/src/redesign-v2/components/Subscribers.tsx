import { useState } from "react";
import { Link, Plus, Upload, UserPlus, X } from "lucide-react";
import { Btn, DataTable, Field, PageHeader, Panel, RoleStrip, SearchInput, SectionHeader } from "./ui-primitives";
import { formatNumber, useV2Data } from "../mockData";

type PanelType = "none" | "create-list" | "csv" | "single" | "optin";

export function Subscribers() {
  const { subscriberLists, subscribers, addSubscriber, importSubscribers, addSubscriberList } = useV2Data();
  const listCards = subscriberLists.map((list) => ({
    key: list.key,
    name: list.name,
    count: formatNumber(list.count),
    consent: list.consent,
    c: list.color,
  }));
  const listOptions = subscriberLists.filter((list) => list.key !== "all").map((list) => list.name);
  const [panel, setPanel] = useState<PanelType>("none");
  const [search, setSearch] = useState("");
  const [consent, setConsent] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [activeList, setActiveList] = useState("all");
  const [newListName, setNewListName] = useState("");
  const [newListScope, setNewListScope] = useState("All markets");
  const [csvText, setCsvText] = useState("+12065550142,Jane,Smith,Seattle");
  const [csvList, setCsvList] = useState(listOptions[0] ?? "Seattle VIP");
  const [csvConsentConfirmed, setCsvConsentConfirmed] = useState(true);
  const [singlePhone, setSinglePhone] = useState("");
  const [singleFirstName, setSingleFirstName] = useState("");
  const [singleLastName, setSingleLastName] = useState("");
  const [singleEmail, setSingleEmail] = useState("");
  const [singleList, setSingleList] = useState(listOptions[0] ?? "Seattle VIP");
  const [singleConsentConfirmed, setSingleConsentConfirmed] = useState(true);
  const [optInTitle, setOptInTitle] = useState("Join Demo Retail SMS");
  const [optInList, setOptInList] = useState(listOptions[0] ?? "Seattle VIP");
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const activeCard = listCards.find((l) => l.key === activeList) ?? listCards[0];
  const setSuccess = (message: string) => {
    setStatus(message);
    setStatusTone("success");
  };
  const setError = (error: unknown) => {
    setStatus(error instanceof Error ? error.message : "Action could not be completed.");
    setStatusTone("error");
  };

  const filtered = subscribers.filter((s) => {
    const query = search.toLowerCase();
    if (activeList !== "all" && !s.segments.includes(activeCard.name)) return false;
    if (query && ![s.phone, s.region, s.source, ...s.segments].some((v) => v.toLowerCase().includes(query))) return false;
    if (consent === "opted-in" && s.consent !== "Opted In") return false;
    if (consent === "opted-out" && s.consent !== "Opted Out") return false;
    return true;
  });
  const visibleRows = filtered.slice(0, pageSize);

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--background)" }}>
      <PageHeader title="Subscribers" description="Lists, consent, and subscriber management"
        action={
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" onClick={() => setPanel("csv")}><Upload size={12} /> CSV import</Btn>
            <Btn variant="accent" size="sm" onClick={() => setPanel("single")}><UserPlus size={12} /> Add subscriber</Btn>
          </div>
        }
      />
      <RoleStrip role="Customer Company Admin" company="Demo Retail Co" scope="Demo Retail Co only · All Markets" />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* List cards */}
          <div>
            <SectionHeader title="Subscriber lists" action={
              <Btn variant="ghost" size="xs" onClick={() => setPanel("create-list")}><Plus size={11} /> New list</Btn>
            } />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {listCards.map((l) => {
                const isActive = activeList === l.key;
                return (
                <div key={l.name}
                  className="rounded-xl p-4 cursor-pointer transition-all relative overflow-hidden"
                  style={{ background: isActive ? `${l.c}08` : "var(--card)", border: `1px solid ${isActive ? `${l.c}70` : `${l.c}20`}` }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  onClick={() => setActiveList(l.key)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveList(l.key);
                    }
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${l.c}40`)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = isActive ? `${l.c}70` : `${l.c}20`)}>
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${l.c}60, transparent)` }} />
                  <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>{l.name}</p>
                  <p className="text-[28px] font-black tabular-nums leading-none" style={{ color: l.c }}>{l.count}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--muted-foreground)" }}>Consent</span>
                    <span className="text-[12px] font-bold" style={{ color: "#34D399" }}>{l.consent}</span>
                  </div>
                </div>
              )})}
            </div>
          </div>

          {/* Table */}
          <Panel title={activeCard.name} action={
            <div className="flex items-center gap-2 flex-wrap">
              <SearchInput placeholder="Search…" value={search} onChange={setSearch} className="w-40" />
              <select aria-label="Subscriber consent filter" value={consent} onChange={(e) => setConsent(e.target.value)}
                className="h-7 rounded border px-2 text-[12px] focus:outline-none"
                style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }}>
                <option value="all">All consent</option>
                <option value="opted-in">Opted in</option>
                <option value="opted-out">Opted out</option>
              </select>
              <select aria-label="Subscriber page size" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-7 rounded border px-2 text-[12px] focus:outline-none"
                style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }}>
                <option value={25}>25/page</option><option value={50}>50/page</option><option value={100}>100/page</option>
              </select>
            </div>
          } noPad>
            <div className="px-3 py-2.5 text-[11px]" style={{ color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>
              Showing {visibleRows.length} of {filtered.length} sample records from {activeCard.count} {activeList === "all" ? "unique subscribers" : "segment members"}.
            </div>
            <DataTable
              columns={[
                { key: "phone",   label: "Phone",    mono: true },
                { key: "source",  label: "Source" },
                { key: "region",  label: "Region" },
                { key: "segments",label: "Segments" },
                { key: "consent", label: "Consent" },
                { key: "mkt",     label: "Marketing" },
                { key: "created", label: "Created" },
              ]}
              rows={visibleRows.map((s) => ({
                phone:   s.phone,
                source:  <span className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{s.source}</span>,
                region:  <span className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{s.region}</span>,
                segments: (
                  <div className="flex flex-wrap gap-1">
                    {s.segments.map((segment) => (
                      <span key={segment} className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                        {segment}
                      </span>
                    ))}
                  </div>
                ),
                consent: <span className="text-[11px] font-semibold"
                           style={{ color: s.consent === "Opted In" ? "#34D399" : "#F87171" }}>
                           {s.consent}
                         </span>,
                mkt:     <span className="text-[11px] font-semibold"
                           style={{ color: s.mkt === "Active" ? "#34D399" : s.mkt === "Suppressed" ? "#F87171" : "var(--muted-foreground)" }}>
                           {s.mkt}
                         </span>,
                created: <span className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{s.created}</span>,
              }))}
            />
          </Panel>
        </div>

        {/* Side panel */}
        {panel !== "none" && (
          <div className="w-80 shrink-0 flex flex-col" style={{ background: "var(--card)", borderLeft: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-[13px] font-bold" style={{ color: "var(--foreground)" }}>
                {{ "create-list": "Create list", csv: "CSV import", single: "Add subscriber", optin: "Public opt-in" }[panel]}
              </p>
              <button aria-label="Close subscriber panel" onClick={() => setPanel("none")} style={{ color: "var(--muted-foreground)" }}><X size={14} /></button>
            </div>
            {status && (
              <div className="px-4 py-2 text-[11px]" style={{ borderBottom: "1px solid var(--border)", color: statusTone === "success" ? "#0FEBA8" : "#F87171" }}>
                {status}
              </div>
            )}

            {/* Sub-tabs */}
            <div className="flex shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              {(["create-list", "csv", "single", "optin"] as PanelType[]).filter(p => p !== "none").map((p) => (
                <button key={p} onClick={() => setPanel(p)}
                  className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors"
                  style={panel === p
                    ? { borderColor: "#0FEBA8", color: "#0FEBA8" }
                    : { borderColor: "transparent", color: "var(--muted-foreground)" }}>
                  {{ "create-list": "List", csv: "CSV", single: "Single", optin: "Opt-in" }[p]}
                </button>
              ))}
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {panel === "create-list" && <>
                <Field label="List name" placeholder="e.g. Pacific NW VIP" value={newListName} onChange={setNewListName} />
                <Field label="Description" type="textarea" placeholder="Optional…" />
                <Field label="Region scope" type="select" options={["All markets", "Seattle metro", "West region", "National"]} value={newListScope} onChange={setNewListScope} />
                <Btn variant="accent" disabled={!newListName.trim()} onClick={() => {
                  try {
                    const list = addSubscriberList(newListName.trim(), newListScope);
                    setActiveList(list.key);
                    setNewListName("");
                    setSuccess(`Created ${list.name}`);
                  } catch (error) {
                    setError(error);
                  }
                }} className="w-full justify-center">Create list</Btn>
              </>}

              {panel === "csv" && <>
                <div className="rounded-lg p-5 text-center cursor-pointer transition-all"
                  style={{ border: "1.5px dashed var(--border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(15,235,168,0.4)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
                  <Upload size={18} className="mx-auto mb-2" style={{ color: "var(--muted-foreground)" }} />
                  <p className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>Drop CSV file</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>Phone, first_name, last_name, region</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted-foreground)" }}>Or paste CSV data</p>
                  <textarea rows={4} placeholder="+12065550142,Jane,Smith,Seattle" value={csvText} onChange={(e) => setCsvText(e.target.value)}
                    className="w-full rounded border text-[11px] font-mono px-3 py-2 resize-none focus:outline-none"
                    style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                </div>
                <Field label="Import to list" type="select" options={listOptions} value={csvList} onChange={setCsvList} />
                <label className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={csvConsentConfirmed} onChange={(e) => setCsvConsentConfirmed(e.target.checked)} className="accent-[#0FEBA8]" />
                  <span className="text-[12px]" style={{ color: "var(--foreground)" }}>Confirm all imported subscribers consented</span>
                </label>
                <Btn variant="accent" disabled={!csvText.trim() || !csvConsentConfirmed} onClick={() => {
                  try {
                    const count = importSubscribers(csvText, csvList, csvConsentConfirmed);
                    setSuccess(`Imported ${count} subscriber${count === 1 ? "" : "s"} into ${csvList}`);
                  } catch (error) {
                    setError(error);
                  }
                }} className="w-full justify-center">Import subscribers</Btn>
              </>}

              {panel === "single" && <>
                <Field label="Phone number" type="tel" placeholder="+1 (206) 555-0142" value={singlePhone} onChange={setSinglePhone} />
                <Field label="First name" placeholder="Jane" value={singleFirstName} onChange={setSingleFirstName} />
                <Field label="Last name" placeholder="Smith" value={singleLastName} onChange={setSingleLastName} />
                <Field label="Email (optional)" type="email" placeholder="jane@example.com" value={singleEmail} onChange={setSingleEmail} />
                <Field label="Add to list" type="select" options={listOptions} value={singleList} onChange={setSingleList} />
                <label className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={singleConsentConfirmed} onChange={(e) => setSingleConsentConfirmed(e.target.checked)} className="accent-[#0FEBA8]" />
                  <span className="text-[12px]" style={{ color: "var(--foreground)" }}>Confirm subscriber consent</span>
                </label>
                <Btn variant="accent" disabled={!singlePhone.trim() || !singleConsentConfirmed} onClick={() => {
                  try {
                    const subscriber = addSubscriber({ phone: singlePhone, firstName: singleFirstName, lastName: singleLastName, email: singleEmail, listName: singleList, consentConfirmed: singleConsentConfirmed });
                    setSuccess(`Added ${subscriber.phone} to ${singleList}`);
                    setSinglePhone("");
                    setSingleFirstName("");
                    setSingleLastName("");
                    setSingleEmail("");
                    setSingleConsentConfirmed(true);
                  } catch (error) {
                    setError(error);
                  }
                }} className="w-full justify-center">Add subscriber</Btn>
              </>}

              {panel === "optin" && <>
                <div className="p-3 rounded-lg" style={{ background: "rgba(15,235,168,0.06)", border: "1px solid rgba(15,235,168,0.2)" }}>
                  <p className="text-[11px] font-bold mb-1.5" style={{ color: "#0FEBA8" }}>Public opt-in link</p>
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] flex-1 truncate font-mono" style={{ color: "rgba(255,255,255,0.6)" }}>
                      campaignos.io/optin/demo-retail
                    </code>
                    <button onClick={() => {
                      navigator.clipboard?.writeText("https://campaignos.io/optin/demo-retail").catch(() => {});
                      setSuccess("Opt-in link copied");
                    }} className="hover:opacity-70" style={{ color: "#0FEBA8" }} aria-label="Copy opt-in link"><Link size={13} /></button>
                  </div>
                </div>
                <Field label="Landing page title" placeholder="Join Demo Retail SMS" value={optInTitle} onChange={setOptInTitle} />
                <Field label="Default list" type="select" options={listOptions} value={optInList} onChange={setOptInList} />
                <Btn variant="accent" onClick={() => setSuccess("Opt-in page settings saved")} className="w-full justify-center">Save opt-in page</Btn>
              </>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
