import type { NextRequest } from "next/server";
import { isScenario } from "@/lib/scenarios";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const between = (min: number, max: number) => min + Math.round(Math.random() * (max - min));
const traceId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

const NO_STORE = { "cache-control": "no-store", "x-mock": "puls" };

function healthy(service: string) {
  return Response.json(
    { status: "ok", service, version: "2.14.3", checks: { database: "ok", queue: "ok", cache: "ok" } },
    { headers: { ...NO_STORE, "x-request-id": traceId() } },
  );
}

async function handle(_req: NextRequest, ctx: RouteContext<"/api/mock/[scenario]">) {
  const { scenario } = await ctx.params;
  if (!isScenario(scenario)) {
    return Response.json({ error: "unknown_scenario", scenario }, { status: 404, headers: NO_STORE });
  }

  switch (scenario) {
    case "healthy":
      await sleep(between(40, 180));
      return healthy("payments-api");

    case "slow":
      await sleep(between(900, 1600));
      return healthy("orders-api");

    case "flaky":
      await sleep(between(60, 260));
      if (Math.random() < 0.25) {
        return Response.json(
          {
            error: "service_unavailable",
            message: "Upstream connection pool exhausted (max 20/20 in use)",
            retryable: true,
            traceId: traceId(),
          },
          { status: 503, headers: { ...NO_STORE, "retry-after": "5" } },
        );
      }
      return healthy("inventory-sync");

    case "error": {
      await sleep(between(120, 340));
      const id = traceId();
      return Response.json(
        {
          error: "internal_error",
          message: "NullReferenceException: Object reference not set to an instance of an object.",
          at: "ErpBridge.Orders.MapLineItems(OrderDto dto) in OrderMapper.cs:line 87",
          traceId: id,
        },
        { status: 500, headers: { ...NO_STORE, "x-request-id": id } },
      );
    }

    case "missing":
      await sleep(between(30, 90));
      return Response.json(
        {
          error: "not_found",
          message: "No route matches POST /v1/partner/events",
          docs: "https://example.com/docs/v2",
        },
        { status: 404, headers: NO_STORE },
      );

    case "timeout":
      await sleep(8000);
      return healthy("legacy-gateway");
  }
}

export const GET = handle;
export const POST = handle;
export const HEAD = handle;
