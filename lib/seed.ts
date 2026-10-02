import { mockPath } from "./scenarios";
import type { AlertConfig, Endpoint } from "./types";

/**
 * Example endpoints for the demo. Except for the GitHub API they point at
 * this app's own mock routes, so every state is visible from the start.
 */
export function seedEndpoints(now: number): Endpoint[] {
  const base = { method: "GET" as const, timeoutMs: 5000, createdAt: now };
  return [
    { ...base, id: "ep-payments", name: "Payments API", url: mockPath("healthy"), warnMs: 600 },
    { ...base, id: "ep-orders", name: "Orders API", url: mockPath("slow"), warnMs: 800 },
    { ...base, id: "ep-inventory", name: "Inventory Sync", url: mockPath("flaky"), warnMs: 600 },
    { ...base, id: "ep-erp", name: "ERP-Bridge", url: mockPath("error"), warnMs: 1000 },
    { ...base, id: "ep-partner", name: "Partner-Webhook", url: mockPath("missing"), method: "POST", warnMs: 800 },
    { ...base, id: "ep-github", name: "GitHub REST API", url: "https://api.github.com/zen", warnMs: 800 },
  ];
}

export const DEFAULT_ALERTS: AlertConfig = {
  slack: { enabled: false, webhookUrl: "", channelHint: "#ops-alerts" },
  email: { enabled: false, recipients: "" },
  notifyOn: { down: true, degraded: false, resolved: true },
};
