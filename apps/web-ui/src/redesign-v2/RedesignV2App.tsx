import { useEffect, useState } from "react";
import { Sidebar, MobileHeader } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Campaigns } from "./components/Campaigns";
import { NewCampaign } from "./components/NewCampaign";
import { BroadcastMonitor } from "./components/BroadcastMonitor";
import { Subscribers } from "./components/Subscribers";
import { ContentLibrary } from "./components/ContentLibrary";
import { Analytics } from "./components/Analytics";
import { Settings } from "./components/Settings";
import { AdminDashboard } from "./components/AdminDashboard";
import { Companies } from "./components/Companies";
import { Usage } from "./components/Usage";
import { V2DataProvider } from "./mockData";
import type { AdminPage, CampaignSubpage, CompanyPage } from "../types";

/* MARKER-MAKE-KIT-INVOKED */

type Screen =
  | "dashboard" | "campaigns" | "new-campaign" | "monitor"
  | "subscribers" | "content" | "analytics" | "settings"
  | "admin-dashboard" | "companies" | "usage";

const pageTitles: Record<Screen, string> = {
  "dashboard": "Dashboard",
  "campaigns": "Campaigns",
  "new-campaign": "New Campaign",
  "monitor": "Broadcast Monitor",
  "subscribers": "Subscribers",
  "content": "Content Library",
  "analytics": "Analytics",
  "settings": "Settings",
  "admin-dashboard": "Admin Dashboard",
  "companies": "Companies",
  "usage": "Platform Usage",
};

type RedesignMode = "company" | "admin";

const companyScreenByPage: Record<CompanyPage, Screen> = {
  dashboard: "dashboard",
  campaigns: "campaigns",
  subscribers: "subscribers",
  content: "content",
  analytics: "analytics",
  settings: "settings",
};

const adminScreenByPage: Record<AdminPage, Screen> = {
  dashboard: "admin-dashboard",
  companies: "companies",
  usage: "usage",
};

function screenFromRoute({
  mode,
  companyPage,
  adminPage,
  campaignSubpage,
}: {
  mode: RedesignMode;
  companyPage: CompanyPage;
  adminPage: AdminPage;
  campaignSubpage?: CampaignSubpage;
}): Screen {
  if (mode === "admin") return adminScreenByPage[adminPage];
  if (campaignSubpage === "create") return "new-campaign";
  if (campaignSubpage === "monitor") return "monitor";
  return companyScreenByPage[companyPage];
}

export function RedesignV2App({
  initialMode = "company",
  routeSyncMode = initialMode,
  companyPage = "dashboard",
  adminPage = "dashboard",
  campaignSubpage,
  onCompanyPage,
  onAdminPage,
}: {
  initialMode?: RedesignMode;
  routeSyncMode?: RedesignMode;
  companyPage?: CompanyPage;
  adminPage?: AdminPage;
  campaignSubpage?: CampaignSubpage;
  onCompanyPage?: (page: CompanyPage, options?: { campaignSubpage?: CampaignSubpage; path?: string }) => void;
  onAdminPage?: (page: AdminPage) => void;
}) {
  const [screen, setScreen] = useState<Screen>(() =>
    screenFromRoute({ mode: initialMode, companyPage, adminPage, campaignSubpage }),
  );
  const [mode, setMode] = useState<RedesignMode>(initialMode);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setScreen(screenFromRoute({ mode: initialMode, companyPage, adminPage, campaignSubpage }));
  }, [adminPage, campaignSubpage, companyPage, initialMode]);

  const handleNavigate = (key: string) => {
    const nextScreen = key as Screen;
    setScreen(nextScreen);

    if (routeSyncMode === "company") {
      if (nextScreen === "dashboard") onCompanyPage?.("dashboard");
      if (nextScreen === "campaigns") onCompanyPage?.("campaigns");
      if (nextScreen === "new-campaign") onCompanyPage?.("campaigns", { campaignSubpage: "create", path: "/app-v2/campaigns/new" });
      if (nextScreen === "monitor") onCompanyPage?.("campaigns", { campaignSubpage: "monitor", path: "/app-v2/monitor" });
      if (nextScreen === "subscribers") onCompanyPage?.("subscribers");
      if (nextScreen === "content") onCompanyPage?.("content");
      if (nextScreen === "analytics") onCompanyPage?.("analytics");
      if (nextScreen === "settings") onCompanyPage?.("settings");
    }

    if (routeSyncMode === "admin") {
      if (nextScreen === "admin-dashboard") onAdminPage?.("dashboard");
      if (nextScreen === "companies") onAdminPage?.("companies");
      if (nextScreen === "usage") onAdminPage?.("usage");
    }
  };

  return (
    <V2DataProvider>
      <div className="campaignos-redesign campaignos-redesign-v2 dark flex h-screen w-full overflow-hidden bg-background" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <Sidebar
          active={screen}
          onNavigate={handleNavigate}
          mode={mode}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <MobileHeader
            title={pageTitles[screen] || ""}
            onMenuOpen={() => setMobileOpen(true)}
          />

          <main className="flex-1 overflow-y-auto">
            {mode === "company" && screen === "dashboard" && (
              <Dashboard onNavigate={handleNavigate} />
            )}
            {mode === "company" && screen === "campaigns" && (
              <Campaigns onNavigate={handleNavigate} />
            )}
            {mode === "company" && screen === "new-campaign" && (
              <NewCampaign onBack={() => handleNavigate("campaigns")} onNavigate={handleNavigate} />
            )}
            {screen === "monitor" && (
              <BroadcastMonitor />
            )}
            {mode === "company" && screen === "subscribers" && (
              <Subscribers />
            )}
            {mode === "company" && screen === "content" && (
              <ContentLibrary onNavigate={handleNavigate} />
            )}
            {mode === "company" && screen === "analytics" && (
              <Analytics />
            )}
            {mode === "company" && screen === "settings" && (
              <Settings />
            )}
            {mode === "admin" && screen === "admin-dashboard" && (
              <AdminDashboard />
            )}
            {mode === "admin" && screen === "companies" && (
              <Companies />
            )}
            {mode === "admin" && screen === "usage" && (
              <Usage />
            )}
          </main>
        </div>
      </div>
    </V2DataProvider>
  );
}

export default RedesignV2App;
