"use client";

import { Pause, Play, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { runChecks, setPolling, useMonitor } from "@/lib/store";
import { PageBody, PageHeader } from "../shell/page-header";
import { Button, cx, Panel, PanelHeader, Select } from "../ui/primitives";
import { AddEndpointForm } from "./add-endpoint-form";
import { DemoNotice } from "./demo-notice";
import { EndpointDetail } from "./endpoint-detail";
import { EndpointTable } from "./endpoint-table";
import { KpiRow } from "./kpi-row";

function PollingControls() {
  const polling = useMonitor((s) => s.polling);
  const running = useMonitor((s) => s.running);
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 items-center rounded-lg border border-line-strong bg-surface">
        <button
          type="button"
          onClick={() => setPolling({ enabled: !polling.enabled })}
          className="flex h-full items-center gap-1.5 rounded-l-lg px-3 text-sm whitespace-nowrap text-ink hover:bg-sunken"
          aria-pressed={polling.enabled}
        >
          {polling.enabled ? <Pause className="size-4" /> : <Play className="size-4" />}
          {polling.enabled ? "Automatik an" : "Automatik aus"}
        </button>
        <label className="sr-only" htmlFor="interval">
          Prüfintervall
        </label>
        <Select
          id="interval"
          value={polling.intervalSec}
          onChange={(e) => setPolling({ intervalSec: Number(e.target.value) })}
          className="h-full w-[5.5rem] rounded-l-none border-0 border-l border-line bg-transparent text-sm focus:ring-0"
        >
          <option value={15}>15 s</option>
          <option value={30}>30 s</option>
          <option value={60}>60 s</option>
        </Select>
      </div>
      <Button onClick={() => runChecks()} disabled={running}>
        <RefreshCw className={cx(running && "animate-spin")} />
        Jetzt prüfen
      </Button>
    </div>
  );
}

export function Dashboard() {
  const ready = useMonitor((s) => s.ready);
  const endpoints = useMonitor((s) => s.endpoints);
  const lastError = useMonitor((s) => s.lastError);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const selectedId = endpoints.some((e) => e.id === selected) ? selected : (endpoints[0]?.id ?? null);

  return (
    <PageBody>
      <PageHeader
        eyebrow="Überwachung"
        title="Übersicht"
        description="Live-Status aller angemeldeten APIs und Webhooks. Grün: betriebsbereit, Gelb: über der Warnschwelle, Rot: Fehler oder keine Antwort."
        actions={
          <>
            <PollingControls />
            <Button variant="primary" onClick={() => setAdding(true)} disabled={adding}>
              <Plus />
              Endpunkt
            </Button>
          </>
        }
      />

      <DemoNotice />

      {lastError && (
        <div role="alert" className="rounded-lg border border-fail/30 bg-fail-soft px-4 py-3 text-sm text-fail-ink">
          {lastError}
        </div>
      )}

      {!ready ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[118px] animate-pulse rounded-xl border border-line bg-surface" />
          ))}
        </div>
      ) : (
        <KpiRow />
      )}

      {adding && <AddEndpointForm onClose={() => setAdding(false)} onAdded={setSelected} />}

      <Panel>
        <PanelHeader title="Endpunkte" description="Zeile anklicken für Latenzverlauf und letzte Antwort." />
        {ready ? (
          <EndpointTable selectedId={selectedId} onSelect={setSelected} />
        ) : (
          <div className="h-64 animate-pulse" aria-hidden />
        )}
      </Panel>

      {ready && selectedId && <EndpointDetail endpointId={selectedId} />}
    </PageBody>
  );
}
