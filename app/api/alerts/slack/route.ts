import { clientIp, rateLimit, tooMany } from "@/lib/server/rate-limit";

/**
 * Forwards an alert to a Slack incoming webhook. The message is composed here
 * from a few validated fields, so the route cannot relay arbitrary content,
 * and only Slack's webhook host is accepted as a target.
 */

const SLACK_PREFIX = "https://hooks.slack.com/services/";
const KINDS = {
  test: { emoji: ":large_blue_circle:", title: "Testnachricht von Puls" },
  down: { emoji: ":red_circle:", title: "Ausfall erkannt" },
  degraded: { emoji: ":large_yellow_circle:", title: "Latenz-Warnung" },
  resolved: { emoji: ":large_green_circle:", title: "Wieder betriebsbereit" },
} as const;

type Kind = keyof typeof KINDS;

const clip = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

export async function POST(request: Request) {
  const limit = rateLimit(`slack:${clientIp(request)}`, 10, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const webhookUrl = clip(body?.webhookUrl, 300);
  const kind = (typeof body?.kind === "string" && body.kind in KINDS ? body.kind : null) as Kind | null;

  if (!webhookUrl.startsWith(SLACK_PREFIX) || !/^[A-Za-z0-9/_-]+$/.test(webhookUrl.slice(SLACK_PREFIX.length))) {
    return Response.json({ ok: false, error: `Die URL muss mit ${SLACK_PREFIX} beginnen.` }, { status: 400 });
  }
  if (!kind) return Response.json({ ok: false, error: "Unbekannte Art der Meldung." }, { status: 400 });

  const meta = KINDS[kind];
  const name = clip(body?.endpointName, 80) || "Puls";
  const target = clip(body?.url, 200);
  const statusCode = typeof body?.statusCode === "number" ? body.statusCode : null;
  const latencyMs = typeof body?.latencyMs === "number" ? Math.round(body.latencyMs) : null;
  const error = clip(body?.error, 200);

  const facts = [
    target && `*Ziel:* \`${target}\``,
    statusCode !== null && `*Status:* ${statusCode}`,
    latencyMs !== null && `*Latenz:* ${latencyMs} ms`,
    error && `*Fehler:* ${error}`,
  ].filter(Boolean);

  const text =
    kind === "test"
      ? `${meta.emoji} *${meta.title}*\nDie Verbindung steht. Ab jetzt landen Ausfälle und Warnungen in diesem Kanal.`
      : `${meta.emoji} *${meta.title}: ${name}*\n${facts.join("\n")}`;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    const detail = (await res.text()).slice(0, 200);
    return Response.json({ ok: res.ok, status: res.status, detail }, { status: res.ok ? 200 : 502 });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Slack nicht erreichbar." },
      { status: 502 },
    );
  }
}
