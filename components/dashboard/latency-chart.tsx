"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { fmtMs, fmtTime } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import type { CheckResult, Status } from "@/lib/types";
import { StatusDot } from "../ui/status";

const ms = new Intl.NumberFormat("de-DE");

const STATUS_COLOR: Record<Status, string> = {
  operational: "var(--ok)",
  degraded: "var(--warn)",
  down: "var(--fail)",
};

interface Point {
  at: number;
  latency: number;
  status: Status;
  code: number | null;
}

function ChartTooltip({ active, payload }: Pick<TooltipContentProps<ValueType, NameType>, "active" | "payload">) {
  const point = active ? (payload?.[0]?.payload as Point | undefined) : undefined;
  if (!point) return null;
  return (
    <div className="min-w-40 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1.5 font-medium text-muted tabular">{fmtTime(point.at)}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-ink">
          <StatusDot status={point.status} />
          {STATUS_META[point.status].label}
        </span>
        <span className="font-mono font-semibold text-ink tabular">{fmtMs(point.latency)}</span>
      </div>
      <div className="mt-1 text-muted">HTTP {point.code ?? "– (keine Antwort)"}</div>
    </div>
  );
}

function StatusMarker(props: { cx?: number; cy?: number; payload?: Point }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  // Healthy points stay quiet; only anomalies get a marker.
  if (payload.status === "operational") return null;
  return <circle cx={cx} cy={cy} r={4} fill={STATUS_COLOR[payload.status]} stroke="var(--surface)" strokeWidth={2} />;
}

export function LatencyChart({
  results,
  warnMs,
  height = 260,
}: {
  results: CheckResult[];
  warnMs: number;
  height?: number;
}) {
  const data: Point[] = results.map((r) => ({ at: r.at, latency: r.latencyMs, status: r.status, code: r.statusCode }));

  if (data.length < 2) {
    return (
      <div
        style={{ height }}
        className="grid place-items-center rounded-lg border border-dashed border-line text-sm text-muted"
      >
        Der Verlauf erscheint nach der zweiten Prüfung.
      </div>
    );
  }

  const max = Math.max(warnMs * 1.25, ...data.map((d) => d.latency));
  const spanMs = data[data.length - 1].at - data[0].at;

  return (
    <div
      style={{ height }}
      role="img"
      aria-label={`Latenzverlauf der letzten ${data.length} Prüfungen, Warnschwelle ${warnMs} ms`}
    >
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height }}>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="latency-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="at"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => (spanMs < 10 * 60_000 ? fmtTime(v) : fmtTime(v).slice(0, 5))}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
            minTickGap={48}
          />
          <YAxis
            domain={[0, Math.ceil(max / 100) * 100]}
            tickFormatter={(v: number) => `${ms.format(v)} ms`}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <ReferenceLine
            y={warnMs}
            stroke="var(--warn)"
            strokeDasharray="4 4"
            label={{
              value: `Warnschwelle ${warnMs} ms`,
              position: "insideTopRight",
              fill: "var(--warn-ink)",
              fontSize: 11,
            }}
          />
          <Tooltip
            content={ChartTooltip}
            cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="latency"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#latency-fill)"
            dot={StatusMarker}
            activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2, fill: "var(--accent)" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
