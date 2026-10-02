"use client";

import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { displayUrl, fmtDateTime, fmtMs, fmtPercent, prettyBody } from "@/lib/format";
import { percentile, uptime } from "@/lib/incidents";
import { updateEndpoint, useMonitor } from "@/lib/store";
import type { Endpoint } from "@/lib/types";
import { Button, CodeBlock, Input, MethodTag, Panel } from "../ui/primitives";
import { HttpCode, StatusBadge } from "../ui/status";
import { LatencyChart } from "./latency-chart";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm font-semibold text-ink tabular">{value}</dd>
    </div>
  );
}

function ThresholdEditor({ endpoint }: { endpoint: Endpoint }) {
  const id = useId();
  const [value, setValue] = useState(String(endpoint.warnMs));
  const [saved, setSaved] = useState(false);

  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && parsed >= 50 && parsed < endpoint.timeoutMs;
  const dirty = parsed !== endpoint.warnMs;

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        updateEndpoint(endpoint.id, { warnMs: parsed });
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-xs text-muted">
          Warnschwelle (ms)
        </label>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={!valid}
          className="h-8 w-28 tabular"
        />
      </div>
      <Button size="sm" type="submit" disabled={!valid || (!dirty && !saved)}>
        {saved ? <Check /> : null}
        {saved ? "Gespeichert" : "Übernehmen"}
      </Button>
    </form>
  );
}

export function EndpointDetail({ endpointId }: { endpointId: string }) {
  const endpoint = useMonitor((s) => s.endpoints.find((e) => e.id === endpointId));
  const results = useMonitor((s) => s.history[endpointId]);
  const probe = useMonitor((s) => s.latest[endpointId]);
  const incidents = useMonitor((s) => s.incidents);

  if (!endpoint) return null;
  const list = results ?? [];
  const latencies = list.filter((r) => r.statusCode !== null).map((r) => r.latencyMs);
  const status = list.at(-1)?.status ?? "pending";
  const openIncident = incidents.find((i) => i.endpointId === endpointId && i.resolvedAt === null);

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">{endpoint.name}</h2>
            <StatusBadge status={status} live={status !== "operational"} />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <MethodTag method={endpoint.method} />
            <span className="truncate font-mono text-xs text-muted">{displayUrl(endpoint.url)}</span>
          </div>
        </div>
        <ThresholdEditor key={endpoint.id} endpoint={endpoint} />
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <dl className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Aktuell" value={probe && probe.statusCode !== null ? fmtMs(probe.latencyMs) : "–"} />
            <Stat label="Median" value={fmtMs(percentile(latencies, 50))} />
            <Stat label="p95" value={fmtMs(percentile(latencies, 95))} />
            <Stat label="Verfügbarkeit" value={fmtPercent(uptime(list))} />
          </dl>
          <LatencyChart results={list} warnMs={endpoint.warnMs} />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Letzte Antwort</h3>
            {probe && <span className="text-xs text-muted tabular">{fmtDateTime(probe.at)}</span>}
          </div>
          {probe ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <HttpCode code={probe.statusCode} error={probe.error} />
                <span className="font-mono text-ink tabular">{fmtMs(probe.latencyMs)}</span>
                {probe.headers["content-type"] && (
                  <span className="truncate font-mono text-xs text-muted">{probe.headers["content-type"]}</span>
                )}
              </div>
              {probe.error && (
                <p className="rounded-lg border border-fail/30 bg-fail-soft px-3 py-2 text-[13px] text-fail-ink">
                  {probe.error}
                </p>
              )}
              <CodeBlock className="max-h-56">{prettyBody(probe.body) || "(kein Body)"}</CodeBlock>
            </>
          ) : (
            <p className="text-sm text-muted">Noch keine Antwort.</p>
          )}
          {openIncident && (
            <Link
              href={`/incidents/${openIncident.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
            >
              Offenen Vorfall ansehen
              <ArrowUpRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </Panel>
  );
}
