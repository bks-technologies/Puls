import { HTTP_REASONS, STATUS_META } from "@/lib/status";
import type { DisplayStatus, Severity } from "@/lib/types";
import { cx } from "./primitives";

export function StatusDot({ status, live = false }: { status: DisplayStatus; live?: boolean }) {
  const meta = STATUS_META[status];
  return (
    <span className="relative inline-flex size-2.5 shrink-0">
      {live && status !== "pending" && (
        <span className={cx("absolute inset-0 rounded-full motion-safe:animate-pulse-ring", meta.dot)} />
      )}
      <span className={cx("relative inline-flex size-2.5 rounded-full", meta.dot)} />
    </span>
  );
}

export function StatusBadge({ status, live = false }: { status: DisplayStatus; live?: boolean }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        meta.soft,
        meta.text,
        meta.ring,
      )}
    >
      <StatusDot status={status} live={live} />
      {meta.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <StatusBadge status={severity === "critical" ? "down" : "degraded"} />;
}

export function HttpCode({ code, error }: { code: number | null; error?: string | null }) {
  if (code === null) {
    return (
      <span className="inline-flex items-center rounded bg-fail-soft px-1.5 py-0.5 font-mono text-xs font-semibold text-fail-ink">
        {error?.startsWith("Zeitüberschreitung") ? "TIMEOUT" : "ERR"}
      </span>
    );
  }
  const tone =
    code >= 500
      ? "bg-fail-soft text-fail-ink"
      : code >= 400
        ? "bg-fail-soft text-fail-ink"
        : code >= 300
          ? "bg-sunken text-muted"
          : "bg-ok-soft text-ok-ink";
  return (
    <span
      className={cx("inline-flex items-center rounded px-1.5 py-0.5 font-mono text-xs font-semibold", tone)}
      title={HTTP_REASONS[code]}
    >
      {code}
    </span>
  );
}
