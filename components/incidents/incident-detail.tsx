"use client";

import { ArrowLeft, Check, CheckCircle2, Clock, Copy, Repeat, Timer } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { displayUrl, fmtDateTime, fmtDuration, fmtMs, prettyBody } from "@/lib/format";
import { HTTP_REASONS } from "@/lib/status";
import { resolveIncident, useMonitor } from "@/lib/store";
import type { Incident, Probe } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { LatencyChart } from "../dashboard/latency-chart";
import { PageBody, PageHeader } from "../shell/page-header";
import { Button, CodeBlock, cx, MethodTag, Panel, PanelHeader } from "../ui/primitives";
import { HttpCode, SeverityBadge } from "../ui/status";

function Fact({ label, children, tone }: { label: string; children: ReactNode; tone?: "fail" | "warn" }) {
  return (
    <div className="rounded-lg border border-line bg-sunken/50 px-4 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={cx(
          "mt-1 font-mono text-lg font-semibold tabular",
          tone === "fail" ? "text-fail-ink" : tone === "warn" ? "text-warn-ink" : "text-ink",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? <Check /> : <Copy />}
      {done ? "Kopiert" : label}
    </Button>
  );
}

function ResponseBlock({ title, probe }: { title: string; probe: Probe }) {
  const headers = Object.entries(probe.headers);
  return (
    <Panel>
      <PanelHeader
        title={title}
        description={fmtDateTime(probe.at)}
        actions={probe.body ? <CopyButton text={probe.body} label="Body kopieren" /> : undefined}
      />
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <HttpCode code={probe.statusCode} error={probe.error} />
          <span className="text-muted">
            {probe.statusCode !== null ? (HTTP_REASONS[probe.statusCode] ?? "") : "Keine Antwort"}
          </span>
          <span className="font-mono text-ink tabular">{fmtMs(probe.latencyMs)}</span>
        </div>
        {probe.error && (
          <div className="rounded-lg border border-fail/30 bg-fail-soft px-4 py-3">
            <div className="text-xs font-medium text-fail-ink">Fehlermeldung</div>
            <div className="mt-1 font-mono text-[13px] text-fail-ink">{probe.error}</div>
          </div>
        )}
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted">Error-Body</div>
          <CodeBlock>{prettyBody(probe.body) || "(leer)"}</CodeBlock>
        </div>
        {headers.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-medium text-muted">Antwort-Header (Auswahl)</div>
            <dl className="divide-y divide-line rounded-lg border border-line font-mono text-xs">
              {headers.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[10rem_minmax(0,1fr)] gap-3 px-3 py-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="truncate text-ink" title={v}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </Panel>
  );
}

function Timeline({ incident }: { incident: Incident }) {
  const items: Array<{ icon: ReactNode; label: string; at: number; tone: string }> = [
    {
      icon: <Clock />,
      label: incident.severity === "critical" ? "Ausfall erkannt" : "Latenz über Warnschwelle",
      at: incident.openedAt,
      tone: "text-fail-ink bg-fail-soft",
    },
  ];
  if (incident.occurrences > 1) {
    items.push({
      icon: <Repeat />,
      label: `Zuletzt fehlerhaft (${incident.occurrences} Prüfungen insgesamt)`,
      at: incident.lastSeenAt,
      tone: "text-warn-ink bg-warn-soft",
    });
  }
  if (incident.resolvedAt !== null) {
    items.push({
      icon: <CheckCircle2 />,
      label: incident.source === "webhook" ? "Einzelne Zustellung, sofort abgeschlossen" : "Wieder betriebsbereit",
      at: incident.resolvedAt,
      tone: "text-ok-ink bg-ok-soft",
    });
  }
  return (
    <ol className="flex flex-col gap-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className={cx("grid size-7 shrink-0 place-items-center rounded-full [&_svg]:size-3.5", item.tone)}>
            {item.icon}
          </span>
          <div>
            <div className="text-sm text-ink">{item.label}</div>
            <div className="text-xs text-muted tabular">{fmtDateTime(item.at)}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function curlFor(incident: Incident) {
  const url = incident.url.startsWith("/") ? `${location.origin}${incident.url}` : incident.url;
  const parts = [`curl -i -X ${incident.method} '${url}'`];
  if (incident.requestBody) {
    parts.push(`-H 'content-type: application/json'`, `--data '${incident.requestBody.replace(/'/g, "'\\''")}'`);
  }
  return parts.join(" \\\n  ");
}

export function IncidentDetail({ id }: { id: string }) {
  const ready = useMonitor((s) => s.ready);
  const incident = useMonitor((s) => s.incidents.find((i) => i.id === id));
  const history = useMonitor((s) => (incident?.endpointId ? s.history[incident.endpointId] : undefined));
  const now = useNow(1000);

  if (!ready) {
    return (
      <PageBody>
        <div className="h-96 animate-pulse rounded-xl border border-line bg-surface" aria-hidden />
      </PageBody>
    );
  }

  if (!incident) {
    return (
      <PageBody>
        <PageHeader
          title="Vorfall nicht gefunden"
          description="Er wurde gelöscht oder stammt aus einem anderen Browser. Das Protokoll liegt lokal bei Ihnen."
        />
        <div>
          <Link href="/incidents" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
            <ArrowLeft className="size-4" />
            Zu allen Vorfällen
          </Link>
        </div>
      </PageBody>
    );
  }

  const open = incident.resolvedAt === null;
  const durationMs = (incident.resolvedAt ?? now) - incident.openedAt;
  const changed =
    incident.last.at !== incident.first.at &&
    (incident.last.statusCode !== incident.first.statusCode || incident.last.error !== incident.first.error);

  return (
    <PageBody>
      <div>
        <Link href="/incidents" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" />
          Vorfälle
        </Link>
      </div>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <SeverityBadge severity={incident.severity} />
            <span
              className={cx(
                "rounded px-1.5 py-0.5 font-medium",
                open ? "bg-fail-soft text-fail-ink" : "bg-ok-soft text-ok-ink",
              )}
            >
              {open ? "Offen" : "Behoben"}
            </span>
            <span className="font-mono text-faint">{incident.id}</span>
          </span>
        }
        title={incident.endpointName}
        description={
          <span className="flex items-center gap-2">
            <MethodTag method={incident.method} />
            <span className="truncate font-mono text-xs">{displayUrl(incident.url)}</span>
          </span>
        }
        actions={
          <>
            <CopyButton text={curlFor(incident)} label="Als cURL kopieren" />
            {open && (
              <Button variant="secondary" onClick={() => resolveIncident(incident.id)}>
                <CheckCircle2 />
                Als behoben markieren
              </Button>
            )}
          </>
        }
      />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Fact label="Statuscode" tone="fail">
          {incident.first.statusCode ??
            (incident.first.error?.startsWith("Zeitüberschreitung") ? "Timeout" : "Keine Antwort")}
          {incident.first.statusCode !== null && (
            <span className="ml-2 font-sans text-xs font-normal text-muted">
              {HTTP_REASONS[incident.first.statusCode] ?? ""}
            </span>
          )}
        </Fact>
        <Fact label="Latenz" tone={incident.first.latencyMs > incident.warnMs ? "warn" : undefined}>
          {fmtMs(incident.first.latencyMs)}
          <span className="ml-2 font-sans text-xs font-normal text-muted">Schwelle {fmtMs(incident.warnMs)}</span>
        </Fact>
        <Fact label={open ? "Dauer bisher" : "Dauer"}>
          <span className="inline-flex items-center gap-1.5">
            <Timer className="size-4 text-faint" />
            {now || !open ? fmtDuration(Math.max(0, durationMs)) : "–"}
          </span>
        </Fact>
        <Fact label="Fehlerhafte Prüfungen">{incident.occurrences}</Fact>
      </dl>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <ResponseBlock title="Erste fehlerhafte Antwort" probe={incident.first} />
          {changed && <ResponseBlock title="Letzte fehlerhafte Antwort" probe={incident.last} />}
          {incident.requestBody && (
            <Panel>
              <PanelHeader
                title="Gesendeter Payload"
                actions={<CopyButton text={incident.requestBody} label="Kopieren" />}
              />
              <div className="p-5">
                <CodeBlock>{prettyBody(incident.requestBody)}</CodeBlock>
              </div>
            </Panel>
          )}
          {history && history.length > 1 && (
            <Panel>
              <PanelHeader
                title="Latenz dieses Endpunkts"
                description="Letzte 60 Prüfungen, auffällige Punkte markiert."
              />
              <div className="p-5">
                <LatencyChart results={history} warnMs={incident.warnMs} height={220} />
              </div>
            </Panel>
          )}
        </div>
        <Panel className="h-fit">
          <PanelHeader title="Verlauf" />
          <div className="p-5">
            <Timeline incident={incident} />
          </div>
        </Panel>
      </div>
    </PageBody>
  );
}
