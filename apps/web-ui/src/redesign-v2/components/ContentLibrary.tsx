import { useState } from "react";
import { ChevronDown, Copy, ExternalLink, Plus, Upload } from "lucide-react";
import { Btn, PageHeader, Panel, SearchInput } from "./ui-primitives";
import { useV2Data, type MessageType } from "../mockData";

export function ContentLibrary({ onNavigate }: { onNavigate: (k: string) => void }) {
  const { templates, mediaAssets, addTemplate, addMediaAsset, selectTemplate, selectMediaAsset } = useV2Data();
  const [tab, setTab] = useState<"templates" | "media">("templates");
  const [search, setSearch] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<MessageType>("SMS");
  const [newTags, setNewTags] = useState("promo");
  const [newPreview, setNewPreview] = useState("Hi {first_name}, shop our latest offer here -> {link}. Reply STOP to opt out.");
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("JPG");
  const [assetUrl, setAssetUrl] = useState("https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=210&fit=crop&auto=format");
  const [assetDims, setAssetDims] = useState("1200x628");
  const [assetSize, setAssetSize] = useState("260 KB");
  const [destinationUrl, setDestinationUrl] = useState("https://demo-retail.com/promo/summer");
  const [trackingUrl, setTrackingUrl] = useState("https://trk.campaignos.io/c/demo-retail/abc123");
  const [libraryMessage, setLibraryMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  const copy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id); setTimeout(() => setCopied(null), 1500);
  };

  const query = search.toLowerCase();
  const filtered = templates.filter((t) =>
    !query || t.name.toLowerCase().includes(query) || t.tags.some((tag) => tag.includes(query)) || t.preview.toLowerCase().includes(query),
  );
  const filteredMedia = mediaAssets.filter((asset) => !query || asset.name.toLowerCase().includes(query) || asset.type.toLowerCase().includes(query));
  const saveTemplate = () => {
    if (!newName.trim() || !newPreview.trim()) return;
    try {
      const template = addTemplate({
        name: newName.trim(),
        type: newType,
        tags: newTags.split(",").map((tag) => tag.trim()).filter(Boolean),
        preview: newPreview.trim(),
      });
      setNewName("");
      setNewType("SMS");
      setNewTags("promo");
      setNewPreview("Hi {first_name}, shop our latest offer here -> {link}. Reply STOP to opt out.");
      setCreating(false);
      setTab("templates");
      setLibraryMessage({ text: `Saved ${template.name}`, tone: "success" });
    } catch (error) {
      setLibraryMessage({ text: error instanceof Error ? error.message : "Template could not be saved.", tone: "error" });
    }
  };
  const saveMediaAsset = () => {
    if (!assetName.trim() || !assetUrl.trim()) return;
    try {
      const asset = addMediaAsset({
        name: assetName.trim(),
        type: assetType.trim().toUpperCase() || "JPG",
        size: assetSize.trim() || "260 KB",
        dims: assetDims.trim() || "1200x628",
        url: assetUrl.trim(),
      });
      setAssetName("");
      setAssetType("JPG");
      setAssetUrl("https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=210&fit=crop&auto=format");
      setAssetDims("1200x628");
      setAssetSize("260 KB");
      setUploading(false);
      setTab("media");
      setLibraryMessage({ text: `Saved ${asset.name}`, tone: "success" });
    } catch (error) {
      setLibraryMessage({ text: error instanceof Error ? error.message : "Media asset could not be saved.", tone: "error" });
    }
  };
  const generateTrackingUrl = () => {
    const suffix = btoa(destinationUrl.trim() || "demo-retail").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toLowerCase() || "abc123";
    setTrackingUrl(`https://trk.campaignos.io/c/demo-retail/${suffix}`);
  };

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--background)" }}>
      <PageHeader title="Content Library" description="SMS templates, media assets, and tracking tools"
        action={
          <div className="flex gap-2">
            {tab === "media" && <Btn variant="outline" size="sm" onClick={() => setUploading(true)}><Upload size={12} /> Upload</Btn>}
            <Btn variant="accent" size="sm" onClick={() => setCreating(true)}><Plus size={13} /> New template</Btn>
          </div>
        }
      />
      <div className="flex-1 p-5 max-w-[1300px] mx-auto w-full space-y-4">

        {/* Tab + search */}
        <div className="flex items-center justify-between">
          <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
            {(["templates", "media"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="px-3 py-2.5 text-[12px] font-semibold border-b-2 transition-colors capitalize"
                style={tab === t ? { borderColor: "#0FEBA8", color: "#0FEBA8" } : { borderColor: "transparent", color: "var(--muted-foreground)" }}>
                {t === "templates" ? "SMS Templates" : "Media Assets"}
              </button>
            ))}
          </div>
          <SearchInput placeholder="Search content…" value={search} onChange={setSearch} className="w-52" />
        </div>
        {libraryMessage && (
          <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: libraryMessage.tone === "success" ? "rgba(15,235,168,0.06)" : "rgba(248,113,113,0.08)", border: `1px solid ${libraryMessage.tone === "success" ? "rgba(15,235,168,0.18)" : "rgba(248,113,113,0.22)"}`, color: libraryMessage.tone === "success" ? "#0FEBA8" : "#F87171" }}>
            {libraryMessage.text}
          </div>
        )}

        {/* Templates */}
        {tab === "templates" && (
          <>
            {creating && (
              <Panel title="New template" action={
                <div className="flex gap-2">
                  <Btn variant="ghost" size="xs" onClick={() => setCreating(false)}>Cancel</Btn>
                  <Btn variant="accent" size="xs" disabled={!newName.trim() || !newPreview.trim()} onClick={saveTemplate}>Save template</Btn>
                </div>
              }>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_130px] gap-3 mb-3">
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Template name"
                    className="h-8 rounded border px-3 text-[13px] focus:outline-none"
                    style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                  <select value={newType} onChange={(e) => setNewType(e.target.value as MessageType)}
                    className="h-8 rounded border px-3 text-[13px] focus:outline-none"
                    style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }}>
                    <option>SMS</option>
                    <option>MMS</option>
                  </select>
                </div>
                <input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="Tags, comma separated"
                  className="h-8 rounded border px-3 text-[13px] focus:outline-none mb-3 w-full"
                  style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                <textarea value={newPreview} onChange={(e) => setNewPreview(e.target.value)} rows={3}
                  className="w-full rounded border px-3 py-2 text-[13px] resize-none focus:outline-none"
                  style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
              </Panel>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filtered.map((t) => (
                <div key={t.id} className="rounded-xl p-4 transition-all"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
                <div className="flex items-start gap-2 mb-3">
                  <p className="flex-1 text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>{t.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border font-mono font-bold shrink-0"
                    style={t.type === "MMS"
                      ? { background: "rgba(167,139,250,0.1)", color: "#A78BFA", borderColor: "rgba(167,139,250,0.2)" }
                      : { background: "rgba(96,165,250,0.1)",  color: "#60A5FA",  borderColor: "rgba(96,165,250,0.2)" }}>
                    {t.type}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t.chars} chars</span>
                  {t.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      style={{ background: "rgba(255,255,255,0.04)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                      #{tag}
                    </span>
                  ))}
                </div>
                {/* Message preview with left border accent */}
                <div className="pl-3 mb-4" style={{ borderLeft: "2px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{t.preview}</p>
                </div>
                <div className="flex gap-2">
                  <Btn variant="accent" size="sm" onClick={() => { selectTemplate(t); onNavigate("new-campaign"); }}>Use template</Btn>
                  <Btn variant="outline" size="sm" onClick={() => copy(t.id, t.preview)}>
                    <Copy size={10} /> {copied === t.id ? "Copied!" : "Copy SMS"}
                  </Btn>
                </div>
              </div>
              ))}
            </div>
          </>
        )}

        {/* Media */}
        {tab === "media" && (
          <>
            {uploading && (
              <Panel title="Add hosted asset" action={
                <div className="flex gap-2">
                  <Btn variant="ghost" size="xs" onClick={() => setUploading(false)}>Cancel</Btn>
                  <Btn variant="accent" size="xs" disabled={!assetName.trim() || !assetUrl.trim()} onClick={saveMediaAsset}>Save asset</Btn>
                </div>
              }>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_110px] gap-3 mb-3">
                  <input value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Asset name"
                    className="h-8 rounded border px-3 text-[13px] focus:outline-none"
                    style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                  <input value={assetType} onChange={(e) => setAssetType(e.target.value)} placeholder="JPG"
                    className="h-8 rounded border px-3 text-[13px] focus:outline-none"
                    style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                  <input value={assetSize} onChange={(e) => setAssetSize(e.target.value)} placeholder="260 KB"
                    className="h-8 rounded border px-3 text-[13px] focus:outline-none"
                    style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_150px] gap-3">
                  <input value={assetUrl} onChange={(e) => setAssetUrl(e.target.value)} placeholder="https://..."
                    className="h-8 rounded border px-3 text-[13px] focus:outline-none"
                    style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                  <input value={assetDims} onChange={(e) => setAssetDims(e.target.value)} placeholder="1200x628"
                    className="h-8 rounded border px-3 text-[13px] focus:outline-none"
                    style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                </div>
              </Panel>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredMedia.map((asset) => (
                <div key={asset.id} className="rounded-xl overflow-hidden transition-all group"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
                  <div className="aspect-video relative overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold"
                        style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)" }}>
                        {asset.type}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-[12px] font-semibold truncate" style={{ color: "var(--foreground)" }}>{asset.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{asset.dims} · {asset.size}</p>
                    <div className="flex gap-1.5 mt-2">
                      <Btn variant="outline" size="xs" className="flex-1 justify-center" onClick={() => { selectMediaAsset(asset); onNavigate("new-campaign"); }}>Use</Btn>
                      <button aria-label={`Open ${asset.name}`} onClick={() => window.open(asset.url, "_blank", "noopener,noreferrer")} className="w-6 h-6 rounded border flex items-center justify-center transition-opacity hover:opacity-70"
                        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add card */}
              <div className="rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer transition-all min-h-[160px]"
                style={{ border: "1.5px dashed var(--border)" }}
                onClick={() => setUploading(true)}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(15,235,168,0.4)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
                <Upload size={18} className="mb-2" style={{ color: "var(--muted-foreground)" }} />
                <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>Add hosted asset</p>
                <p className="text-[11px] mt-0.5 text-center" style={{ color: "var(--muted-foreground)" }}>JPG, PNG, GIF, MP4</p>
              </div>
            </div>
          </>
        )}

        {/* Advanced tools */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <button onClick={() => setAdvanced(!advanced)}
            className="w-full flex items-center justify-between px-4 py-3 transition-all text-left hover:opacity-80">
            <div>
              <p className="text-[12px] font-semibold" style={{ color: "var(--muted-foreground)" }}>Advanced & developer tools</p>
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>Tracking links, API keys, webhooks</p>
            </div>
            <ChevronDown size={14} className={`transition-transform ${advanced ? "rotate-180" : ""}`} style={{ color: "var(--muted-foreground)" }} />
          </button>
          {advanced && (
            <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted-foreground)" }}>Destination URL</p>
                <div className="flex gap-2">
                  <input type="url" placeholder="https://demo-retail.com/promo/summer" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)}
                    className="flex-1 h-8 rounded border px-3 text-[13px] focus:outline-none"
                    style={{ background: "var(--input)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                  <Btn variant="outline" size="sm" onClick={generateTrackingUrl}>Generate</Btn>
                </div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                <p className="text-[11px] font-mono break-all" style={{ color: "var(--muted-foreground)" }}>{trackingUrl}</p>
              </div>
              <div className="flex items-center gap-4 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                <span>Click tracking: <strong style={{ color: "var(--foreground)" }}>Enabled</strong></span>
                <span>UTM: <strong style={{ color: "var(--foreground)" }}>Auto-appended</strong></span>
                <span>Redirect: <strong style={{ color: "var(--foreground)" }}>302</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
