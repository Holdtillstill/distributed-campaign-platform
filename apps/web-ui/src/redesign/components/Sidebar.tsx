import { cn } from "./ui/utils";
import {
  LayoutDashboard, Megaphone, Users, BookOpen, BarChart3,
  Settings, Building2, Activity, ChevronRight, Radio, X, Menu,
  type LucideIcon,
} from "lucide-react";

type NavItem = { key: string; label: string; icon: LucideIcon; badge?: string };

const companyNav: NavItem[] = [
  { key: "dashboard",   label: "Dashboard",      icon: LayoutDashboard },
  { key: "campaigns",   label: "Campaigns",      icon: Megaphone,  badge: "3" },
  { key: "subscribers", label: "Subscribers",    icon: Users },
  { key: "content",     label: "Content Library",icon: BookOpen },
  { key: "analytics",   label: "Analytics",      icon: BarChart3 },
  { key: "settings",    label: "Settings",       icon: Settings },
];

const adminNav: NavItem[] = [
  { key: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "companies",       label: "Companies", icon: Building2 },
  { key: "usage",           label: "Usage",     icon: Activity },
];

function NavInner({ active, onNavigate, mode, onModeChange, onMobileClose }: {
  active: string; onNavigate: (k: string) => void;
  mode: "company" | "admin"; onModeChange: (m: "company" | "admin") => void;
  onMobileClose?: () => void;
}) {
  const nav = mode === "company" ? companyNav : adminNav;
  const go = (k: string) => { onNavigate(k); onMobileClose?.(); };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-[56px] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-teal-500 flex items-center justify-center shrink-0">
            <Radio size={14} className="text-white" />
          </div>
          <span className="text-[14px] font-semibold text-white tracking-tight">CampaignOS</span>
        </div>
        {onMobileClose && (
          <button onClick={onMobileClose} className="text-white/40 hover:text-white lg:hidden p-1">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Workspace chip */}
      <div className="px-3 py-3 border-b border-white/5 shrink-0">
        <div className="px-2.5 py-2 rounded bg-white/5">
          <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">Workspace</p>
          <p className="text-[13px] font-medium text-white">Demo Retail Co</p>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 font-semibold uppercase tracking-wide border border-teal-500/20">Customer Admin</span>
            <span className="text-[11px] text-white/35 truncate">owner@demo-retail.test</span>
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="px-3 py-2.5 border-b border-white/5 shrink-0">
        <div className="flex rounded overflow-hidden border border-white/10">
          {(["company", "admin"] as const).map((m) => (
            <button key={m} onClick={() => onModeChange(m)}
              className={cn("flex-1 text-[11px] py-1.5 font-medium transition-colors capitalize",
                mode === m ? "bg-teal-600 text-white" : "text-white/45 hover:text-white/75")}>
              {m === "company" ? "Workspace" : "Admin"}
            </button>
          ))}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button key={item.key} onClick={() => go(item.key)}
              className={cn("w-full flex items-center gap-2.5 px-3 py-[7px] rounded text-[13px] font-medium transition-all text-left group",
                isActive ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80 hover:bg-white/5")}>
              <Icon size={15} className={cn(isActive ? "text-teal-400" : "text-white/35 group-hover:text-white/55")} />
              <span className="flex-1 min-w-0 truncate">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/20">{item.badge}</span>
              )}
              {isActive && <ChevronRight size={11} className="text-white/25 shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Broadcast monitor shortcut */}
      {mode === "company" && (
        <div className="px-3 py-2 border-t border-white/5 shrink-0">
          <button onClick={() => go("monitor")}
            className={cn("w-full flex items-center gap-2 px-3 py-1.5 rounded text-[12px] font-medium transition-all",
              active === "monitor" ? "bg-teal-600/25 text-teal-300" : "text-white/35 hover:text-white/60 hover:bg-white/5")}>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse shrink-0" />
            Broadcast Monitor
          </button>
        </div>
      )}

      {/* User */}
      <div className="px-3 py-3 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">OD</div>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-white/75 truncate">owner@demo-retail.test</p>
            <p className="text-[11px] text-white/30">Customer Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ active, onNavigate, mode, onModeChange, mobileOpen, onMobileClose }: {
  active: string; onNavigate: (k: string) => void;
  mode: "company" | "admin"; onModeChange: (m: "company" | "admin") => void;
  mobileOpen?: boolean; onMobileClose?: () => void;
}) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-[220px] shrink-0 h-screen sticky top-0" style={{ background: "#0F1117", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
        <NavInner active={active} onNavigate={onNavigate} mode={mode} onModeChange={onModeChange} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="relative z-10 flex flex-col w-64 h-full" style={{ background: "#0F1117" }}>
            <NavInner active={active} onNavigate={onNavigate} mode={mode} onModeChange={onModeChange} onMobileClose={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  );
}

export function MobileHeader({ title, onMenuOpen }: { title: string; onMenuOpen: () => void }) {
  return (
    <div className="lg:hidden flex items-center gap-3 px-4 h-12 shrink-0" style={{ background: "#0F1117", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <button onClick={onMenuOpen} className="text-white/50 hover:text-white p-1">
        <Menu size={18} />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-teal-500 flex items-center justify-center">
          <Radio size={10} className="text-white" />
        </div>
        <span className="text-[13px] font-semibold text-white">CampaignOS</span>
      </div>
      <span className="text-[12px] text-white/40 ml-1 truncate">/ {title}</span>
    </div>
  );
}
