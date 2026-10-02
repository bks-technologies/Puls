"use client";

import { Check, CheckCircle2, Hash, Info, Loader2, Mail, MessageSquare, Send, XCircle } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { fmtDateTime } from "@/lib/format";
import { saveAlerts, sendTestAlert, useMonitor } from "@/lib/store";
import type { AlertConfig, AlertKind } from "@/lib/types";
import { PageBody, PageHeader } from "../shell/page-header";
import { Button, cx, Field, Input, Panel, PanelHeader, Switch } from "../ui/primitives";
import { StatusDot } from "../ui/status";

const SLACK_PATTERN = /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+$/;
const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

function parseRecipients(value: string) {
  return value
    .split(/[,;\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function validate(c: AlertConfig) {
  const errors: { slack?: string; email?: string } = {};
  if (c.slack.enabled && !SLACK_PATTERN.test(c.slack.webhookUrl.trim())) {
    errors.slack = "Erwartet eine Slack-Incoming-Webhook-URL: https://hooks.slack.com/services/…";
  }
  if (c.email.enabled) {
    const list = parseRecipients(c.email.recipients);
    const bad = list.filter((r) => !EMAIL_PATTERN.test(r));
    if (list.length === 0) errors.email = "Mindestens eine Adresse angeben.";
    else if (bad.length) errors.email = `Ungültig: ${bad.join(", ")}`;
    else if (list.length > 10) errors.email = "Höchstens 10 Empfänger.";
  }
  return errors;
}

function Channel({
  icon,
  title,
  description,
  enabled,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="rounded-lg border border-line">
      <div className="flex items-start gap-3 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sunken text-ink [&_svg]:size-[18px]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="text-sm font-medium text-ink">
            {title}
          </label>
          <p className="text-[13px] text-muted">{description}</p>
        </div>
        <Switch id={id} checked={enabled} onChange={onToggle} label={`${title} aktivieren`} />
      </div>
      {enabled && <div className="border-t border-line p-4">{children}</div>}
    </div>
  );
}

const TRIGGERS: Array<{ id: AlertKind; label: string; hint: string }> = [
  { id: "down", label: "Ausfall", hint: "Fehlercode, Timeout oder keine Verbindung" },
  { id: "degraded", label: "Latenz-Warnung", hint: "Antwort langsamer als die Warnschwelle" },
  { id: "resolved", label: "Wiederhergestellt", hint: "Erste grüne Prüfung nach einem Vorfall" },
];

function AlertLog() {
  const log = useMonitor((s) => s.alertLog);
  return (
    <Panel className="h-fit">
      <PanelHeader title="Versandprotokoll" description="Was zuletzt an Slack ging, mit Antwort." />
      {log.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">Noch keine Benachrichtigung versendet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {log.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
              {entry.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-label="Zugestellt" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-fail" aria-label="Fehlgeschlagen" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 text-sm text-ink">
                  <span className="font-medium">
                    {entry.kind === "test"
                      ? "Testnachricht"
                      : entry.kind === "down"
                        ? "Ausfall"
                        : entry.kind === "degraded"
                          ? "Latenz-Warnung"
                          : "Wiederhergestellt"}
                  </span>
                  <span className="text-muted">· {entry.target}</span>
                </div>
                <div className={cx("truncate text-xs", entry.ok ? "text-muted" : "text-fail-ink")}>{entry.detail}</div>
              </div>
              <span className="shrink-0 text-xs text-faint tabular">{fmtDateTime(entry.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function AlertSettings() {
  const ready = useMonitor((s) => s.ready);
  const saved = useMonitor((s) => s.alerts);
  const activeChannels = [saved.slack.enabled && "Slack", saved.email.enabled && "E-Mail"].filter(Boolean);

  return (
    <PageBody>
      <PageHeader
        eyebrow="Konfiguration"
        title="Benachrichtigungen"
        description="Legen Sie fest, wohin Ausfälle und Warnungen gemeldet werden. Gemeldet wird bei Zustandswechseln, nicht bei jeder Prüfung."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted">
            <StatusDot status={activeChannels.length ? "operational" : "pending"} />
            {activeChannels.length ? `Aktiv: ${activeChannels.join(", ")}` : "Keine Kanäle aktiv"}
          </span>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* The form starts from the stored config, so it mounts only once that has been read. */}
        {ready ? (
          <AlertForm saved={saved} />
        ) : (
          <div className="h-96 animate-pulse rounded-xl border border-line bg-surface" />
        )}
        <AlertLog />
      </div>
    </PageBody>
  );
}

function AlertForm({ saved }: { saved: AlertConfig }) {
  const id = useId();
  const [draft, setDraft] = useState<AlertConfig>(saved);
  const [touched, setTouched] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [test, setTest] = useState<{ state: "idle" | "sending" | "ok" | "fail"; detail?: string }>({ state: "idle" });

  const errors = validate(draft);
  const shown = touched ? errors : {};
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const patch = <K extends keyof AlertConfig>(key: K, value: Partial<AlertConfig[K]>) =>
    setDraft((d) => ({ ...d, [key]: { ...d[key], ...value } }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    saveAlerts({
      ...draft,
      slack: { ...draft.slack, webhookUrl: draft.slack.webhookUrl.trim() },
      email: { ...draft.email, recipients: parseRecipients(draft.email.recipients).join(", ") },
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const runTest = async () => {
    setTouched(true);
    if (!SLACK_PATTERN.test(draft.slack.webhookUrl.trim())) return;
    setTest({ state: "sending" });
    const result = await sendTestAlert(draft.slack.webhookUrl.trim());
    setTest({ state: result.ok ? "ok" : "fail", detail: result.detail });
  };

  return (
    <form onSubmit={submit} noValidate>
      <Panel>
        <PanelHeader title="Kanäle" />
        <div className="flex flex-col gap-4 p-5">
          <Channel
            icon={<MessageSquare />}
            title="Slack"
            description="Nachricht über einen Incoming Webhook in einen Kanal."
            enabled={draft.slack.enabled}
            onToggle={(v) => patch("slack", { enabled: v })}
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
              <Field
                label="Webhook-URL"
                htmlFor={`${id}-slack`}
                error={shown.slack}
                hint="In Slack: Apps → Incoming Webhooks → Kanal wählen → URL kopieren"
              >
                <Input
                  id={`${id}-slack`}
                  value={draft.slack.webhookUrl}
                  onChange={(e) => {
                    patch("slack", { webhookUrl: e.target.value });
                    setTest({ state: "idle" });
                  }}
                  placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
                  className="font-mono text-[13px]"
                  aria-invalid={!!shown.slack}
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field label="Kanal (Notiz)" htmlFor={`${id}-channel`} hint="Nur zur Orientierung">
                <div className="relative">
                  <Hash className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
                  <Input
                    id={`${id}-channel`}
                    value={draft.slack.channelHint.replace(/^#/, "")}
                    onChange={(e) => patch("slack", { channelHint: `#${e.target.value.replace(/^#/, "")}` })}
                    className="pl-7"
                    maxLength={80}
                  />
                </div>
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={runTest} disabled={test.state === "sending"}>
                {test.state === "sending" ? <Loader2 className="animate-spin" /> : <Send />}
                Testnachricht senden
              </Button>
              {test.state === "ok" && (
                <span className="inline-flex items-center gap-1 text-xs text-ok-ink" role="status">
                  <CheckCircle2 className="size-3.5" /> In Slack angekommen
                </span>
              )}
              {test.state === "fail" && (
                <span className="inline-flex items-center gap-1 text-xs text-fail-ink" role="alert">
                  <XCircle className="size-3.5" /> {test.detail}
                </span>
              )}
            </div>
          </Channel>

          <Channel
            icon={<Mail />}
            title="E-Mail"
            description="Zusammenfassung an eine oder mehrere Adressen."
            enabled={draft.email.enabled}
            onToggle={(v) => patch("email", { enabled: v })}
          >
            <Field
              label="Empfänger"
              htmlFor={`${id}-mail`}
              error={shown.email}
              hint="Mehrere Adressen mit Komma trennen"
            >
              <Input
                id={`${id}-mail`}
                type="text"
                inputMode="email"
                value={draft.email.recipients}
                onChange={(e) => patch("email", { recipients: e.target.value })}
                placeholder="ops@firma.de, bereitschaft@firma.de"
                aria-invalid={!!shown.email}
                autoComplete="off"
              />
            </Field>
            <p className="mt-3 flex gap-2 rounded-lg bg-sunken px-3 py-2.5 text-xs text-muted">
              <Info className="mt-px size-3.5 shrink-0" />
              In dieser öffentlichen Demo wird keine E-Mail verschickt, damit sie nicht als Versandweg für fremde
              Adressen missbraucht werden kann. Im Kundenprojekt läuft der Versand über einen Maildienst mit eigener
              Domain.
            </p>
          </Channel>
        </div>

        <div className="border-t border-line p-5">
          <h3 className="text-sm font-semibold text-ink">Auslöser</h3>
          <p className="mt-0.5 text-[13px] text-muted">Gilt für alle aktiven Kanäle.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {TRIGGERS.map((t) => {
              const checked = draft.notifyOn[t.id];
              return (
                <label
                  key={t.id}
                  className={cx(
                    "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                    checked ? "border-accent/50 bg-accent-soft/50" : "border-line hover:border-line-strong",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => patch("notifyOn", { [t.id]: e.target.checked })}
                    className="mt-0.5 size-4 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      <StatusDot status={t.id === "down" ? "down" : t.id === "degraded" ? "degraded" : "operational"} />
                      {t.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{t.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-4">
          {dirty && !justSaved && <span className="text-xs text-muted">Ungespeicherte Änderungen</span>}
          {justSaved && (
            <span className="inline-flex items-center gap-1 text-xs text-ok-ink" role="status">
              <Check className="size-3.5" /> Gespeichert
            </span>
          )}
          <Button variant="secondary" disabled={!dirty} onClick={() => setDraft(saved)}>
            Verwerfen
          </Button>
          <Button variant="primary" type="submit" disabled={!dirty}>
            Speichern
          </Button>
        </div>
      </Panel>
    </form>
  );
}
