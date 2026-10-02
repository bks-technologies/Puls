import { describe, expect, it } from "vitest";
import { applyProbes, percentile, uptime } from "@/lib/incidents";
import { classify } from "@/lib/status";
import type { Endpoint, Incident, Probe } from "@/lib/types";

const endpoint: Endpoint = {
  id: "ep-1",
  name: "Test",
  url: "/api/mock/healthy",
  method: "GET",
  warnMs: 500,
  timeoutMs: 5000,
  createdAt: 0,
};

let n = 0;
const makeId = () => `inc-${++n}`;
const probe = (at: number, statusCode: number | null, latencyMs: number, error: string | null = null): Probe => ({
  at,
  statusCode,
  latencyMs,
  error,
  body: null,
  headers: {},
});

function run(incidents: Incident[], p: Probe) {
  return applyProbes([endpoint], incidents, [{ id: endpoint.id, probe: p }], makeId);
}

describe("classify", () => {
  it("maps status codes and latency to the three states", () => {
    expect(classify(probe(0, 200, 100), 500)).toBe("operational");
    expect(classify(probe(0, 301, 100), 500)).toBe("operational");
    expect(classify(probe(0, 200, 501), 500)).toBe("degraded");
    expect(classify(probe(0, 404, 50), 500)).toBe("down");
    expect(classify(probe(0, 500, 50), 500)).toBe("down");
    expect(classify(probe(0, null, 5000, "Zeitüberschreitung"), 500)).toBe("down");
  });
});

describe("applyProbes", () => {
  it("opens one incident and counts repeats instead of duplicating", () => {
    const a = run([], probe(1, 500, 80));
    expect(a.incidents).toHaveLength(1);
    expect(a.events.map((e) => e.kind)).toEqual(["down"]);

    const b = run(a.incidents, probe(2, 500, 90));
    expect(b.incidents).toHaveLength(1);
    expect(b.incidents[0].occurrences).toBe(2);
    expect(b.incidents[0].first.at).toBe(1);
    expect(b.incidents[0].last.at).toBe(2);
    expect(b.events).toHaveLength(0);
  });

  it("resolves on the next healthy check and emits resolved", () => {
    const a = run([], probe(1, 503, 80));
    const b = run(a.incidents, probe(2, 200, 80));
    expect(b.incidents[0].resolvedAt).toBe(2);
    expect(b.events.map((e) => e.kind)).toEqual(["resolved"]);
    const c = run(b.incidents, probe(3, 200, 80));
    expect(c.events).toHaveLength(0);
  });

  it("escalates a latency warning to an outage without a second incident", () => {
    const a = run([], probe(1, 200, 900));
    expect(a.incidents[0].severity).toBe("warning");
    expect(a.events.map((e) => e.kind)).toEqual(["degraded"]);
    const b = run(a.incidents, probe(2, null, 5000, "Zeitüberschreitung"));
    expect(b.incidents).toHaveLength(1);
    expect(b.incidents[0].severity).toBe("critical");
    expect(b.events.map((e) => e.kind)).toEqual(["down"]);
  });

  it("ignores probes for unknown endpoints", () => {
    const r = applyProbes([endpoint], [], [{ id: "gone", probe: probe(1, 500, 1) }], makeId);
    expect(r.incidents).toHaveLength(0);
    expect(r.results).toHaveLength(0);
  });
});

describe("statistics", () => {
  it("counts warnings as available and outages as not", () => {
    const results = [
      { endpointId: "x", at: 1, status: "operational" as const, statusCode: 200, latencyMs: 1 },
      { endpointId: "x", at: 2, status: "degraded" as const, statusCode: 200, latencyMs: 1 },
      { endpointId: "x", at: 3, status: "down" as const, statusCode: 500, latencyMs: 1 },
      { endpointId: "x", at: 4, status: "operational" as const, statusCode: 200, latencyMs: 1 },
    ];
    expect(uptime(results)).toBe(75);
    expect(uptime([])).toBeNull();
  });

  it("computes nearest-rank percentiles", () => {
    expect(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 95)).toBe(100);
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
    expect(percentile([], 95)).toBeNull();
  });
});
