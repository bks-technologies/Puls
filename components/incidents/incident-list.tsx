"use client";

import { ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { displayUrl, fmtDateTime, fmtDuration, fmtMs } from "@/lib/format";
import { clearResolvedIncidents, useMonitor } from "@/lib/store";
import type { Incident } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { PageBody, PageHeader } from "../shell/page-header";
import { Button, cx, Panel } from "../ui/primitives";
import { HttpCode, SeverityBadge } from "../ui/status";

type Filter = "all" | "open" | "resolved";
type Source = "all" | "monitor" | "webhook";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "open", label: "Offen" },
  { id: "resolved", label: "Behoben" },
];

const SOURCES: Array<{ id: Source; label: string }> = [
  { id: "all", label: "Alle Quellen" },
  { id: "monitor", label: "Überwachung" },
  { id: "webhook", label: "Webhook-Simulator" },
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  counts,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg border border-line-strong bg-surface p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            "h-7 rounded-md px-3 text-[13px] transition-colors",
            value === o.id
              ? "bg-sunken font-medium text-ink shadow-[inset_0_0_0_1px_var(--line)]"
              : "text-muted hover:text-ink",
          )}
        >
          {o.label}
          {counts?.[o.id] !== undefined && <span className="ml-1.5 text-faint tabular">{counts[o.id]}</span>}
        </button>
      ))}
    </div>
  );
}

function duration(incident: Incident, now: number) {
  const end = incident.resolvedAt ?? now;
  if (!now && incident.resolvedAt === null) return "–";
  return fmtDuration(Math.max(0, end - incident.openedAt));
}

export function IncidentList() {
  const ready = useMonitor((s) => s.ready);
  const incidents = useMonitor((s) => s.incidents);
  const now = useNow(1000);
  const [filter, setFilter] = useState<Filter>("all");
  const [source, setSource] = useState<Source>("all");

  const bySource = incidents.filter((i) => source === "all" || i.source === source);
  const visible = bySource.filter((i) =>
    filter === "all" ? true : filter === "open" ? i.resolvedAt === null : i.resolvedAt !== null,
  );
  const counts = {
    all: bySource.length,
    open: bySource.filter((i) => i.resolvedAt === null).length,
    resolved: bySource.filter((i) => i.resolvedAt !== null).length,
  };

  return (
    <PageBody>
      <PageHeader
        eyebrow="Protokoll"
        title="Vorfälle"
        description="Jeder Ausfall und jede Latenz-Warnung mit Statuscode, Antwortzeit und Fehler-Body. Ein Vorfall bleibt offen, bis die nächste Prüfung wieder grün ist."
        actions={
          counts.resolved > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                if (confirm("Alle behobenen Vorfälle aus dem Protokoll entfernen?")) clearResolvedIncidents();
              }}
            >
              Behobene leeren
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Status" options={FILTERS} value={filter} onChange={setFilter} counts={counts} />
        <Segmented label="Quelle" options={SOURCES} value={source} onChange={setSource} />
      </div>

      <Panel>
        {!ready ? (
          <div className="h-64 animate-pulse" aria-hidden />
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <Inbox className="size-8 text-faint" />
            <p className="mt-3 text-sm font-medium text-ink">Keine Vorfälle in dieser Ansicht</p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Vorfälle entstehen automatisch, sobald eine Prüfung fehlschlägt oder langsamer als die Warnschwelle ist.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((incident) => (
              <li key={incident.id}>
                <Link
                  href={`/incidents/${incident.id}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-sunken/70 md:grid-cols-[8.5rem_minmax(0,1fr)_5rem_6rem_9rem_1rem]"
                >
                  <div className="flex items-center gap-2 md:block">
                    <SeverityBadge severity={incident.severity} />
                  </div>
                  <ChevronRight className="size-4 justify-self-end text-faint md:hidden" />

                  <div className="col-span-2 min-w-0 md:col-span-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-ink">{incident.endpointName}</span>
                      {incident.resolvedAt === null ? (
                        <span className="rounded bg-fail-soft px-1.5 py-px text-[11px] font-medium text-fail-ink">
                          offen
                        </span>
                      ) : (
                        <span className="rounded bg-sunken px-1.5 py-px text-[11px] text-muted">behoben</span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted">
                      <span className="font-mono">{displayUrl(incident.url)}</span>
                      {incident.first.error && <span> · {incident.first.error}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:contents">
                    <div className="md:text-right">
                      <HttpCode code={incident.first.statusCode} error={incident.first.error} />
                    </div>
                    <div className="font-mono text-[13px] text-ink tabular md:text-right">
                      {fmtMs(incident.first.latencyMs)}
                    </div>
                    <div className="text-xs text-muted tabular md:text-right">
                      <div>{fmtDateTime(incident.openedAt)}</div>
                      <div className="text-faint">
                        {duration(incident, now)}
                        {incident.occurrences > 1 && ` · ${incident.occurrences}×`}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="hidden size-4 text-faint md:block" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </PageBody>
  );
}
