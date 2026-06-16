import { createContext, useContext, useEffect, useMemo, useState, type Context, type ReactNode } from "react";
import type { Membership, Session } from "../types";

export type CampaignStatus = "scheduled" | "queued" | "sent" | "failed" | "cancelled";
export type MessageType = "SMS" | "MMS";
export type ListKey = "all" | "seattle-vip" | "west-loyalty" | "winback" | string;

export type SubscriberList = {
  tenantSlug?: string;
  key: ListKey;
  name: string;
  count: number;
  consent: string;
  color: string;
};

export type Subscriber = {
  tenantSlug?: string;
  phone: string;
  source: string;
  region: string;
  segments: string[];
  consent: "Opted In" | "Opted Out";
  mkt: "Active" | "Inactive" | "Suppressed";
  created: string;
};

export type Campaign = {
  tenantSlug?: string;
  id: string;
  name: string;
  status: CampaignStatus;
  date: string;
  dateISO: string;
  type: MessageType;
  reach: number;
  sample: number;
  credits: number;
  reminders: number;
  list: string;
  body?: string;
};

export type Template = {
  tenantSlug?: string;
  id: string;
  name: string;
  type: MessageType;
  chars: number;
  tags: string[];
  preview: string;
};

export type MediaAsset = {
  tenantSlug?: string;
  id: string;
  name: string;
  type: string;
  size: string;
  dims: string;
  url: string;
};

export type TeamMember = {
  tenantSlug?: string;
  name: string;
  email: string;
  role: string;
  budget: string;
  rc: string;
};

export type AccessCode = {
  tenantSlug?: string;
  code: string;
  role: string;
  created: string;
  uses: number;
  max: number;
  expires: string;
};

export type PlatformTenant = {
  name: string;
  slug: string;
  admin: string;
  subscribers: number;
  campaigns: number;
  scheduledReach: number;
  creditsRemaining: number;
  monthlyLimit: number;
  messages: number;
  media: number;
  links: number;
  clicks: number;
  reminders: number;
  created: string;
  accessCode: string;
  status: "active" | "suspended";
};

const initialLists: SubscriberList[] = [
  { key: "all", name: "All Subscribers", count: 2650000, consent: "99.1%", color: "#60A5FA" },
  { key: "seattle-vip", name: "Seattle VIP", count: 812400, consent: "99.8%", color: "#0FEBA8" },
  { key: "west-loyalty", name: "West Loyalty", count: 1840000, consent: "99.2%", color: "#34D399" },
  { key: "winback", name: "Winback Shoppers", count: 950, consent: "97.8%", color: "#FBBF24" },
];

const initialSubscribers: Subscriber[] = [
  { phone: "+1 (206) 555-0142", source: "CSV Import", region: "Seattle, WA", segments: ["Seattle VIP"], consent: "Opted In", mkt: "Active", created: "Jan 12, 2026" },
  { phone: "+1 (503) 555-0281", source: "API", region: "Portland, OR", segments: ["West Loyalty"], consent: "Opted In", mkt: "Active", created: "Feb 3, 2026" },
  { phone: "+1 (425) 555-0193", source: "Opt-in Form", region: "Bellevue, WA", segments: ["Seattle VIP", "West Loyalty"], consent: "Opted In", mkt: "Active", created: "Mar 7, 2026" },
  { phone: "+1 (360) 555-0348", source: "CSV Import", region: "Tacoma, WA", segments: ["Winback Shoppers"], consent: "Opted In", mkt: "Inactive", created: "Nov 20, 2025" },
  { phone: "+1 (509) 555-0172", source: "API", region: "Spokane, WA", segments: ["West Loyalty", "Winback Shoppers"], consent: "Opted Out", mkt: "Suppressed", created: "Oct 4, 2025" },
  { phone: "+1 (702) 555-0219", source: "CSV Import", region: "Las Vegas, NV", segments: ["West Loyalty"], consent: "Opted In", mkt: "Active", created: "Apr 15, 2026" },
  { phone: "+1 (206) 555-0188", source: "Retail POS", region: "Seattle, WA", segments: ["Seattle VIP"], consent: "Opted In", mkt: "Active", created: "May 2, 2026" },
  { phone: "+1 (253) 555-0117", source: "Opt-in Form", region: "Kent, WA", segments: ["Seattle VIP", "Winback Shoppers"], consent: "Opted In", mkt: "Active", created: "Dec 9, 2025" },
  { phone: "+1 (971) 555-0198", source: "API", region: "Beaverton, OR", segments: ["West Loyalty"], consent: "Opted In", mkt: "Active", created: "Jan 28, 2026" },
  { phone: "+1 (458) 555-0154", source: "CSV Import", region: "Eugene, OR", segments: ["West Loyalty"], consent: "Opted In", mkt: "Active", created: "Feb 21, 2026" },
  { phone: "+1 (564) 555-0133", source: "Retail POS", region: "Everett, WA", segments: ["Seattle VIP"], consent: "Opted In", mkt: "Active", created: "Mar 19, 2026" },
  { phone: "+1 (775) 555-0171", source: "API", region: "Reno, NV", segments: ["West Loyalty"], consent: "Opted In", mkt: "Active", created: "Apr 2, 2026" },
  { phone: "+1 (509) 555-0108", source: "CSV Import", region: "Yakima, WA", segments: ["West Loyalty"], consent: "Opted In", mkt: "Active", created: "Apr 8, 2026" },
  { phone: "+1 (360) 555-0166", source: "Opt-in Form", region: "Olympia, WA", segments: ["Seattle VIP"], consent: "Opted In", mkt: "Active", created: "Apr 22, 2026" },
  { phone: "+1 (208) 555-0191", source: "API", region: "Boise, ID", segments: ["West Loyalty"], consent: "Opted In", mkt: "Active", created: "May 4, 2026" },
  { phone: "+1 (206) 555-0129", source: "Retail POS", region: "Seattle, WA", segments: ["Seattle VIP", "West Loyalty"], consent: "Opted In", mkt: "Active", created: "May 12, 2026" },
  { phone: "+1 (425) 555-0174", source: "CSV Import", region: "Redmond, WA", segments: ["Seattle VIP"], consent: "Opted In", mkt: "Active", created: "May 18, 2026" },
  { phone: "+1 (541) 555-0139", source: "API", region: "Bend, OR", segments: ["West Loyalty"], consent: "Opted In", mkt: "Active", created: "May 21, 2026" },
  { phone: "+1 (702) 555-0182", source: "Opt-in Form", region: "Henderson, NV", segments: ["West Loyalty"], consent: "Opted In", mkt: "Active", created: "May 26, 2026" },
  { phone: "+1 (206) 555-0169", source: "Retail POS", region: "Seattle, WA", segments: ["Seattle VIP"], consent: "Opted Out", mkt: "Suppressed", created: "Jun 1, 2026" },
  { phone: "+1 (503) 555-0145", source: "CSV Import", region: "Salem, OR", segments: ["West Loyalty"], consent: "Opted In", mkt: "Active", created: "Jun 3, 2026" },
  { phone: "+1 (509) 555-0162", source: "API", region: "Walla Walla, WA", segments: ["West Loyalty"], consent: "Opted In", mkt: "Active", created: "Jun 5, 2026" },
  { phone: "+1 (425) 555-0114", source: "Opt-in Form", region: "Kirkland, WA", segments: ["Seattle VIP"], consent: "Opted In", mkt: "Active", created: "Jun 8, 2026" },
  { phone: "+1 (360) 555-0186", source: "CSV Import", region: "Bellingham, WA", segments: ["Winback Shoppers"], consent: "Opted In", mkt: "Inactive", created: "Jun 10, 2026" },
  { phone: "+1 (971) 555-0103", source: "Retail POS", region: "Portland, OR", segments: ["West Loyalty", "Winback Shoppers"], consent: "Opted In", mkt: "Active", created: "Jun 12, 2026" },
];

const subscriberSampleRegions = [
  "Seattle, WA",
  "Bellevue, WA",
  "Tacoma, WA",
  "Portland, OR",
  "Beaverton, OR",
  "Eugene, OR",
  "Spokane, WA",
  "Boise, ID",
  "Reno, NV",
  "Las Vegas, NV",
  "Yakima, WA",
  "Bend, OR",
];

const subscriberSampleSources = ["Retail POS", "CSV Import", "API", "Opt-in Form", "Ecommerce Sync"];
const subscriberSampleSegments = [
  ["Seattle VIP"],
  ["West Loyalty"],
  ["Seattle VIP", "West Loyalty"],
  ["Winback Shoppers"],
  ["West Loyalty", "Winback Shoppers"],
];

const generatedSubscriberSamples: Subscriber[] = Array.from({ length: 95 }, (_, index) => {
  const segments = subscriberSampleSegments[index % subscriberSampleSegments.length];
  const optedOut = index % 23 === 0;
  const inactive = segments.includes("Winback Shoppers") || index % 11 === 0;
  return {
    phone: `+1 (${["206", "425", "503", "509", "971"][index % 5]}) 555-${String(2000 + index).padStart(4, "0")}`,
    source: subscriberSampleSources[index % subscriberSampleSources.length],
    region: subscriberSampleRegions[index % subscriberSampleRegions.length],
    segments,
    consent: optedOut ? "Opted Out" : "Opted In",
    mkt: optedOut ? "Suppressed" : inactive ? "Inactive" : "Active",
    created: `May ${String((index % 28) + 1).padStart(2, "0")}, 2026`,
  };
});

const initialSubscriberRows = [...initialSubscribers, ...generatedSubscriberSamples];

const initialCampaigns: Campaign[] = [
  { id: "camp-seattle-vip", name: "Seattle VIP Double Points", status: "scheduled", date: "Jun 15, 2026 10:00 AM", dateISO: "2026-06-15", type: "SMS", reach: 812400, sample: 950, credits: 812, reminders: 2, list: "Seattle VIP" },
  { id: "camp-west-summer", name: "West Region Summer Preview", status: "scheduled", date: "Jun 18, 2026 9:00 AM", dateISO: "2026-06-18", type: "MMS", reach: 1840000, sample: 820, credits: 3680, reminders: 1, list: "West Loyalty" },
  { id: "camp-spring-clearance", name: "Spring Clearance", status: "queued", date: "Jun 14, 2026 8:00 AM", dateISO: "2026-06-14", type: "SMS", reach: 950, sample: 950, credits: 950, reminders: 0, list: "Winback Shoppers" },
  { id: "camp-mothers-day", name: "Mother's Day VIP Offer", status: "sent", date: "May 11, 2026 10:00 AM", dateISO: "2026-05-11", type: "SMS", reach: 812100, sample: 930, credits: 812, reminders: 3, list: "Seattle VIP" },
  { id: "camp-easter", name: "Easter Flash Sale", status: "sent", date: "Mar 30, 2026 9:00 AM", dateISO: "2026-03-30", type: "MMS", reach: 1820000, sample: 810, credits: 3640, reminders: 2, list: "West Loyalty" },
  { id: "camp-valentine", name: "Valentine's Winback", status: "failed", date: "Feb 13, 2026 8:00 AM", dateISO: "2026-02-13", type: "SMS", reach: 940, sample: 940, credits: 940, reminders: 0, list: "Winback Shoppers" },
  { id: "camp-january", name: "January Clearance", status: "cancelled", date: "Jan 5, 2026", dateISO: "2026-01-05", type: "SMS", reach: 950000, sample: 780, credits: 950, reminders: 1, list: "West Loyalty" },
];

const initialTemplates: Template[] = [
  { id: "tpl-memorial-day", name: "Memorial Day 30% Off Hero", type: "SMS", chars: 98, tags: ["holiday", "discount"], preview: "Memorial Day SALE! Get 30% off everything at Demo Retail. Shop now -> {link} Reply STOP to opt out." },
  { id: "tpl-vip-points", name: "VIP Loyalty Double Points", type: "SMS", chars: 148, tags: ["loyalty", "vip"], preview: "Hi {first_name}! As a VIP member, earn DOUBLE points this weekend only. Shop online -> {link} STOP to unsubscribe." },
  { id: "tpl-flash-mms", name: "Weekend Flash Sale MMS", type: "MMS", chars: 102, tags: ["sale", "urgent"], preview: "FLASH SALE - 48 hrs only! Up to 50% off selected styles. Tap to shop -> {link} Reply STOP to opt out." },
  { id: "tpl-winback", name: "Winback Offer", type: "SMS", chars: 134, tags: ["winback"], preview: "We miss you, {first_name}! Here's 20% off your next purchase -> {link} Expires in 72 hrs. STOP to opt out." },
  { id: "tpl-arrivals", name: "New Arrivals Alert", type: "SMS", chars: 119, tags: ["new-arrivals"], preview: "New arrivals are here! Be the first to shop -> {link} Reply STOP to unsubscribe." },
  { id: "tpl-appointment", name: "Appointment Reminder", type: "SMS", chars: 127, tags: ["service"], preview: "Hi {first_name}, your appointment is tomorrow at {time}. Questions? Call {phone}. Reply STOP to opt out." },
];

const initialMedia: MediaAsset[] = [
  { id: "m1", name: "Summer Collection Hero", type: "JPG", size: "284 KB", dims: "1200x628", url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=210&fit=crop&auto=format" },
  { id: "m2", name: "Memorial Day Banner", type: "PNG", size: "412 KB", dims: "1200x628", url: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=210&fit=crop&auto=format" },
  { id: "m3", name: "Double Points VIP", type: "JPG", size: "198 KB", dims: "800x800", url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=210&fit=crop&auto=format" },
  { id: "m4", name: "Flash Sale Countdown", type: "GIF", size: "823 KB", dims: "600x400", url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=210&fit=crop&auto=format" },
  { id: "m5", name: "Winback Email Header", type: "JPG", size: "156 KB", dims: "1200x400", url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=210&fit=crop&auto=format" },
  { id: "m6", name: "New Arrivals Mosaic", type: "JPG", size: "378 KB", dims: "1200x628", url: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&h=210&fit=crop&auto=format" },
];

const initialTeam: TeamMember[] = [
  { name: "Owner Demo", email: "owner@demo-retail.test", role: "Customer Company Admin", budget: "Unlimited", rc: "#0FEBA8" },
  { name: "Sarah K.", email: "sk@demo-retail.test", role: "Campaign Manager", budget: "$50,000", rc: "#60A5FA" },
  { name: "Marcus T.", email: "mt@demo-retail.test", role: "Regional Manager", budget: "$25,000", rc: "#A78BFA" },
  { name: "Alex R.", email: "ar@demo-retail.test", role: "Campaign Manager", budget: "$10,000", rc: "#60A5FA" },
];

const initialAccessCodes: AccessCode[] = [
  { code: "DMRT-A4F2-K8X1", role: "Campaign Manager", created: "Jun 1, 2026", uses: 1, max: 3, expires: "Jul 1, 2026" },
  { code: "DMRT-B9C3-M2Y7", role: "Regional Manager", created: "Jun 7, 2026", uses: 1, max: 1, expires: "Jun 21, 2026" },
];

const initialPlatformTenants: PlatformTenant[] = [
  { name: "Demo Retail Co", slug: "demo-retail", admin: "owner@demo-retail.test", subscribers: 2650000, campaigns: 3, scheduledReach: 2650000, creditsRemaining: 4797750, monthlyLimit: 4800000, messages: 2250, media: 6, links: 24, clicks: 41820, reminders: 8, created: "Jan 1, 2026", accessCode: "DEMORETA-E568C9", status: "active" },
  { name: "Pacific Grocery", slug: "pacific-grocery", admin: "ops@pacific-grocery.test", subscribers: 1230000, campaigns: 2, scheduledReach: 2100000, creditsRemaining: 1850000, monthlyLimit: 2000000, messages: 8240, media: 4, links: 18, clicks: 28400, reminders: 4, created: "Feb 15, 2026", accessCode: "pacific-grocery-invite", status: "active" },
  { name: "Northwest Fitness", slug: "nw-fitness", admin: "admin@nwfitness.test", subscribers: 84000, campaigns: 1, scheduledReach: 84000, creditsRemaining: 190000, monthlyLimit: 200000, messages: 3110, media: 2, links: 9, clicks: 10200, reminders: 2, created: "Mar 1, 2026", accessCode: "northwest-fitness-invite", status: "active" },
  { name: "Coastal Brands", slug: "coastal-brands", admin: "campaigns@coastal.test", subscribers: 420000, campaigns: 4, scheduledReach: 1200000, creditsRemaining: 48000, monthlyLimit: 500000, messages: 2890, media: 8, links: 31, clicks: 9800, reminders: 6, created: "Apr 10, 2026", accessCode: "coastal-brands-invite", status: "active" },
  { name: "Urban Eats", slug: "urban-eats", admin: "team@urbaneats.test", subscribers: 210000, campaigns: 0, scheduledReach: 0, creditsRemaining: 320000, monthlyLimit: 350000, messages: 1400, media: 1, links: 6, clicks: 5100, reminders: 1, created: "May 5, 2026", accessCode: "urban-eats-invite", status: "active" },
];

const PLATFORM_TENANTS_STORAGE_KEY = "campaignos-v2-platform-tenants";
const STATIC_DEMO_MEMBERSHIPS_STORAGE_KEY = "campaignos-v2-static-memberships";
const WORKSPACE_STORAGE_KEY = "campaignos-v2-workspace-state";
const DEMO_RETAIL_ACCESS_CODE = "DEMORETA-E568C9";
const MAX_ACCESS_CODE_DAYS = 30;
export const DEMO_TODAY = "2026-06-14";
export const DEMO_NOW_TIME = "15:30";
export const QUIET_HOUR_START = 8;
export const QUIET_HOUR_END = 21;
const TEAM_ROLES = ["Campaign Manager", "Regional Manager", "Customer Company Admin"];
const MEDIA_TYPES = ["JPG", "JPEG", "PNG", "GIF", "MP4", "WEBP"];

type WorkspaceState = {
  campaigns: Campaign[];
  subscriberLists: SubscriberList[];
  subscribers: Subscriber[];
  templates: Template[];
  mediaAssets: MediaAsset[];
  teamMembers: TeamMember[];
  accessCodes: AccessCode[];
};

const initialWorkspaceState: WorkspaceState = {
  campaigns: initialCampaigns,
  subscriberLists: initialLists,
  subscribers: initialSubscriberRows,
  templates: initialTemplates,
  mediaAssets: initialMedia,
  teamMembers: initialTeam,
  accessCodes: initialAccessCodes,
};

type NewCampaignInput = {
  name: string;
  listNames: string[];
  body: string;
  dateISO: string;
  time: string;
  type: MessageType;
};

type NewSubscriberInput = {
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  listName: string;
  consentConfirmed?: boolean;
};

type V2DataContextValue = {
  campaigns: Campaign[];
  subscriberLists: SubscriberList[];
  subscribers: Subscriber[];
  templates: Template[];
  mediaAssets: MediaAsset[];
  teamMembers: TeamMember[];
  accessCodes: AccessCode[];
  platformTenants: PlatformTenant[];
  activeTenant: PlatformTenant;
  activeCompanyName: string;
  activeCompanySlug: string;
  activeUserEmail: string;
  activeRoleLabel: string;
  selectedTemplate: Template | null;
  selectedMediaAsset: MediaAsset | null;
  createCampaign: (input: NewCampaignInput) => Campaign;
  addSubscriber: (input: NewSubscriberInput) => Subscriber;
  importSubscribers: (rawCsv: string, listName: string, consentConfirmed?: boolean) => number;
  addSubscriberList: (name: string, scope: string) => SubscriberList;
  addTemplate: (template: Omit<Template, "id" | "chars">) => Template;
  addMediaAsset: (asset: Omit<MediaAsset, "id">) => MediaAsset;
  selectTemplate: (template: Template | null) => void;
  selectMediaAsset: (asset: MediaAsset | null) => void;
  addTeamMember: (member: Omit<TeamMember, "rc"> & { rc?: string }) => TeamMember;
  createPlatformTenant: (input: { name: string; slug: string; admin: string; monthlyLimit: number; creditsRemaining: number }) => PlatformTenant;
  updatePlatformTenantLimits: (slug: string, monthlyLimit: number, creditsRemaining: number) => void;
  setPlatformTenantStatus: (slug: string, status: PlatformTenant["status"]) => void;
  generateAccessCode: (role: string, expiresISO: string, createdISO: string) => AccessCode;
  deleteAccessCode: (code: string) => void;
  deleteTeamMember: (email: string) => void;
};

declare global {
  var __campaignosV2DataContext: Context<V2DataContextValue | null> | undefined;
}

const V2DataContext = globalThis.__campaignosV2DataContext ?? createContext<V2DataContextValue | null>(null);
globalThis.__campaignosV2DataContext = V2DataContext;

export function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

export function compactNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  return value.toLocaleString("en-US");
}

function formatDateTime(dateISO: string, time: string) {
  const date = new Date(`${dateISO}T${time || "09:00"}:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function initialsSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function calcAudience(lists: SubscriberList[], listNames: string[]) {
  const allSubscribers = lists.find((list) => list.name === "All Subscribers")?.count ?? Number.MAX_SAFE_INTEGER;
  if (listNames.includes("All Subscribers")) return allSubscribers;
  const summedAudience = listNames.reduce((total, name) => total + (lists.find((list) => list.name === name)?.count ?? 0), 0);
  return Math.min(summedAudience, allSubscribers);
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function assertEmail(value: string, label: string) {
  if (!isValidEmail(value)) throw new Error(`${label} must be a valid email address.`);
}

function assertRole(role: string) {
  if (!TEAM_ROLES.includes(role)) throw new Error("Select a valid workspace role.");
}

function assertKnownSubscriberList(listName: string, lists: SubscriberList[]) {
  const list = lists.find((item) => item.name === listName && item.name !== "All Subscribers");
  if (!list) throw new Error("Select a valid subscriber list.");
}

function assertSubscriberPhone(phone: string) {
  if (normalizePhone(phone).length < 10) throw new Error("Subscriber phone number must include at least 10 digits.");
}

function assertSubscriberConsent(consentConfirmed?: boolean) {
  if (consentConfirmed !== true) throw new Error("Subscriber consent must be confirmed before adding marketable contacts.");
}

function assertUniqueSubscriberList(name: string, lists: SubscriberList[]) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Subscriber list name is required.");
  const key = initialsSlug(trimmed);
  const duplicate = lists.some((list) => list.key === key || list.name.toLowerCase() === trimmed.toLowerCase());
  if (duplicate) throw new Error("A subscriber list with that name already exists.");
}

function assertHttpUrl(value: string, label: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
  } catch {
    throw new Error(`${label} must be a valid http or https URL.`);
  }
}

function withSegment(subscriber: Subscriber, listName: string): Subscriber {
  if (subscriber.segments.includes(listName)) return subscriber;
  return { ...subscriber, segments: [...subscriber.segments, listName] };
}

function upsertSubscribersByPhone(current: Subscriber[], incoming: Subscriber[], listName: string) {
  const byPhone = new Map(current.map((subscriber) => [normalizePhone(subscriber.phone), subscriber]));
  const updates = new Map<string, Subscriber>();
  const additions: Subscriber[] = [];
  const affected: Subscriber[] = [];
  let uniqueAdded = 0;
  let segmentAdded = 0;

  for (const subscriber of incoming) {
    const phoneKey = normalizePhone(subscriber.phone);
    if (!phoneKey) continue;

    const existing = updates.get(phoneKey) ?? byPhone.get(phoneKey);
    if (existing) {
      const merged = withSegment(existing, listName);
      if (merged !== existing) {
        updates.set(phoneKey, merged);
        segmentAdded += 1;
      }
      affected.push(merged);
      continue;
    }

    const nextSubscriber = withSegment(subscriber, listName);
    byPhone.set(phoneKey, nextSubscriber);
    additions.push(nextSubscriber);
    affected.push(nextSubscriber);
    uniqueAdded += 1;
    segmentAdded += 1;
  }

  return {
    affected,
    segmentAdded,
    uniqueAdded,
    nextSubscribers: [...additions, ...current.map((subscriber) => updates.get(normalizePhone(subscriber.phone)) ?? subscriber)],
  };
}

function displayDateFromISO(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(year, month - 1, day));
}

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

function minutesFromTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return Number.NaN;
  return hour * 60 + minute;
}

export function isCampaignScheduleInFuture(dateISO: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return false;
  if (dateISO < DEMO_TODAY) return false;
  if (dateISO > DEMO_TODAY) return true;
  return minutesFromTime(time) >= minutesFromTime(DEMO_NOW_TIME);
}

function assertAccessCodeExpiry(expiresISO: string, createdISO: string) {
  const maxExpiry = addDays(createdISO, MAX_ACCESS_CODE_DAYS);
  if (expiresISO < createdISO || expiresISO > maxExpiry) {
    throw new Error(`Access codes can expire no later than ${displayDateFromISO(maxExpiry)} (${MAX_ACCESS_CODE_DAYS} days from creation).`);
  }
}

function assertCampaignCompliant(input: NewCampaignInput, lists: SubscriberList[]) {
  const knownListNames = new Set(lists.map((list) => list.name));
  const hasValidAudience = input.listNames.length > 0 && input.listNames.every((name) => knownListNames.has(name));
  const reach = calcAudience(lists, input.listNames);
  const sendHour = Number((input.time || "").split(":")[0]);

  if (!input.name.trim()) throw new Error("Campaign name is required.");
  if (!hasValidAudience || reach <= 0) throw new Error("Select at least one valid subscriber list.");
  if (!input.body.trim()) throw new Error("Campaign message is required.");
  if (!/\bSTOP\b/i.test(input.body)) throw new Error("Campaign message must include STOP opt-out language.");
  if (!isCampaignScheduleInFuture(input.dateISO, input.time)) {
    throw new Error("Campaign schedule cannot be in the past.");
  }
  if (!Number.isFinite(sendHour) || sendHour < QUIET_HOUR_START || sendHour >= QUIET_HOUR_END) {
    throw new Error("Campaign send time must be between 8:00 AM and 9:00 PM local time.");
  }

  return reach;
}

function assertTemplateInput(template: Omit<Template, "id" | "chars">) {
  if (!template.name.trim()) throw new Error("Template name is required.");
  if (template.type !== "SMS" && template.type !== "MMS") throw new Error("Template type must be SMS or MMS.");
  if (!template.preview.trim()) throw new Error("Template message is required.");
  if (!/\bSTOP\b/i.test(template.preview)) throw new Error("Template message must include STOP opt-out language.");
}

function assertMediaAssetInput(asset: Omit<MediaAsset, "id">) {
  if (!asset.name.trim()) throw new Error("Media asset name is required.");
  assertHttpUrl(asset.url, "Media asset URL");
  const type = asset.type.trim().toUpperCase();
  if (!MEDIA_TYPES.includes(type)) throw new Error("Media asset type must be JPG, PNG, GIF, MP4, or WEBP.");
}

function assertTenantLimits(monthlyLimit: number, creditsRemaining: number) {
  if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0) throw new Error("Monthly send limit must be greater than zero.");
  if (!Number.isFinite(creditsRemaining) || creditsRemaining < 0) throw new Error("Credits remaining cannot be negative.");
  if (creditsRemaining > monthlyLimit) throw new Error("Credits remaining cannot exceed the monthly send limit.");
}

function assertTenantSlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Company slug must use lowercase letters, numbers, and hyphens.");
}

function accessCodeFor(companyName: string, slug: string) {
  const letters = companyName.replace(/[^a-zA-Z]/g, "").slice(0, 4).padEnd(4, "X").toUpperCase();
  return `${letters}-${slug.slice(0, 4).toUpperCase()}-${String(Date.now()).slice(-4)}`;
}

export function loadPlatformTenants() {
  if (typeof window === "undefined") return initialPlatformTenants;
  try {
    const stored = window.localStorage.getItem(PLATFORM_TENANTS_STORAGE_KEY);
    if (!stored) return initialPlatformTenants;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return initialPlatformTenants;
    const validTenants = parsed.filter((tenant): tenant is PlatformTenant => (
      tenant &&
      typeof tenant.name === "string" &&
      typeof tenant.slug === "string" &&
      typeof tenant.monthlyLimit === "number" &&
      typeof tenant.creditsRemaining === "number"
    ));
    return validTenants.length > 0 ? validTenants : initialPlatformTenants;
  } catch {
    return initialPlatformTenants;
  }
}

function savePlatformTenants(tenants: PlatformTenant[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLATFORM_TENANTS_STORAGE_KEY, JSON.stringify(tenants));
}

type StaticDemoMembership = Membership & {
  email: string;
  display_name?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function roleLabelToMembershipRole(role: string) {
  const normalized = role.toLowerCase();
  if (normalized.includes("customer") || normalized.includes("admin")) return "customer_admin";
  if (normalized.includes("regional")) return "regional_manager";
  if (normalized.includes("campaign")) return "campaign_manager";
  return "viewer";
}

function membershipRoleToV2Label(role?: string | null) {
  if (role === "customer_admin") return "Customer Company Admin";
  if (role === "campaign_manager") return "Campaign Manager";
  if (role === "regional_manager") return "Regional Manager";
  if (role === "analyst") return "Analyst";
  if (role === "viewer") return "Viewer";
  return "Customer Company Admin";
}

export function companyInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "CO";
}

function tenantToMembership(tenant: PlatformTenant, role = "customer_admin"): Membership {
  return {
    company_id: tenant.slug,
    company_name: tenant.name,
    company_slug: tenant.slug,
    role,
    credit_limit: null,
    credits_used: Math.max(0, tenant.monthlyLimit - tenant.creditsRemaining),
  };
}

function sessionForTenant(
  tenant: PlatformTenant,
  email: string,
  role = "customer_admin",
): Extract<Session, { role: "company_user" }> {
  return {
    role: "company_user",
    email: normalizeEmail(email),
    companyId: tenant.slug,
    companyName: tenant.name,
    membershipRole: role,
    creditLimit: null,
    creditsUsed: Math.max(0, tenant.monthlyLimit - tenant.creditsRemaining),
  };
}

function loadStaticDemoMemberships(): StaticDemoMembership[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(STATIC_DEMO_MEMBERSHIPS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((membership): membership is StaticDemoMembership => (
      membership &&
      typeof membership.email === "string" &&
      typeof membership.company_id === "string" &&
      typeof membership.company_name === "string" &&
      typeof membership.role === "string"
    ));
  } catch {
    return [];
  }
}

function saveStaticDemoMembership(membership: StaticDemoMembership) {
  if (typeof window === "undefined") return;
  const normalizedMembership = { ...membership, email: normalizeEmail(membership.email) };
  const next = [
    normalizedMembership,
    ...loadStaticDemoMemberships().filter((item) => (
      normalizeEmail(item.email) !== normalizedMembership.email ||
      item.company_id !== normalizedMembership.company_id
    )),
  ];
  window.localStorage.setItem(STATIC_DEMO_MEMBERSHIPS_STORAGE_KEY, JSON.stringify(next));
}

function isItemForTenant(item: { tenantSlug?: string }, activeSlug: string) {
  return activeSlug === "demo-retail"
    ? !item.tenantSlug || item.tenantSlug === activeSlug
    : item.tenantSlug === activeSlug;
}

function seedWorkspaceForTenant(tenant: PlatformTenant) {
  const total = tenant.subscribers;
  const primary = Math.max(Math.round(total * 0.52), total > 0 ? 1 : 0);
  const loyalty = Math.max(Math.round(total * 0.34), total > 0 ? 1 : 0);
  const winback = Math.max(total - primary - loyalty, 0);
  const primaryList = `${tenant.name} VIP`;
  const loyaltyList = `${tenant.name} Loyalty`;
  const tenantSlug = tenant.slug;
  const colors = ["#0FEBA8", "#60A5FA", "#FBBF24"];

  const subscriberLists: SubscriberList[] = [
    { tenantSlug, key: `${tenantSlug}-all`, name: "All Subscribers", count: total, consent: "98.7%", color: "#60A5FA" },
    { tenantSlug, key: `${tenantSlug}-vip`, name: primaryList, count: primary, consent: "99.1%", color: colors[0] },
    { tenantSlug, key: `${tenantSlug}-loyalty`, name: loyaltyList, count: loyalty, consent: "98.4%", color: colors[1] },
    { tenantSlug, key: `${tenantSlug}-winback`, name: "Winback Shoppers", count: winback, consent: "96.8%", color: colors[2] },
  ];

  const regions = ["Phoenix, AZ", "Denver, CO", "Austin, TX", "Seattle, WA", "Portland, OR", "San Diego, CA"];
  const subscribers: Subscriber[] = Array.from({ length: Math.min(48, Math.max(18, Math.ceil(total / 2500))) }, (_, index) => {
    const segments = index % 5 === 0 ? ["Winback Shoppers"] : index % 3 === 0 ? [loyaltyList] : [primaryList];
    return {
      tenantSlug,
      phone: `+1 (${["480", "602", "720", "512", "206", "503"][index % 6]}) 555-${String(3100 + index).padStart(4, "0")}`,
      source: ["CSV Import", "Opt-in Form", "Retail POS", "API"][index % 4],
      region: regions[index % regions.length],
      segments,
      consent: index % 17 === 0 ? "Opted Out" : "Opted In",
      mkt: index % 17 === 0 ? "Suppressed" : segments.includes("Winback Shoppers") ? "Inactive" : "Active",
      created: `Jun ${String((index % 14) + 1).padStart(2, "0")}, 2026`,
    };
  });

  const campaigns: Campaign[] = total > 0 ? [
    {
      tenantSlug,
      id: `${tenantSlug}-welcome`,
      name: `${tenant.name} Welcome Offer`,
      status: "scheduled",
      date: "Jun 18, 2026 10:00 AM",
      dateISO: "2026-06-18",
      type: "SMS",
      reach: primary,
      sample: Math.min(Math.ceil(primary * 0.00036), 1000),
      credits: Math.ceil(primary * 0.001),
      reminders: 1,
      list: primaryList,
      body: `Welcome to ${tenant.name}. Tap for this week's offer: {link}. Reply STOP to opt out.`,
    },
    {
      tenantSlug,
      id: `${tenantSlug}-loyalty-preview`,
      name: `${tenant.name} Loyalty Preview`,
      status: "sent",
      date: "Jun 8, 2026 9:00 AM",
      dateISO: "2026-06-08",
      type: "SMS",
      reach: loyalty,
      sample: Math.min(Math.ceil(loyalty * 0.00036), 1000),
      credits: Math.ceil(loyalty * 0.001),
      reminders: 1,
      list: loyaltyList,
      body: `${tenant.name} loyalty members get early access today: {link}. Reply STOP to opt out.`,
    },
  ] : [];

  const teamMembers: TeamMember[] = [
    {
      tenantSlug,
      name: "Owner Demo",
      email: tenant.admin,
      role: "Customer Company Admin",
      budget: "Unlimited",
      rc: "#0FEBA8",
    },
  ];

  const accessCodes: AccessCode[] = [
    {
      tenantSlug,
      code: tenant.accessCode,
      role: "Campaign Manager",
      created: DEMO_TODAY,
      uses: 0,
      max: 5,
      expires: displayDateFromISO(addDays(DEMO_TODAY, 14)),
    },
  ];

  return { subscriberLists, subscribers, campaigns, teamMembers, accessCodes };
}

function mergeWorkspaceSeed(tenant: PlatformTenant) {
  const current = loadWorkspaceState();
  const seed = seedWorkspaceForTenant(tenant);
  const withoutTenant = {
    campaigns: current.campaigns.filter((item) => item.tenantSlug !== tenant.slug),
    subscriberLists: current.subscriberLists.filter((item) => item.tenantSlug !== tenant.slug),
    subscribers: current.subscribers.filter((item) => item.tenantSlug !== tenant.slug),
    templates: current.templates,
    mediaAssets: current.mediaAssets,
    teamMembers: current.teamMembers.filter((item) => item.tenantSlug !== tenant.slug),
    accessCodes: current.accessCodes.filter((item) => item.tenantSlug !== tenant.slug),
  };
  const next: WorkspaceState = {
    ...withoutTenant,
    campaigns: [...seed.campaigns, ...withoutTenant.campaigns],
    subscriberLists: [...withoutTenant.subscriberLists, ...seed.subscriberLists],
    subscribers: [...seed.subscribers, ...withoutTenant.subscribers],
    teamMembers: [...seed.teamMembers, ...withoutTenant.teamMembers],
    accessCodes: [...seed.accessCodes, ...withoutTenant.accessCodes],
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(next));
  }
}

export function lookupStaticDemoMemberships(email: string): Membership[] {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return [];
  const tenants = loadPlatformTenants();
  const adminMemberships = tenants
    .filter((tenant) => normalizeEmail(tenant.admin) === normalizedEmail)
    .map((tenant) => tenantToMembership(tenant, "customer_admin"));
  const storedMemberships = loadStaticDemoMemberships()
    .filter((membership) => normalizeEmail(membership.email) === normalizedEmail)
    .map(({ email: _email, display_name: _displayName, ...membership }) => membership);
  return [...adminMemberships, ...storedMemberships].filter((membership, index, all) => (
    all.findIndex((item) => item.company_id === membership.company_id) === index
  ));
}

export function signupStaticDemoAccessCode(input: { email: string; name: string; accessCode: string }) {
  const email = normalizeEmail(input.email);
  const code = normalizeCode(input.accessCode);
  assertEmail(email, "Work email");
  if (!input.name.trim()) throw new Error("Full name is required.");
  if (!code) throw new Error("Access code is required.");

  const tenants = loadPlatformTenants();
  const tenantFromPlatformCode = tenants.find((tenant) => normalizeCode(tenant.accessCode) === code);
  const workspaceAccessCode = loadWorkspaceState().accessCodes.find((accessCode) => normalizeCode(accessCode.code) === code);
  const tenant = tenantFromPlatformCode
    ?? tenants.find((candidate) => candidate.slug === (workspaceAccessCode?.tenantSlug ?? "demo-retail"))
    ?? tenants.find((candidate) => candidate.slug === "demo-retail");

  if (!tenant || (normalizeCode(tenant.accessCode) !== code && normalizeCode(DEMO_RETAIL_ACCESS_CODE) !== code && !workspaceAccessCode)) {
    throw new Error("Access code signup failed. Check the code and try again.");
  }

  const role = workspaceAccessCode ? roleLabelToMembershipRole(workspaceAccessCode.role) : "customer_admin";
  saveStaticDemoMembership({
    ...tenantToMembership(tenant, role),
    email,
    display_name: input.name.trim(),
  });

  return sessionForTenant(tenant, email, role);
}

export function createStaticDemoCompany(input: {
  name: string;
  slug: string;
  adminEmail: string;
  monthlyLimit: number;
}) {
  const name = input.name.trim();
  const slug = input.slug.trim() || initialsSlug(name);
  const adminEmail = normalizeEmail(input.adminEmail);
  const monthlyLimit = Math.round(input.monthlyLimit);
  if (!name) throw new Error("Company name is required.");
  assertTenantSlug(slug);
  assertEmail(adminEmail, "Admin email");
  assertTenantLimits(monthlyLimit, monthlyLimit);

  const current = loadPlatformTenants();
  if (current.some((tenant) => tenant.slug === slug)) throw new Error("A company with that slug already exists.");
  const subscribers = Math.min(Math.max(Math.round(monthlyLimit * 0.08), 12500), 250000);
  const campaigns = subscribers > 0 ? 2 : 0;
  const messages = Math.min(Math.ceil(subscribers * 0.012), Math.max(monthlyLimit - 1, 0));
  const tenant: PlatformTenant = {
    name,
    slug,
    admin: adminEmail,
    subscribers,
    campaigns,
    scheduledReach: Math.min(subscribers, Math.round(subscribers * 0.52)),
    creditsRemaining: Math.max(0, monthlyLimit - messages),
    monthlyLimit,
    messages,
    media: 2,
    links: 4,
    clicks: Math.ceil(subscribers * 0.018),
    reminders: campaigns,
    created: displayDateFromISO(DEMO_TODAY),
    accessCode: accessCodeFor(name, slug),
    status: "active",
  };
  savePlatformTenants([tenant, ...current]);
  mergeWorkspaceSeed(tenant);
  saveStaticDemoMembership({ ...tenantToMembership(tenant, "customer_admin"), email: adminEmail, display_name: "Owner Demo" });
  return sessionForTenant(tenant, adminEmail, "customer_admin");
}

function storedArray<T>(value: unknown, fallback: T[]) {
  return Array.isArray(value) ? value as T[] : fallback;
}

function loadWorkspaceState(): WorkspaceState {
  if (typeof window === "undefined") return initialWorkspaceState;
  try {
    const stored = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!stored) return initialWorkspaceState;
    const parsed = JSON.parse(stored) as Partial<WorkspaceState>;
    if (!parsed || typeof parsed !== "object") return initialWorkspaceState;
    return {
      campaigns: storedArray(parsed.campaigns, initialCampaigns),
      subscriberLists: storedArray(parsed.subscriberLists, initialLists),
      subscribers: storedArray(parsed.subscribers, initialSubscriberRows),
      templates: storedArray(parsed.templates, initialTemplates),
      mediaAssets: storedArray(parsed.mediaAssets, initialMedia),
      teamMembers: storedArray(parsed.teamMembers, initialTeam),
      accessCodes: storedArray(parsed.accessCodes, initialAccessCodes),
    };
  } catch {
    return initialWorkspaceState;
  }
}

export function V2DataProvider({ children, session }: { children: ReactNode; session?: Session | null }) {
  const [initialWorkspace] = useState(loadWorkspaceState);
  const [campaigns, setCampaigns] = useState(initialWorkspace.campaigns);
  const [subscriberLists, setSubscriberLists] = useState(initialWorkspace.subscriberLists);
  const [subscribers, setSubscribers] = useState(initialWorkspace.subscribers);
  const [templates, setTemplates] = useState(initialWorkspace.templates);
  const [mediaAssets, setMediaAssets] = useState(initialWorkspace.mediaAssets);
  const [teamMembers, setTeamMembers] = useState(initialWorkspace.teamMembers);
  const [accessCodes, setAccessCodes] = useState(initialWorkspace.accessCodes);
  const [platformTenants, setPlatformTenants] = useState<PlatformTenant[]>(loadPlatformTenants);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedMediaAsset, setSelectedMediaAsset] = useState<MediaAsset | null>(null);
  const activeTenant = useMemo(() => {
    const fallback = platformTenants.find((tenant) => tenant.slug === "demo-retail") ?? platformTenants[0] ?? initialPlatformTenants[0];
    if (session?.role !== "company_user") return fallback;
    return platformTenants.find((tenant) => (
      tenant.slug === session.companyId ||
      tenant.slug === session.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      tenant.name === session.companyName
    )) ?? fallback;
  }, [platformTenants, session]);
  const activeCompanySlug = activeTenant.slug;
  const activeCompanyName = activeTenant.name;
  const activeUserEmail = session?.role === "company_user" ? session.email : activeTenant.admin;
  const activeRoleLabel = session?.role === "company_user"
    ? membershipRoleToV2Label(session.membershipRole)
    : "Customer Company Admin";
  const activeCampaigns = useMemo(
    () => campaigns.filter((campaign) => isItemForTenant(campaign, activeCompanySlug)),
    [activeCompanySlug, campaigns],
  );
  const activeSubscriberLists = useMemo(
    () => subscriberLists.filter((list) => isItemForTenant(list, activeCompanySlug)),
    [activeCompanySlug, subscriberLists],
  );
  const activeSubscribers = useMemo(
    () => subscribers.filter((subscriber) => isItemForTenant(subscriber, activeCompanySlug)),
    [activeCompanySlug, subscribers],
  );
  const activeTemplates = useMemo(
    () => templates.filter((template) => !template.tenantSlug || template.tenantSlug === activeCompanySlug),
    [activeCompanySlug, templates],
  );
  const activeMediaAssets = useMemo(
    () => mediaAssets.filter((asset) => !asset.tenantSlug || asset.tenantSlug === activeCompanySlug),
    [activeCompanySlug, mediaAssets],
  );
  const activeTeamMembers = useMemo(
    () => teamMembers.filter((member) => isItemForTenant(member, activeCompanySlug)),
    [activeCompanySlug, teamMembers],
  );
  const activeAccessCodes = useMemo(
    () => accessCodes.filter((code) => isItemForTenant(code, activeCompanySlug)),
    [accessCodes, activeCompanySlug],
  );

  useEffect(() => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({
      campaigns,
      subscriberLists,
      subscribers,
      templates,
      mediaAssets,
      teamMembers,
      accessCodes,
    }));
  }, [accessCodes, campaigns, mediaAssets, subscriberLists, subscribers, teamMembers, templates]);

  useEffect(() => {
    window.localStorage.setItem(PLATFORM_TENANTS_STORAGE_KEY, JSON.stringify(platformTenants));
  }, [platformTenants]);

  const incrementListCounts = (listName: string, uniqueDelta: number, segmentDelta: number) => {
    setSubscriberLists((current) => current.map((list) => (
      !isItemForTenant(list, activeCompanySlug) ? list
      : list.name === "All Subscribers" ? { ...list, count: list.count + uniqueDelta }
      : list.name === listName ? { ...list, count: list.count + segmentDelta }
      : list
    )));
  };

  const updateActiveTenant = (updater: (tenant: PlatformTenant) => PlatformTenant) => {
    setPlatformTenants((current) => current.map((tenant) => tenant.slug === activeCompanySlug ? updater(tenant) : tenant));
  };

  const value = useMemo<V2DataContextValue>(() => ({
    campaigns: activeCampaigns,
    subscriberLists: activeSubscriberLists,
    subscribers: activeSubscribers,
    templates: activeTemplates,
    mediaAssets: activeMediaAssets,
    teamMembers: activeTeamMembers,
    accessCodes: activeAccessCodes,
    platformTenants,
    activeTenant,
    activeCompanyName,
    activeCompanySlug,
    activeUserEmail,
    activeRoleLabel,
    selectedTemplate,
    selectedMediaAsset,
    createCampaign: (input) => {
      const reach = assertCampaignCompliant(input, activeSubscriberLists);
      const credits = input.type === "MMS" ? Math.ceil(reach * 0.002) : Math.ceil(reach * 0.001);
      if (credits > activeTenant.creditsRemaining) throw new Error("Campaign exceeds remaining company credits.");
      const campaign: Campaign = {
        tenantSlug: activeCompanySlug,
        id: `${activeCompanySlug}-camp-${Date.now()}`,
        name: input.name.trim(),
        status: "scheduled",
        date: formatDateTime(input.dateISO, input.time),
        dateISO: input.dateISO,
        type: input.type,
        reach,
        sample: Math.min(Math.ceil(reach * 0.00036), 1000),
        credits,
        reminders: input.listNames.length > 1 ? 2 : 1,
        list: input.listNames.join(", "),
        body: input.body,
      };
      setCampaigns((current) => [campaign, ...current]);
      updateActiveTenant((tenant) => ({
        ...tenant,
        campaigns: tenant.campaigns + 1,
        scheduledReach: Math.min(tenant.subscribers, tenant.scheduledReach + reach),
        creditsRemaining: Math.max(0, tenant.creditsRemaining - campaign.credits),
      }));
      setSelectedTemplate(null);
      setSelectedMediaAsset(null);
      return campaign;
    },
    addSubscriber: (input) => {
      assertSubscriberConsent(input.consentConfirmed);
      assertKnownSubscriberList(input.listName, activeSubscriberLists);
      assertSubscriberPhone(input.phone);
      const subscriber: Subscriber = {
        tenantSlug: activeCompanySlug,
        phone: input.phone.trim(),
        source: "Manual",
        region: "Manual entry",
        segments: [input.listName],
        consent: "Opted In",
        mkt: "Active",
        created: DEMO_TODAY,
      };
      const result = upsertSubscribersByPhone(activeSubscribers, [subscriber], input.listName);
      setSubscribers((current) => [
        ...result.nextSubscribers,
        ...current.filter((item) => !isItemForTenant(item, activeCompanySlug)),
      ]);
      if (result.segmentAdded > 0 || result.uniqueAdded > 0) {
        incrementListCounts(input.listName, result.uniqueAdded, result.segmentAdded);
      }
      if (result.uniqueAdded > 0) {
        updateActiveTenant((tenant) => ({ ...tenant, subscribers: tenant.subscribers + result.uniqueAdded }));
      }
      return result.affected[0] ?? subscriber;
    },
    importSubscribers: (rawCsv, listName, consentConfirmed) => {
      assertSubscriberConsent(consentConfirmed);
      assertKnownSubscriberList(listName, activeSubscriberLists);
      const rows = rawCsv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const parsed = rows.flatMap((line, index): Subscriber[] => {
        const [phone = `+1 (206) 555-${String(7000 + index).slice(-4)}`, first = "", last = "", region = "Imported"] = line.split(",").map((part) => part.trim());
        if (normalizePhone(phone).length < 10) return [];
        return [{
          tenantSlug: activeCompanySlug,
          phone,
          source: "CSV Import",
          region: region || [first, last].filter(Boolean).join(" ") || "Imported",
          segments: [listName],
          consent: "Opted In",
          mkt: "Active",
          created: DEMO_TODAY,
        }];
      });
      if (parsed.length === 0) throw new Error("CSV import must include at least one valid phone number.");
      const result = upsertSubscribersByPhone(activeSubscribers, parsed, listName);
      setSubscribers((current) => [
        ...result.nextSubscribers,
        ...current.filter((item) => !isItemForTenant(item, activeCompanySlug)),
      ]);
      if (result.segmentAdded > 0 || result.uniqueAdded > 0) {
        incrementListCounts(listName, result.uniqueAdded, result.segmentAdded);
      }
      if (result.uniqueAdded > 0) {
        updateActiveTenant((tenant) => ({ ...tenant, subscribers: tenant.subscribers + result.uniqueAdded }));
      }
      return result.segmentAdded;
    },
    addSubscriberList: (name, scope) => {
      assertUniqueSubscriberList(name, activeSubscriberLists);
      const list: SubscriberList = {
        tenantSlug: activeCompanySlug,
        key: `${activeCompanySlug}-${initialsSlug(name.trim())}`,
        name: name.trim(),
        count: 0,
        consent: "0%",
        color: "#60A5FA",
      };
      setSubscriberLists((current) => [...current, list]);
      void scope;
      return list;
    },
    addTemplate: (template) => {
      assertTemplateInput(template);
      const next: Template = {
        ...template,
        tenantSlug: activeCompanySlug,
        name: template.name.trim(),
        tags: template.tags.map((tag) => tag.trim()).filter(Boolean),
        preview: template.preview.trim(),
        id: `tpl-${Date.now()}`,
        chars: template.preview.trim().length,
      };
      setTemplates((current) => [next, ...current]);
      return next;
    },
    addMediaAsset: (asset) => {
      assertMediaAssetInput(asset);
      const next: MediaAsset = {
        ...asset,
        tenantSlug: activeCompanySlug,
        name: asset.name.trim(),
        type: asset.type.trim().toUpperCase(),
        size: asset.size.trim(),
        dims: asset.dims.trim(),
        url: asset.url.trim(),
        id: `asset-${Date.now()}`,
      };
      setMediaAssets((current) => [next, ...current]);
      return next;
    },
    selectTemplate: setSelectedTemplate,
    selectMediaAsset: setSelectedMediaAsset,
    addTeamMember: (member) => {
      if (!member.name.trim()) throw new Error("Team member name is required.");
      assertEmail(member.email, "Team member email");
      assertRole(member.role);
      const next: TeamMember = {
        ...member,
        tenantSlug: activeCompanySlug,
        name: member.name.trim(),
        email: member.email.trim(),
        role: member.role,
        budget: member.budget.trim() || "$10,000",
        rc: member.rc ?? (member.role.includes("Admin") ? "#0FEBA8" : member.role.includes("Regional") ? "#A78BFA" : "#60A5FA"),
      };
      setTeamMembers((current) => [
        next,
        ...current.filter((item) => !isItemForTenant(item, activeCompanySlug) || item.email !== next.email),
      ]);
      return next;
    },
    createPlatformTenant: (input) => {
      const name = input.name.trim();
      const slug = input.slug.trim();
      if (!name) throw new Error("Company name is required.");
      assertTenantSlug(slug);
      assertEmail(input.admin, "Initial admin email");
      assertTenantLimits(input.monthlyLimit, input.creditsRemaining);
      if (platformTenants.some((tenant) => tenant.slug === slug)) throw new Error("A company with that slug already exists.");
      const tenant: PlatformTenant = {
        name,
        slug,
        admin: input.admin.trim(),
        subscribers: 0,
        campaigns: 0,
        scheduledReach: 0,
        creditsRemaining: input.creditsRemaining,
        monthlyLimit: input.monthlyLimit,
        messages: 0,
        media: 0,
        links: 0,
        clicks: 0,
        reminders: 0,
        created: "Jun 14, 2026",
        accessCode: accessCodeFor(name, slug),
        status: "active",
      };
      setPlatformTenants((current) => [tenant, ...current.filter((item) => item.slug !== tenant.slug)]);
      const seed = seedWorkspaceForTenant(tenant);
      setCampaigns((current) => [...seed.campaigns, ...current.filter((item) => item.tenantSlug !== tenant.slug)]);
      setSubscriberLists((current) => [...current.filter((item) => item.tenantSlug !== tenant.slug), ...seed.subscriberLists]);
      setSubscribers((current) => [...seed.subscribers, ...current.filter((item) => item.tenantSlug !== tenant.slug)]);
      setTeamMembers((current) => [...seed.teamMembers, ...current.filter((item) => item.tenantSlug !== tenant.slug)]);
      setAccessCodes((current) => [...seed.accessCodes, ...current.filter((item) => item.tenantSlug !== tenant.slug)]);
      return tenant;
    },
    updatePlatformTenantLimits: (slug, monthlyLimit, creditsRemaining) => {
      assertTenantLimits(monthlyLimit, creditsRemaining);
      if (!platformTenants.some((tenant) => tenant.slug === slug)) throw new Error("Company tenant was not found.");
      setPlatformTenants((current) => current.map((tenant) => tenant.slug === slug
        ? { ...tenant, monthlyLimit, creditsRemaining }
        : tenant));
    },
    setPlatformTenantStatus: (slug, status) => {
      if (status !== "active" && status !== "suspended") throw new Error("Company status must be active or suspended.");
      if (!platformTenants.some((tenant) => tenant.slug === slug)) throw new Error("Company tenant was not found.");
      setPlatformTenants((current) => current.map((tenant) => tenant.slug === slug ? { ...tenant, status } : tenant));
    },
    generateAccessCode: (role, expiresISO, createdISO) => {
      assertRole(role);
      assertAccessCodeExpiry(expiresISO, createdISO);
      const rolePart = role.split(" ").map((part) => part[0]).join("").slice(0, 3).padEnd(3, "X").toUpperCase();
      const code: AccessCode = {
        tenantSlug: activeCompanySlug,
        code: `DMRT-${rolePart}-${expiresISO.replaceAll("-", "").slice(4)}`,
        role,
        created: displayDateFromISO(createdISO),
        uses: 0,
        max: 3,
        expires: displayDateFromISO(expiresISO),
      };
      setAccessCodes((current) => [code, ...current.filter((item) => item.code !== code.code)]);
      return code;
    },
    deleteAccessCode: (code) => setAccessCodes((current) => current.filter((item) => item.code !== code)),
    deleteTeamMember: (email) => {
      if (email === activeTenant.admin) throw new Error("The workspace owner cannot be removed.");
      setTeamMembers((current) => current.filter((member) => !isItemForTenant(member, activeCompanySlug) || member.email !== email));
    },
  }), [
    activeAccessCodes,
    activeCampaigns,
    activeCompanyName,
    activeCompanySlug,
    activeMediaAssets,
    activeRoleLabel,
    activeSubscriberLists,
    activeSubscribers,
    activeTeamMembers,
    activeTemplates,
    activeTenant,
    activeUserEmail,
    platformTenants,
    selectedMediaAsset,
    selectedTemplate,
  ]);

  return <V2DataContext.Provider value={value}>{children}</V2DataContext.Provider>;
}

export function useV2Data() {
  const context = useContext(V2DataContext);
  if (!context) throw new Error("useV2Data must be used within V2DataProvider");
  return context;
}
