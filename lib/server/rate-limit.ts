/**
 * Small fixed-window limiter per instance. Not a global guarantee on
 * serverless platforms, but enough to stop a single client from turning the
 * public demo into a load generator.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { ok: false, retryAfter: Math.ceil((bucket.reset - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export function tooMany(retryAfter: number) {
  return Response.json(
    { error: "Zu viele Anfragen. Bitte kurz warten." },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}
