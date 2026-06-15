import { useState } from "react";
import { Copy, ExternalLink, Image, Plus, ChevronDown, Upload } from "lucide-react";
import { Button, Panel, PageHeader, SearchInput } from "./ui-primitives";

const templates = [
  { id: "1", name: "Memorial Day 30% Off Hero",    type: "SMS", chars: 98,  tags: ["holiday", "discount"], preview: "🎉 Memorial Day SALE! Get 30% off everything at Demo Retail. Shop now → {link} Reply STOP to opt out." },
  { id: "2", name: "VIP Loyalty Double Points",    type: "SMS", chars: 148, tags: ["loyalty", "vip"],      preview: "Hi {first_name}! As a VIP member, earn DOUBLE points this weekend only. Shop online → {link} STOP to unsubscribe." },
  { id: "3", name: "Weekend Flash Sale MMS",       type: "MMS", chars: 102, tags: ["sale", "urgent"],      preview: "⚡ FLASH SALE — 48 hrs only! Up to 50% off selected styles. Tap to shop → {link} Reply STOP to opt out." },
  { id: "4", name: "Winback Offer",                type: "SMS", chars: 134, tags: ["winback"],            preview: "We miss you, {first_name}! Here's 20% off your next purchase → {link} Expires in 72 hrs. STOP to opt out." },
  { id: "5", name: "New Arrivals Alert",           type: "SMS", chars: 119, tags: ["new-arrivals"],       preview: "New arrivals are here, {first_name}! Be the first to shop → {link} Reply STOP to unsubscribe." },
  { id: "6", name: "Appointment Reminder",         type: "SMS", chars: 127, tags: ["service"],            preview: "Hi {first_name}, your appointment is tomorrow at {time}. Questions? Call {phone}. Reply STOP to opt out." },
];

const media = [
  { id: "m1", name: "Summer Collection Hero",  type: "JPG", size: "284 KB", dims: "1200×628", url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=210&fit=crop&auto=format" },
  { id: "m2", name: "Memorial Day Banner",     type: "PNG", size: "412 KB", dims: "1200×628", url: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=210&fit=crop&auto=format" },
  { id: "m3", name: "Double Points VIP",       type: "JPG", size: "198 KB", dims: "800×800",  url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=210&fit=crop&auto=format" },
  { id: "m4", name: "Flash Sale Countdown",    type: "GIF", size: "823 KB", dims: "600×400",  url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=210&fit=crop&auto=format" },
  { id: "m5", name: "Winback Email Header",    type: "JPG", size: "156 KB", dims: "1200×400", url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=210&fit=crop&auto=format" },
  { id: "m6", name: "New Arrivals Mosaic",     type: "JPG", size: "378 KB", dims: "1200×628", url: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&h=210&fit=crop&auto=format" },
];

export function ContentLibrary() {
  const [tab, setTab] = useState<"templates" | "media">("templates");
  const [search, setSearch] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const filtered = templates.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col min-h-full bg-background">
      <PageHeader title="Content Library" description="SMS templates, media assets, and tracking tools"
        action={
          <div className="flex gap-2">
            {tab === "media" && <Button variant="outline" size="sm" className="text-[12px] h-8"><Upload size={12} /> Upload</Button>}
            <Button size="sm" className="bg-foreground hover:bg-gray-800 text-[12px] h-8"><Plus size={13} /> New template</Button>
          </div>
        }
      />

      <div className="flex-1 p-5 max-w-[1280px] mx-auto w-full space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex border-b border-transparent gap-0">
            {(["templates", "media"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-[12px] font-medium border-b-2 transition-colors capitalize ${
                  tab === t ? "border-teal-600 text-teal-700" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>
                {t === "templates" ? "SMS Templates" : "Media Assets"}
              </button>
            ))}
          </div>
          <SearchInput placeholder="Search content…" value={search} onChange={setSearch} className="w-52" />
        </div>

        {tab === "templates" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((t) => (
              <div key={t.id} className="bg-white border border-border rounded-md p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-[13px] font-semibold text-foreground">{t.name}</p>
                </div>
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${t.type === "MMS" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{t.type}</span>
                  <span className="text-[11px] text-muted-foreground">{t.chars} chars</span>
                  {t.tags.map((tag) => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">#{tag}</span>)}
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed border-l-2 border-border pl-3 mb-3">{t.preview}</p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-foreground hover:bg-gray-800 text-[11px] h-7">Use template</Button>
                  <Button variant="outline" size="sm" className="text-[11px] h-7" onClick={() => copy(t.id, t.preview)}>
                    <Copy size={10} /> {copied === t.id ? "Copied!" : "Copy SMS"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "media" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {media.map((asset) => (
              <div key={asset.id} className="bg-white border border-border rounded-md overflow-hidden hover:border-gray-300 transition-all group">
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white font-mono">{asset.type}</span>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-[12px] font-medium text-foreground truncate">{asset.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{asset.dims} · {asset.size}</p>
                  <div className="flex gap-1.5 mt-2">
                    <Button variant="outline" size="sm" className="flex-1 text-[11px] h-7">Use</Button>
                    <button className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-gray-300">
                      <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="bg-white border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center p-6 cursor-pointer hover:border-teal-400 transition-colors min-h-[140px]">
              <Upload size={18} className="text-muted-foreground mb-2" />
              <p className="text-[12px] font-medium">Add hosted asset</p>
              <p className="text-[11px] text-muted-foreground mt-1 text-center">JPG, PNG, GIF, MP4</p>
            </div>
          </div>
        )}

        {/* Advanced / developer — collapsed */}
        <div className="border border-border rounded-md overflow-hidden">
          <button onClick={() => setAdvanced(!advanced)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left">
            <div>
              <p className="text-[12px] font-medium text-muted-foreground">Advanced & developer tools</p>
              <p className="text-[11px] text-muted-foreground/60">Tracking links, API keys, webhooks</p>
            </div>
            <ChevronDown size={14} className={`text-muted-foreground transition-transform ${advanced ? "rotate-180" : ""}`} />
          </button>
          {advanced && (
            <div className="px-4 pb-4 border-t border-border">
              <div className="space-y-3 pt-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1.5">Destination URL</label>
                  <div className="flex gap-2">
                    <input type="url" placeholder="https://demo-retail.com/promo/summer"
                      className="flex-1 h-8 rounded border border-border bg-white text-[13px] px-3 focus:outline-none focus:ring-1 focus:ring-teal-500/30" />
                    <Button variant="outline" size="sm" className="text-[12px] h-8">Generate</Button>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded border border-border">
                  <p className="text-[11px] font-mono text-muted-foreground">https://trk.campaignos.io/c/demo-retail/abc123</p>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span>Click tracking: <strong className="text-foreground">Enabled</strong></span>
                  <span>UTM: <strong className="text-foreground">Auto-appended</strong></span>
                  <span>Redirect: <strong className="text-foreground">302</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
