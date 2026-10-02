export type Status = "operational" | "degraded" | "down";
export type DisplayStatus = Status | "pending";
export type HttpMethod = "GET" | "POST" | "HEAD";

export interface Endpoint {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  /** Above this latency an otherwise healthy response counts as a warning. */
  warnMs: number;
  /** The probe is aborted after this time and counts as a failure. */
  timeoutMs: number;
  createdAt: number;
}

/** Raw outcome of one HTTP request, as measured by the server. */
export interface Probe {
  at: number;
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
  body: string | null;
  headers: Record<string, string>;
}

export interface CheckResult {
  endpointId: string;
  at: number;
  status: Status;
  statusCode: number | null;
  latencyMs: number;
}

export type IncidentSource = "monitor" | "webhook";
export type Severity = "critical" | "warning";

export interface Incident {
  id: string;
  source: IncidentSource;
  endpointId: string | null;
  endpointName: string;
  url: string;
  method: HttpMethod;
  severity: Severity;
  openedAt: number;
  lastSeenAt: number;
  resolvedAt: number | null;
  occurrences: number;
  warnMs: number;
  first: Probe;
  last: Probe;
  requestBody: string | null;
}

export interface AlertConfig {
  slack: { enabled: boolean; webhookUrl: string; channelHint: string };
  email: { enabled: boolean; recipients: string };
  notifyOn: { down: boolean; degraded: boolean; resolved: boolean };
}

export type AlertKind = "down" | "degraded" | "resolved";

export interface AlertEvent {
  kind: AlertKind;
  incident: Incident;
}

export interface AlertLogEntry {
  id: string;
  at: number;
  channel: "slack";
  kind: AlertKind | "test";
  target: string;
  ok: boolean;
  detail: string;
}

export interface Delivery {
  id: string;
  at: number;
  hookId: string;
  event: string;
  simulate: string;
  statusCode: number | null;
  latencyMs: number;
  ok: boolean;
  requestBody: string;
  responseBody: string;
}
