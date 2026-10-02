import { resolveTarget } from "@/lib/server/guard";
import { probe } from "@/lib/server/probe";
import { clientIp, rateLimit, tooMany } from "@/lib/server/rate-limit";
import type { HttpMethod, Probe } from "@/lib/types";

const MAX_TARGETS = 20;
const METHODS: HttpMethod[] = ["GET", "POST", "HEAD"];

interface Target {
  id: string;
  url: string;
  method: HttpMethod;
  timeoutMs: number;
}

function parseTargets(input: unknown): Target[] | null {
  if (!input || typeof input !== "object" || !Array.isArray((input as { targets?: unknown }).targets)) return null;
  const raw = (input as { targets: unknown[] }).targets;
  if (raw.length === 0 || raw.length > MAX_TARGETS) return null;
  const out: Target[] = [];
  for (const t of raw) {
    if (!t || typeof t !== "object") return null;
    const { id, url, method, timeoutMs } = t as Record<string, unknown>;
    if (typeof id !== "string" || id.length > 64 || typeof url !== "string") return null;
    const m = METHODS.includes(method as HttpMethod) ? (method as HttpMethod) : "GET";
    const timeout = typeof timeoutMs === "number" ? Math.min(Math.max(timeoutMs, 500), 10_000) : 5000;
    out.push({ id, url, method: m, timeoutMs: timeout });
  }
  return out;
}

export async function POST(request: Request) {
  const limit = rateLimit(`check:${clientIp(request)}`, 30, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const targets = parseTargets(await request.json().catch(() => null));
  if (!targets) {
    return Response.json(
      { error: `Erwartet: { targets: [...] } mit 1 bis ${MAX_TARGETS} Einträgen.` },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const results = await Promise.all(
    targets.map(async (t): Promise<{ id: string; probe: Probe }> => {
      const resolved = await resolveTarget(t.url, origin);
      if (!resolved.ok) {
        return {
          id: t.id,
          probe: { at: Date.now(), statusCode: null, latencyMs: 0, error: resolved.error, body: null, headers: {} },
        };
      }
      return { id: t.id, probe: await probe(resolved.url, t.method, t.timeoutMs, resolved.internal) };
    }),
  );

  return Response.json({ results }, { headers: { "cache-control": "no-store" } });
}
