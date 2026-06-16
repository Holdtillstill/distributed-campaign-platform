import { cn } from "./ui/utils";
import { LayoutDashboard, Megaphone, Users, BookOpen, BarChart3, Settings, Building2, Activity, Radio, Menu, X, ChevronRight, LogOut, type LucideIcon } from "lucide-react";
import { companyInitials, useV2Data } from "../mockData";

type NavItem = { key: string; label: string; icon: LucideIcon; badge?: string };

const companyNav: NavItem[] = [
  { key: "dashboard",   label: "Dashboard",       icon: LayoutDashboard },
  { key: "campaigns",   label: "Campaigns",       icon: Megaphone },
  { key: "subscribers", label: "Subscribers",     icon: Users },
  { key: "content",     label: "Content Library", icon: BookOpen },
  { key: "analytics",   label: "Analytics",       icon: BarChart3 },
  { key: "settings",    label: "Settings",        icon: Settings },
];

const adminNav: NavItem[] = [
  { key: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "companies",       label: "Companies", icon: Building2 },
  { key: "usage",           label: "Usage",     icon: Activity },
];

const BG = "#08090D";
const BORDER = "rgba(255,255,255,0.045)";

function NavContent({ active, onNavigate, mode, onClose, onLogout }: {
  active: string; onNavigate: (k: string) => void;
  mode: "company" | "admin";
  onClose?: () => void;
  onLogout?: () => void;
}) {
  const { campaigns, activeCompanyName, activeUserEmail, activeRoleLabel } = useV2Data();
  const activeCampaignCount = campaigns.filter((campaign) => campaign.status === "scheduled" || campaign.status === "queued").length;
  const nav = mode === "company"
    ? companyNav.map((item) => item.key === "campaigns" ? { ...item, badge: String(activeCampaignCount) } : item)
    : adminNav;
  const go = (k: string) => { onNavigate(k); onClose?.(); };
  const isAdminMode = mode === "admin";
  const roleLabel = isAdminMode ? "SaaS Internal Admin" : activeRoleLabel;
  const userInitials = isAdminMode ? "OP" : companyInitials(activeUserEmail.split("@")[0]?.replace(/[._-]+/g, " ") || activeCompanyName);
  const userEmail = isAdminMode ? "ops@example.test" : activeUserEmail;

  return (
    <div className="flex flex-col h-full select-none" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* Wordmark */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #0FEBA8 0%, #0BC8A0 100%)" }}>
            <Radio size={13} color="#08090D" strokeWidth={2.5} />
          </div>
          <span className="text-[14px] font-bold tracking-tight" style={{ color: "#E4E6EF" }}>CampaignOS</span>
        </div>
        {onClose && (
          <button aria-label="Close navigation" onClick={onClose} className="lg:hidden p-1" style={{ color: "rgba(255,255,255,0.62)" }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* Workspace badge */}
      <div className="px-3 py-3 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="rounded-lg px-3 py-2.5 relative overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.66)" }}>
            {isAdminMode ? "Active console" : "Active company"}
          </p>
          <p className="text-[13px] font-semibold" style={{ color: "#E4E6EF" }}>
            {isAdminMode ? "CampaignOS SaaS" : activeCompanyName}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest"
              style={{ background: "rgba(15,235,168,0.12)", color: "#0FEBA8", border: "1px solid rgba(15,235,168,0.22)" }}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Scope context */}
      <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isAdminMode ? "#0FEBA8" : "rgba(255,255,255,0.58)" }}>
            {isAdminMode ? "Platform scope" : "Company scope"}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.66)" }}>
            {isAdminMode ? "All customer companies" : `${activeCompanyName} only`}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button key={item.key} onClick={() => go(item.key)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all text-left group"
              style={isActive
                ? { background: "rgba(15,235,168,0.1)", color: "#0FEBA8", border: "1px solid rgba(15,235,168,0.15)" }
                : { background: "transparent", color: "rgba(255,255,255,0.66)", border: "1px solid transparent" }}>
              <Icon size={15} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24" }}>
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight size={11} style={{ color: "rgba(15,235,168,0.5)" }} />}
            </button>
          );
        })}
      </nav>

      {/* Monitor shortcut */}
      {mode === "company" && (
        <div className="px-3 py-2 shrink-0" style={{ borderTop: `1px solid ${BORDER}` }}>
          <button onClick={() => go("monitor")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
            style={active === "monitor"
              ? { background: "rgba(15,235,168,0.08)", color: "#0FEBA8" }
              : { background: "transparent", color: "rgba(255,255,255,0.66)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: "#0FEBA8" }} />
            Broadcast Monitor
          </button>
        </div>
      )}

      {/* User row */}
      <div className="px-3 py-3 shrink-0" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #0FEBA8, #0BC8A0)", color: "#08090D" }}>{userInitials}</div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{userEmail}</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.66)" }}>{roleLabel}</p>
          </div>
        </div>
        {onLogout && (
          <button
            aria-label="Logout"
            onClick={() => {
              onClose?.();
              onLogout();
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg text-[12px] font-semibold transition-all"
            style={{
              minHeight: 34,
              color: "#E4E6EF",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
            }}
            type="button"
          >
            <LogOut size={13} />
            Log out
          </button>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ active, onNavigate, mode, mobileOpen, onMobileClose, onLogout }: {
  active: string; onNavigate: (k: string) => void;
  mode: "company" | "admin";
  mobileOpen?: boolean; onMobileClose?: () => void;
  onLogout?: () => void;
}) {
  return (
    <>
      <aside className="hidden lg:flex flex-col w-[216px] shrink-0 h-screen sticky top-0"
        style={{ background: BG, borderRight: `1px solid ${BORDER}` }}>
        <NavContent active={active} onNavigate={onNavigate} mode={mode} onLogout={onLogout} />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onMobileClose} />
          <aside className="relative z-10 flex flex-col w-64 h-full" style={{ background: BG }}>
            <NavContent active={active} onNavigate={onNavigate} mode={mode} onClose={onMobileClose} onLogout={onLogout} />
          </aside>
        </div>
      )}
    </>
  );
}

export function MobileHeader({ title, onMenuOpen, onLogout }: { title: string; onMenuOpen: () => void; onLogout?: () => void }) {
  return (
    <div className="lg:hidden flex items-center gap-3 px-4 h-12 shrink-0"
      style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}>
      <button aria-label="Open navigation" onClick={onMenuOpen} className="p-1" style={{ color: "rgba(255,255,255,0.68)" }}>
        <Menu size={18} />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "#0FEBA8" }}>
          <Radio size={10} color="#08090D" />
        </div>
        <span className="text-[13px] font-bold" style={{ color: "#E4E6EF" }}>CampaignOS</span>
      </div>
      <span className="text-[12px] truncate ml-1" style={{ color: "rgba(255,255,255,0.66)" }}>/ {title}</span>
      {onLogout && (
        <button
          aria-label="Log out"
          onClick={onLogout}
          className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold"
          style={{
            color: "#E4E6EF",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
          }}
          type="button"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Log out</span>
        </button>
      )}
    </div>
  );
}
