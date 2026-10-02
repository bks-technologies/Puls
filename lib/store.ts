"use client";

import { useSyncExternalStore } from "react";
import { newId } from "./ids";
import { applyProbes, MAX_INCIDENTS } from "./incidents";
import { DEFAULT_ALERTS, seedEndpoints } from "./seed";
import { classify } from "./status";
import type {
  AlertConfig,
  AlertEvent,
  AlertKind,
  AlertLogEntry,
  CheckResult,
  Delivery,
  Endpoint,
  Incident,
  Probe,
} from "./types";

/**
 * Client-side store. The demo has no database: everything a visitor sets up
 * lives in their own browser (localStorage). Checks themselves run for real on
 * the server via /api/check.
 */

const STORAGE_KEY = "puls:v1";
const HISTORY_LIMIT = 60;
const DELIVERY_LIMIT = 50;
const ALERT_LOG_LIMIT = 30;

export interface MonitorState {
  ready: boolean;
  endpoints: Endpoint[];
  history: Record<string, CheckResult[]>;
  latest: Record<string, Probe>;
  incidents: Incident[];
  alerts: AlertConfig;
  alertLog: AlertLogEntry[];
  deliveries: Delivery[];
  hookId: string;
  polling: { enabled: boolean; intervalSec: number };
  lastRunAt: number | null;
  running: boolean;
  lastError: string | null;
}

type Persisted = Omit<MonitorState, "ready" | "running" | "lastError">;

const SERVER_STATE: MonitorState = {
  ready: false,
  endpoints: [],
  history: {},
  latest: {},
  incidents: [],
  alerts: DEFAULT_ALERTS,
  alertLog: [],
  deliveries: [],
  hookId: "",
  polling: { enabled: true, intervalSec: 30 },
  lastRunAt: null,
  running: false,
  lastError: null,
};

function freshState(): MonitorState {
  return {
    ...SERVER_STATE,
    ready: true,
    endpoints: seedEndpoints(Date.now()),
    hookId: `wh-${newId(8)}`,
  };
}

let state: MonitorState = SERVER_STATE;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const data: Persisted = {
        endpoints: state.endpoints,
        history: state.history,
        latest: state.latest,
        incidents: state.incidents,
        alerts: state.alerts,
        alertLog: state.alertLog,
        deliveries: state.deliveries,
        hookId: state.hookId,
        polling: state.polling,
        lastRunAt: state.lastRunAt,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage may be full or blocked (private mode). The app keeps working in memory.
    }
  }, 250);
}

function set(patch: Partial<MonitorState> | ((s: MonitorState) => Partial<MonitorState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  if (state.ready) persist();
  listeners.forEach((l) => l());
}

export function hydrate() {
  if (state.ready) return;
  let loaded: Partial<Persisted> | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    loaded = raw ? (JSON.parse(raw) as Partial<Persisted>) : null;
  } catch {
    loaded = null;
  }
  const base = freshState();
  set(
    loaded && Array.isArray(loaded.endpoints)
      ? {
          ...base,
          ...loaded,
          alerts: { ...DEFAULT_ALERTS, ...loaded.alerts },
          polling: { ...base.polling, ...loaded.polling },
          ready: true,
          running: false,
        }
      : base,
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMonitor<T>(selector: (s: MonitorState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(SERVER_STATE),
  );
}

export const getState = () => state;

/* ---------- checks ---------- */

export async function runChecks(ids?: string[]) {
  if (state.running) return;
  const targets = state.endpoints.filter((e) => !ids || ids.includes(e.id));
  if (targets.length === 0) return;

  set({ running: true, lastError: null });
  try {
    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targets: targets.map(({ id, url, method, timeoutMs }) => ({ id, url, method, timeoutMs })),
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      results?: Array<{ id: string; probe: Probe }>;
      error?: string;
    } | null;
    if (!res.ok || !data?.results) {
      set({ running: false, lastError: data?.error ?? `Prüfung fehlgeschlagen (HTTP ${res.status}).` });
      return;
    }

    const { incidents, results, events } = applyProbes(
      state.endpoints,
      state.incidents,
      data.results,
      () => `inc-${newId(8)}`,
    );
    set((s) => {
      const history = { ...s.history };
      for (const r of results) history[r.endpointId] = [...(history[r.endpointId] ?? []), r].slice(-HISTORY_LIMIT);
      const latest = { ...s.latest };
      for (const { id, probe } of data.results!) latest[id] = probe;
      return { incidents, history, latest, running: false, lastRunAt: Date.now() };
    });
    void dispatchAlerts(events);
  } catch {
    set({ running: false, lastError: "Keine Verbindung zum Prüfdienst." });
  }
}

/* ---------- endpoints ---------- */

export type EndpointInput = Omit<Endpoint, "id" | "createdAt">;

export function addEndpoint(input: EndpointInput) {
  const endpoint: Endpoint = { ...input, id: `ep-${newId(8)}`, createdAt: Date.now() };
  set((s) => ({ endpoints: [...s.endpoints, endpoint] }));
  void runChecks([endpoint.id]);
  return endpoint;
}

export function updateEndpoint(id: string, patch: Partial<EndpointInput>) {
  set((s) => ({ endpoints: s.endpoints.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
}

export function removeEndpoint(id: string) {
  set((s) => {
    const history = { ...s.history };
    const latest = { ...s.latest };
    delete history[id];
    delete latest[id];
    return { endpoints: s.endpoints.filter((e) => e.id !== id), history, latest };
  });
}

export function setPolling(polling: Partial<MonitorState["polling"]>) {
  set((s) => ({ polling: { ...s.polling, ...polling } }));
}

/* ---------- incidents ---------- */

export function resolveIncident(id: string) {
  set((s) => ({
    incidents: s.incidents.map((i) => (i.id === id && i.resolvedAt === null ? { ...i, resolvedAt: Date.now() } : i)),
  }));
}

export function clearResolvedIncidents() {
  set((s) => ({ incidents: s.incidents.filter((i) => i.resolvedAt === null) }));
}

/* ---------- webhook simulator ---------- */

export function regenerateHookId() {
  set({ hookId: `wh-${newId(8)}` });
}

export function recordDelivery(delivery: Delivery, probe: Probe, simulateLabel: string) {
  set((s) => ({ deliveries: [delivery, ...s.deliveries].slice(0, DELIVERY_LIMIT) }));
  // A delivery is a one-shot event: failures and slow answers open an incident
  // that is already closed, so they show up in the log without blocking anything.
  const status = classify(probe, 1000);
  if (status === "operational") return;
  const incident: Incident = {
    id: `inc-${newId(8)}`,
    source: "webhook",
    endpointId: null,
    endpointName: `Webhook ${delivery.event || "ohne Typ"} (${simulateLabel})`,
    url: `/api/hooks/${delivery.hookId}`,
    method: "POST",
    severity: status === "down" ? "critical" : "warning",
    openedAt: probe.at,
    lastSeenAt: probe.at,
    resolvedAt: probe.at,
    occurrences: 1,
    warnMs: 1000,
    first: probe,
    last: probe,
    requestBody: delivery.requestBody,
  };
  set((s) => ({ incidents: [incident, ...s.incidents].slice(0, MAX_INCIDENTS) }));
  void dispatchAlerts([{ kind: status === "down" ? "down" : "degraded", incident }]);
}

/* ---------- alerting ---------- */

export function saveAlerts(alerts: AlertConfig) {
  set({ alerts });
}

function logAlert(entry: Omit<AlertLogEntry, "id" | "at">) {
  set((s) => ({ alertLog: [{ ...entry, id: newId(8), at: Date.now() }, ...s.alertLog].slice(0, ALERT_LOG_LIMIT) }));
}

async function postSlack(webhookUrl: string, kind: AlertKind | "test", incident?: Incident) {
  try {
    const res = await fetch("/api/alerts/slack", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        webhookUrl,
        kind,
        endpointName: incident?.endpointName,
        url: incident?.url,
        statusCode: incident?.last.statusCode ?? undefined,
        latencyMs: incident?.last.latencyMs,
        error: incident?.last.error ?? undefined,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      status?: number;
      detail?: string;
    };
    const ok = res.ok && data.ok === true;
    const detail = ok
      ? "Zugestellt"
      : (data.error ?? `Slack antwortete ${data.status ?? res.status}${data.detail ? `: ${data.detail}` : ""}`);
    logAlert({ channel: "slack", kind, target: incident?.endpointName ?? "Test", ok, detail });
    return { ok, detail };
  } catch {
    const detail = "Keine Verbindung zum Server.";
    logAlert({ channel: "slack", kind, target: incident?.endpointName ?? "Test", ok: false, detail });
    return { ok: false, detail };
  }
}

async function dispatchAlerts(events: AlertEvent[]) {
  const { slack, notifyOn } = state.alerts;
  if (!slack.enabled || !slack.webhookUrl) return;
  for (const event of events) {
    if (!notifyOn[event.kind]) continue;
    await postSlack(slack.webhookUrl, event.kind, event.incident);
  }
}

export function sendTestAlert(webhookUrl: string) {
  return postSlack(webhookUrl, "test");
}

/* ---------- reset ---------- */

export function resetDemo() {
  set(freshState());
  void runChecks();
}
