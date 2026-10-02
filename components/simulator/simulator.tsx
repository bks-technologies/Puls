"use client";

import { Braces, Check, Copy, Loader2, RefreshCw, Send, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { fmtMs, fmtTime, prettyBody } from "@/lib/format";
import { newId } from "@/lib/ids";
import {
  jsonError,
  PAYLOAD_TEMPLATES,
  SIMULATIONS,
  templateJson,
  type SimulationId,
  type TemplateId,
} from "@/lib/payloads";
import { recordDelivery, regenerateHookId, useMonitor } from "@/lib/store";
import type { Delivery, Probe } from "@/lib/types";
import { PageBody, PageHeader } from "../shell/page-header";
import { Button, CodeBlock, cx, Field, Panel, PanelHeader, Select } from "../ui/primitives";
import { HttpCode } from "../ui/status";

const noop = () => () => {};

function useOrigin() {
  return useSyncExternalStore(
    noop,
    () => location.origin,
    () => "",
  );
}

function HookUrl({ hookId }: { hookId: string }) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const url = `${origin}/api/hooks/${hookId}`;
  return (
    <Panel>
      <PanelHeader
        title="Empfangs-Endpunkt"
        description="Ein echter Mock-Empfänger in dieser App. Er antwortet wie ein Kundensystem, speichert aber nichts."
      />
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-sunken px-3 py-2">
          <span className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-accent-ink">
            POST
          </span>
          <code className="truncate font-mono text-[13px] text-ink">{hookId ? url : "…"}</code>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(url).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Kopiert" : "Kopieren"}
          </Button>
          <Button size="sm" variant="ghost" onClick={regenerateHookId} title="Neue Adresse erzeugen">
            <RefreshCw />
            Neu
          </Button>
        </div>
      </div>
    </Panel>
  );
}

interface Outcome {
  statusCode: number | null;
  latencyMs: number;
  body: string;
  error: string | null;
}

function ResponseView({ outcome, sending }: { outcome: Outcome | null; sending: boolean }) {
  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader title="Antwort" description="Latenz gemessen im Browser, inklusive Netzweg." />
      <div className="flex flex-1 flex-col gap-3 p-5">
        {sending ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            Wird zugestellt …
          </div>
        ) : outcome ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <HttpCode code={outcome.statusCode} error={outcome.error} />
              <span className="font-mono text-sm text-ink tabular">{fmtMs(outcome.latencyMs)}</span>
              {outcome.statusCode !== null && outcome.statusCode < 300 && outcome.latencyMs <= 1000 ? (
                <span className="text-xs text-ok-ink">Zugestellt</span>
              ) : (
                <span className="text-xs text-fail-ink">Als Vorfall protokolliert</span>
              )}
            </div>
            {outcome.error && <p className="text-sm text-fail-ink">{outcome.error}</p>}
            <CodeBlock className="max-h-none flex-1">{prettyBody(outcome.body) || "(leer)"}</CodeBlock>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-6 py-10 text-center">
            <Send className="size-6 text-faint" />
            <p className="text-sm text-muted">Payload wählen, Antwortverhalten festlegen, senden.</p>
          </div>
        )}
      </div>
    </Panel>
  );
}

function DeliveryLog({ deliveries, onPick }: { deliveries: Delivery[]; onPick: (d: Delivery) => void }) {
  return (
    <Panel>
      <PanelHeader
        title="Zustellungen"
        description={`Letzte ${deliveries.length} Sendungen aus diesem Browser.`}
        actions={
          <Link href="/incidents" className="text-sm font-medium text-accent hover:text-accent-hover">
            Fehlgeschlagene im Vorfall-Log
          </Link>
        }
      />
      {deliveries.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">Noch nichts gesendet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th scope="col" className="py-2.5 pr-3 pl-5 font-medium">
                  Zeit
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Event
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Verhalten
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Code
                </th>
                <th scope="col" className="py-2.5 pr-5 pl-3 text-right font-medium">
                  Latenz
                </th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => onPick(d)}
                  className="cursor-pointer border-b border-line last:border-b-0 hover:bg-sunken/70"
                >
                  <td className="py-2.5 pr-3 pl-5 font-mono text-xs text-muted tabular">{fmtTime(d.at)}</td>
                  <td className="px-3 py-2.5 font-mono text-[13px] text-ink">{d.event || "–"}</td>
                  <td className="px-3 py-2.5 text-muted">
                    {SIMULATIONS[d.simulate as SimulationId]?.label ?? d.simulate}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <HttpCode code={d.statusCode} />
                  </td>
                  <td className="py-2.5 pr-5 pl-3 text-right font-mono text-[13px] text-ink tabular">
                    {fmtMs(d.latencyMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export function Simulator() {
  const id = useId();
  const hookId = useMonitor((s) => s.hookId);
  const deliveries = useMonitor((s) => s.deliveries);
  const [template, setTemplate] = useState<TemplateId>("order.created");
  const [payload, setPayload] = useState(() => templateJson("order.created"));
  const [simulate, setSimulate] = useState<SimulationId>("accept");
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const error = jsonError(payload);
  const lines = payload.split("\n").length;
  const bytes = new TextEncoder().encode(payload).byteLength;

  const send = async () => {
    if (!hookId) return;
    setSending(true);
    const at = Date.now();
    const started = performance.now();
    let result: Outcome;
    let headers: Record<string, string> = {};
    try {
      const res = await fetch(`/api/hooks/${hookId}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-simulate": simulate },
        body: payload,
      });
      const latencyMs = Math.round(performance.now() - started);
      const body = await res.text();
      headers = { "content-type": res.headers.get("content-type") ?? "" };
      result = { statusCode: res.status, latencyMs, body, error: null };
    } catch {
      result = {
        statusCode: null,
        latencyMs: Math.round(performance.now() - started),
        body: "",
        error: "Netzwerkfehler: Der Empfänger war nicht erreichbar.",
      };
    }
    setOutcome(result);
    setSending(false);

    let event = "";
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      event = typeof parsed.type === "string" ? parsed.type : typeof parsed.event === "string" ? parsed.event : "";
    } catch {
      event = "(ungültiges JSON)";
    }
    const probe: Probe = {
      at,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      error: result.error,
      body: result.body,
      headers,
    };
    recordDelivery(
      {
        id: newId(8),
        at,
        hookId,
        event,
        simulate,
        statusCode: result.statusCode,
        latencyMs: result.latencyMs,
        ok: result.statusCode !== null && result.statusCode < 300,
        requestBody: payload,
        responseBody: result.body,
      },
      probe,
      SIMULATIONS[simulate].label,
    );
  };

  return (
    <PageBody>
      <PageHeader
        eyebrow="Testen"
        title="Webhook-Simulator"
        description="Senden Sie Test-Payloads an einen erzeugten Mock-Empfänger und sehen Sie Statuscode, Latenz und Antwort. Fehlgeschlagene Zustellungen landen im Vorfall-Log."
      />

      <HookUrl hookId={hookId} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Payload" description="JSON, maximal 64 KB." />
          <div className="flex flex-col gap-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vorlage" htmlFor={`${id}-tpl`}>
                <Select
                  id={`${id}-tpl`}
                  value={template}
                  onChange={(e) => {
                    const next = e.target.value as TemplateId;
                    setTemplate(next);
                    setPayload(templateJson(next));
                  }}
                >
                  {(Object.keys(PAYLOAD_TEMPLATES) as TemplateId[]).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Antwortverhalten des Empfängers" htmlFor={`${id}-sim`} hint={SIMULATIONS[simulate].expect}>
                <Select id={`${id}-sim`} value={simulate} onChange={(e) => setSimulate(e.target.value as SimulationId)}>
                  {(Object.keys(SIMULATIONS) as SimulationId[]).map((s) => (
                    <option key={s} value={s}>
                      {SIMULATIONS[s].label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor={`${id}-body`} className="text-[13px] font-medium text-ink">
                  Body
                </label>
                <button
                  type="button"
                  disabled={!!error}
                  onClick={() => setPayload(JSON.stringify(JSON.parse(payload), null, 2))}
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink disabled:opacity-40"
                >
                  <Braces className="size-3.5" />
                  Formatieren
                </button>
              </div>
              <div
                className={cx(
                  "flex overflow-hidden rounded-lg border bg-code focus-within:ring-3",
                  error ? "border-fail focus-within:ring-fail/20" : "border-transparent focus-within:ring-accent/25",
                )}
              >
                <div
                  aria-hidden
                  className="select-none border-r border-white/5 py-3 pr-2 pl-3 text-right font-mono text-[12.5px] leading-relaxed text-white/25 tabular"
                >
                  {Array.from({ length: lines }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  id={`${id}-body`}
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  spellCheck={false}
                  rows={Math.max(14, lines)}
                  aria-invalid={!!error}
                  className="min-w-0 flex-1 resize-none bg-transparent px-3 py-3 font-mono text-[12.5px] leading-relaxed whitespace-pre text-code-ink outline-none"
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs">
                {error ? (
                  <span className="inline-flex items-center gap-1 text-fail-ink" role="alert">
                    <TriangleAlert className="size-3.5" />
                    {error}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-ok-ink">
                    <Check className="size-3.5" />
                    Gültiges JSON
                  </span>
                )}
                <span className="text-muted tabular">{(bytes / 1024).toFixed(1).replace(".", ",")} KB</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {error && <span className="mr-auto text-xs text-muted">Der Empfänger antwortet darauf mit 400.</span>}
              <Button variant="primary" onClick={send} disabled={sending || !hookId}>
                {sending ? <Loader2 className="animate-spin" /> : <Send />}
                {error ? "Trotzdem senden" : "Payload senden"}
              </Button>
            </div>
          </div>
        </Panel>

        <ResponseView outcome={outcome} sending={sending} />
      </div>

      <DeliveryLog
        deliveries={deliveries}
        onPick={(d) => {
          setPayload(d.requestBody);
          setOutcome({ statusCode: d.statusCode, latencyMs: d.latencyMs, body: d.responseBody, error: null });
        }}
      />
    </PageBody>
  );
}
