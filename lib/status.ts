import type { DisplayStatus, Probe, Severity, Status } from "./types";

/** Turns a raw probe into one of the three states shown on the dashboard. */
export function classify(probe: Pick<Probe, "statusCode" | "error" | "latencyMs">, warnMs: number): Status {
  if (probe.error || probe.statusCode === null || probe.statusCode >= 400) return "down";
  if (probe.latencyMs > warnMs) return "degraded";
  return "operational";
}

export function severityOf(status: Status): Severity | null {
  if (status === "down") return "critical";
  if (status === "degraded") return "warning";
  return null;
}

export const STATUS_META: Record<
  DisplayStatus,
  { label: string; short: string; dot: string; text: string; soft: string; ring: string; bar: string }
> = {
  operational: {
    label: "Betriebsbereit",
    short: "OK",
    dot: "bg-ok",
    text: "text-ok-ink",
    soft: "bg-ok-soft",
    ring: "ring-ok/25",
    bar: "bg-ok",
  },
  degraded: {
    label: "Latenz-Warnung",
    short: "Langsam",
    dot: "bg-warn",
    text: "text-warn-ink",
    soft: "bg-warn-soft",
    ring: "ring-warn/30",
    bar: "bg-warn",
  },
  down: {
    label: "Ausfall",
    short: "Fehler",
    dot: "bg-fail",
    text: "text-fail-ink",
    soft: "bg-fail-soft",
    ring: "ring-fail/25",
    bar: "bg-fail",
  },
  pending: {
    label: "Ausstehend",
    short: "–",
    dot: "bg-faint",
    text: "text-muted",
    soft: "bg-sunken",
    ring: "ring-line",
    bar: "bg-line-strong",
  },
};

export const HTTP_REASONS: Record<number, string> = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  304: "Not Modified",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  408: "Request Timeout",
  413: "Payload Too Large",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};
