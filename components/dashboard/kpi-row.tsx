"use client";

import { Gauge, Server, ShieldCheck, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { fmtMs, fmtPercent } from "@/lib/format";
import { percentile, uptime } from "@/lib/incidents";
import { useMonitor } from "@/lib/store";
import type { DisplayStatus } from "@/lib/types";
import { Panel } from "../ui/primitives";
import { StatusDot } from "../ui/status";

function Kpi({ icon, label, value, foot }: { icon: ReactNode; label: string; value: ReactNode; foot: ReactNode }) {
  return (
    <Panel className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>{label}</span>
        <span className="text-faint [&_svg]:size-4">{icon}</span>
      </div>
      <div className="text-[28px] leading-none font-semibold tracking-tight text-ink tabular">{value}</div>
      <div className="text-xs text-muted">{foot}</div>
    </Panel>
  );
}

export function KpiRow() {
  const endpoints = useMonitor((s) => s.endpoints);
  const history = useMonitor((s) => s.history);
  const incidents = useMonitor((s) => s.incidents);

  const counts: Record<DisplayStatus, number> = { operational: 0, degraded: 0, down: 0, pending: 0 };
  for (const e of endpoints) counts[history[e.id]?.at(-1)?.status ?? "pending"] += 1;

  const all = endpoints.flatMap((e) => history[e.id] ?? []);
  const answered = all.filter((r) => r.statusCode !== null).map((r) => r.latencyMs);
  const avg = answered.length ? Math.round(answered.reduce((a, b) => a + b, 0) / answered.length) : null;
  const open = incidents.filter((i) => i.resolvedAt === null);
  const critical = open.filter((i) => i.severity === "critical").length;

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Kpi
        icon={<Server />}
        label="Endpunkte"
        value={endpoints.length}
        foot={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular">
            {(["operational", "degraded", "down"] as const).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <StatusDot status={s} />
                {counts[s]}
                <span className="sr-only">{s}</span>
              </span>
            ))}
          </span>
        }
      />
      <Kpi
        icon={<ShieldCheck />}
        label="Verfügbarkeit"
        value={fmtPercent(uptime(all))}
        foot={`aus ${all.length} Prüfungen dieser Sitzung`}
      />
      <Kpi
        icon={<Gauge />}
        label="Ø Antwortzeit"
        value={fmtMs(avg)}
        foot={<span className="tabular">p95 {fmtMs(percentile(answered, 95))}</span>}
      />
      <Kpi
        icon={<TriangleAlert />}
        label="Offene Vorfälle"
        value={open.length}
        foot={open.length === 0 ? "Alles ruhig" : `${critical} kritisch · ${open.length - critical} Warnung`}
      />
    </div>
  );
}
