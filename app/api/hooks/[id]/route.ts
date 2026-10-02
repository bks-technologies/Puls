import type { NextRequest } from "next/server";
import { clientIp, rateLimit, tooMany } from "@/lib/server/rate-limit";

/**
 * Mock webhook receiver. Answers like a real consumer would, so the simulator
 * can measure status, latency and error bodies. The header `x-simulate`
 * forces a failure mode. Nothing is stored server-side.
 */

const MAX_BYTES = 64 * 1024;
const ID_PATTERN = /^[a-z0-9-]{4,40}$/;
const HEADERS = { "cache-control": "no-store" };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(request: NextRequest, ctx: RouteContext<"/api/hooks/[id]">) {
  const { id } = await ctx.params;
  if (!ID_PATTERN.test(id)) {
    return Response.json({ error: "invalid_hook_id" }, { status: 404, headers: HEADERS });
  }

  const limit = rateLimit(`hook:${clientIp(request)}`, 60, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const raw = await request.text();
  const bytes = new TextEncoder().encode(raw).byteLength;
  if (bytes > MAX_BYTES) {
    return Response.json(
      {
        error: "payload_too_large",
        message: `Maximal ${MAX_BYTES / 1024} KB, empfangen ${Math.round(bytes / 1024)} KB.`,
      },
      { status: 413, headers: HEADERS },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    return Response.json(
      { error: "invalid_json", message: err instanceof Error ? err.message : "Body ist kein gültiges JSON." },
      { status: 400, headers: HEADERS },
    );
  }

  const deliveryId = `dlv_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const simulate = request.headers.get("x-simulate") ?? "accept";

  switch (simulate) {
    case "slow":
      await sleep(1800 + Math.round(Math.random() * 700));
      break;
    case "error":
      await sleep(150);
      return Response.json(
        {
          error: "handler_failed",
          message: "Unhandled exception in event handler: KeyError 'customer_id'",
          deliveryId,
          retryable: true,
        },
        { status: 500, headers: HEADERS },
      );
    case "unauthorized":
      return Response.json(
        { error: "invalid_signature", message: "Header x-signature fehlt oder passt nicht zum Body." },
        { status: 401, headers: HEADERS },
      );
    case "gone":
      return Response.json(
        { error: "not_found", message: `Kein Abnehmer für Hook ${id} registriert.` },
        { status: 404, headers: HEADERS },
      );
  }

  const event =
    payload && typeof payload === "object"
      ? ((payload as Record<string, unknown>).type ?? (payload as Record<string, unknown>).event ?? null)
      : null;

  return Response.json(
    {
      status: "accepted",
      hookId: id,
      deliveryId,
      event,
      bytes,
      receivedAt: new Date().toISOString(),
    },
    { status: 202, headers: HEADERS },
  );
}

export function GET() {
  return Response.json(
    { error: "method_not_allowed", message: "Dieser Webhook nimmt nur POST mit JSON-Body an." },
    { status: 405, headers: { ...HEADERS, allow: "POST" } },
  );
}
