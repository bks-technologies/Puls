import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { Agent, fetch } from "undici";
import type { HttpMethod, Probe } from "../types";
import { isBlockedAddress } from "./guard";

/**
 * Resolves again at connect time and refuses private addresses, so a host
 * cannot pass the pre-check and then rebind to an internal IP.
 */
const publicOnly = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
        if (err) return callback(err, "", 0);
        const list = addresses as unknown as LookupAddress[];
        if (list.length === 0 || list.some((a) => isBlockedAddress(a.address))) {
          return callback(Object.assign(new Error("Interne Adresse blockiert"), { code: "EBLOCKED" }), "", 0);
        }
        if ((options as { all?: boolean }).all)
          return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, list);
        callback(null, list[0].address, list[0].family);
      });
    },
  },
});

const BODY_LIMIT = 4096;
const KEPT_HEADERS = [
  "content-type",
  "content-length",
  "server",
  "cache-control",
  "retry-after",
  "x-request-id",
  "location",
];

type FetchResponse = Awaited<ReturnType<typeof fetch>>;

async function readLimited(res: FetchResponse, limit: number) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
    if (size >= limit) {
      truncated = true;
      await reader.cancel().catch(() => {});
      break;
    }
  }
  const merged = new Uint8Array(Math.min(size, limit));
  let offset = 0;
  for (const chunk of chunks) {
    const slice = chunk.subarray(0, merged.length - offset);
    merged.set(slice, offset);
    offset += slice.length;
    if (offset >= merged.length) break;
  }
  const text = new TextDecoder().decode(merged);
  return truncated ? `${text}\n… (gekürzt auf ${limit} Byte)` : text;
}

function describeError(err: unknown, timeoutMs: number) {
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || err.name === "AbortError") return `Zeitüberschreitung nach ${timeoutMs} ms`;
    const cause = (err as Error & { cause?: { code?: string; message?: string } }).cause;
    const code = cause?.code;
    if (code === "EBLOCKED") return "Interne Adresse blockiert";
    if (code === "ECONNREFUSED") return "Verbindung abgelehnt (ECONNREFUSED)";
    if (code === "ENOTFOUND") return "Host nicht gefunden (ENOTFOUND)";
    if (code === "ECONNRESET") return "Verbindung zurückgesetzt (ECONNRESET)";
    if (code?.startsWith("ERR_TLS") || code?.includes("CERT")) return `TLS-Fehler (${code})`;
    if (code) return `${cause?.message ?? err.message} (${code})`;
    return err.message;
  }
  return "Unbekannter Fehler";
}

/**
 * Sends one request and measures time to first byte (headers received),
 * the figure status pages usually report as response time.
 */
export async function probe(url: URL, method: HttpMethod, timeoutMs: number, internal: boolean): Promise<Probe> {
  const at = Date.now();
  const started = performance.now();
  try {
    const res = await fetch(url, {
      method,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "Puls-Monitor/1.0 (+health check)", accept: "application/json, */*;q=0.8" },
      body: method === "POST" ? "{}" : undefined,
      // Own mock routes may live on localhost during development.
      dispatcher: internal ? undefined : publicOnly,
    });
    const latencyMs = Math.round(performance.now() - started);
    const headers: Record<string, string> = {};
    for (const name of KEPT_HEADERS) {
      const value = res.headers.get(name);
      if (value) headers[name] = value;
    }
    const body = method === "HEAD" ? null : await readLimited(res, BODY_LIMIT).catch(() => null);
    return { at, statusCode: res.status, latencyMs, error: null, body, headers };
  } catch (err) {
    return {
      at,
      statusCode: null,
      latencyMs: Math.round(performance.now() - started),
      error: describeError(err, timeoutMs),
      body: null,
      headers: {},
    };
  }
}
