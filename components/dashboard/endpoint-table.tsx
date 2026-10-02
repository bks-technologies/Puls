"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { displayUrl, fmtMs, fmtPercent, fmtRelative } from "@/lib/format";
import { percentile, uptime } from "@/lib/incidents";
import { removeEndpoint, runChecks, useMonitor } from "@/lib/store";
import type { Endpoint } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { Button, cx, MethodTag } from "../ui/primitives";
import { HttpCode, StatusBadge } from "../ui/status";
import { HistoryBars } from "./history-bars";

function confirmRemove(endpoint: Endpoint) {
  if (confirm(`„${endpoint.name}“ aus der Überwachung entfernen?`)) removeEndpoint(endpoint.id);
}

export function EndpointTable({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const endpoints = useMonitor((s) => s.endpoints);
  const history = useMonitor((s) => s.history);
  const latest = useMonitor((s) => s.latest);
  const running = useMonitor((s) => s.running);
  const now = useNow(5000);

  const rows = endpoints.map((endpoint) => {
    const results = history[endpoint.id] ?? [];
    const last = results.at(-1);
    const latencies = results.filter((r) => r.statusCode !== null).map((r) => r.latencyMs);
    return {
      endpoint,
      results,
      status: last?.status ?? ("pending" as const),
      last,
      probe: latest[endpoint.id],
      p95: percentile(latencies, 95),
      uptime: uptime(results),
    };
  });

  if (rows.length === 0) {
    return (
      <div className="px-5 py-14 text-center">
        <p className="text-sm font-medium text-ink">Noch keine Endpunkte</p>
        <p className="mt-1 text-sm text-muted">Fügen Sie oben eine URL hinzu oder setzen Sie die Demo zurück.</p>
      </div>
    );
  }

  return (
    <>
      {/* Table from md upwards */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium text-muted">
              <th scope="col" className="py-2.5 pr-3 pl-5 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Endpunkt
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Code
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Latenz
              </th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-medium xl:table-cell">
                p95
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Verfügbar
              </th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">
                Letzte 30 Prüfungen
              </th>
              <th scope="col" className="py-2.5 pr-5 pl-3 text-right font-medium">
                <span className="sr-only">Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ endpoint, results, status, last, probe, p95, uptime: up }) => {
              const selected = endpoint.id === selectedId;
              return (
                <tr
                  key={endpoint.id}
                  onClick={() => onSelect(endpoint.id)}
                  aria-selected={selected}
                  className={cx(
                    "cursor-pointer border-b border-line transition-colors last:border-b-0",
                    selected ? "bg-accent-soft/60" : "hover:bg-sunken/70",
                  )}
                >
                  <td className="py-3 pr-3 pl-5 align-middle">
                    <StatusBadge status={status} live={status === "down"} />
                  </td>
                  <td className="max-w-[18rem] px-3 py-3">
                    <div className="flex items-center gap-2">
                      <MethodTag method={endpoint.method} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(endpoint.id);
                        }}
                        className="truncate text-left font-medium text-ink hover:text-accent"
                      >
                        {endpoint.name}
                      </button>
                    </div>
                    <div className="mt-0.5 truncate font-mono text-xs text-muted" title={endpoint.url}>
                      {displayUrl(endpoint.url)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {last ? (
                      <HttpCode code={last.statusCode} error={probe?.error} />
                    ) : (
                      <span className="text-faint">–</span>
                    )}
                  </td>
                  <td
                    className={cx(
                      "px-3 py-3 text-right font-mono text-[13px] tabular",
                      status === "degraded" ? "font-semibold text-warn-ink" : "text-ink",
                    )}
                  >
                    {last && last.statusCode !== null ? fmtMs(last.latencyMs) : "–"}
                  </td>
                  <td className="hidden px-3 py-3 text-right font-mono text-[13px] text-muted tabular xl:table-cell">
                    {fmtMs(p95)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-[13px] text-ink tabular">{fmtPercent(up)}</td>
                  <td className="hidden px-3 py-3 lg:table-cell">
                    <HistoryBars results={results} />
                    <div className="mt-1 text-[11px] text-faint tabular">
                      {last && now ? fmtRelative(last.at, now) : "noch nicht geprüft"}
                    </div>
                  </td>
                  <td className="py-3 pr-5 pl-3">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        disabled={running}
                        onClick={() => runChecks([endpoint.id])}
                        aria-label={`${endpoint.name} jetzt prüfen`}
                        title="Jetzt prüfen"
                      >
                        <RefreshCw />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 hover:text-fail-ink"
                        onClick={() => confirmRemove(endpoint)}
                        aria-label={`${endpoint.name} entfernen`}
                        title="Entfernen"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards on small screens */}
      <ul className="divide-y divide-line md:hidden">
        {rows.map(({ endpoint, results, status, last, probe, uptime: up }) => (
          <li key={endpoint.id}>
            <button
              type="button"
              onClick={() => onSelect(endpoint.id)}
              className={cx(
                "flex w-full flex-col gap-2.5 px-4 py-3.5 text-left",
                endpoint.id === selectedId && "bg-accent-soft/60",
              )}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <MethodTag method={endpoint.method} />
                    <span className="truncate font-medium text-ink">{endpoint.name}</span>
                  </div>
                  <div className="mt-0.5 truncate font-mono text-xs text-muted">{displayUrl(endpoint.url)}</div>
                </div>
                <StatusBadge status={status} />
              </div>
              <div className="flex w-full items-center justify-between gap-3 text-xs text-muted">
                <span className="flex items-center gap-2 tabular">
                  {last && <HttpCode code={last.statusCode} error={probe?.error} />}
                  {last && last.statusCode !== null ? fmtMs(last.latencyMs) : ""}
                  <span>· {fmtPercent(up)}</span>
                </span>
                <HistoryBars results={results} slots={20} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
