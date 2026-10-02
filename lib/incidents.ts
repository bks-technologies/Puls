import { classify, severityOf } from "./status";
import type { AlertEvent, CheckResult, Endpoint, Incident, Probe } from "./types";

export const MAX_INCIDENTS = 200;

/**
 * Folds a batch of probes into the incident list.
 * One incident stays open per endpoint until a healthy check resolves it.
 * Repeated failures count as occurrences; a warning that turns into an outage
 * escalates the incident instead of opening a second one.
 */
export function applyProbes(
  endpoints: Endpoint[],
  incidents: Incident[],
  probes: Array<{ id: string; probe: Probe }>,
  makeId: () => string,
): { incidents: Incident[]; results: CheckResult[]; events: AlertEvent[] } {
  const byId = new Map(endpoints.map((e) => [e.id, e]));
  let next = incidents;
  const results: CheckResult[] = [];
  const events: AlertEvent[] = [];

  for (const { id, probe } of probes) {
    const endpoint = byId.get(id);
    if (!endpoint) continue;

    const status = classify(probe, endpoint.warnMs);
    results.push({ endpointId: id, at: probe.at, status, statusCode: probe.statusCode, latencyMs: probe.latencyMs });

    const openIndex = next.findIndex((i) => i.source === "monitor" && i.endpointId === id && i.resolvedAt === null);
    const open = openIndex >= 0 ? next[openIndex] : null;
    const severity = severityOf(status);

    if (!severity) {
      if (open) {
        const resolved = { ...open, resolvedAt: probe.at, last: probe };
        next = next.with(openIndex, resolved);
        events.push({ kind: "resolved", incident: resolved });
      }
      continue;
    }

    if (open) {
      const escalated = open.severity === "warning" && severity === "critical";
      const updated: Incident = {
        ...open,
        severity: escalated ? "critical" : open.severity,
        occurrences: open.occurrences + 1,
        lastSeenAt: probe.at,
        last: probe,
      };
      next = next.with(openIndex, updated);
      if (escalated) events.push({ kind: "down", incident: updated });
      continue;
    }

    const incident: Incident = {
      id: makeId(),
      source: "monitor",
      endpointId: id,
      endpointName: endpoint.name,
      url: endpoint.url,
      method: endpoint.method,
      severity,
      openedAt: probe.at,
      lastSeenAt: probe.at,
      resolvedAt: null,
      occurrences: 1,
      warnMs: endpoint.warnMs,
      first: probe,
      last: probe,
      requestBody: null,
    };
    next = [incident, ...next];
    events.push({ kind: severity === "critical" ? "down" : "degraded", incident });
  }

  return { incidents: next.slice(0, MAX_INCIDENTS), results, events };
}

/** Share of checks that were not outages. Latency warnings still count as up. */
export function uptime(results: CheckResult[]) {
  if (results.length === 0) return null;
  const up = results.filter((r) => r.status !== "down").length;
  return (up / results.length) * 100;
}

export function percentile(values: number[], p: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}
