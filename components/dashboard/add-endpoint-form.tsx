"use client";

import { Plus, X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { mockPath, SCENARIOS, type ScenarioId } from "@/lib/scenarios";
import { addEndpoint } from "@/lib/store";
import type { HttpMethod } from "@/lib/types";
import { Button, Field, Input, Panel, PanelHeader, Select } from "../ui/primitives";

interface Draft {
  name: string;
  url: string;
  method: HttpMethod;
  warnMs: string;
  timeoutMs: string;
}

const EMPTY: Draft = { name: "", url: "", method: "GET", warnMs: "800", timeoutMs: "5000" };

function validate(d: Draft) {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!d.name.trim()) errors.name = "Bitte einen Namen vergeben.";
  const url = d.url.trim();
  if (!url) errors.url = "Bitte eine URL angeben.";
  else if (url.startsWith("/")) {
    if (!url.startsWith("/api/mock/")) errors.url = "Relative Pfade nur für eingebaute Mocks (/api/mock/…).";
  } else {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) errors.url = "Nur http:// oder https://.";
    } catch {
      errors.url = "Keine gültige URL. Beispiel: https://api.example.com/health";
    }
  }
  const warn = Number(d.warnMs);
  const timeout = Number(d.timeoutMs);
  if (!Number.isFinite(warn) || warn < 50 || warn > 9000) errors.warnMs = "Zwischen 50 und 9.000 ms.";
  if (!Number.isFinite(timeout) || timeout < 500 || timeout > 10000) errors.timeoutMs = "Zwischen 500 und 10.000 ms.";
  else if (!errors.warnMs && warn >= timeout) errors.warnMs = "Muss unter dem Timeout liegen.";
  return errors;
}

export function AddEndpointForm({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const id = useId();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [touched, setTouched] = useState(false);
  const errors = validate(draft);
  const shown = touched ? errors : {};

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const applyScenario = (scenario: ScenarioId) =>
    update({ url: mockPath(scenario), name: draft.name || `Mock: ${SCENARIOS[scenario].label}` });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length > 0) return;
    const endpoint = addEndpoint({
      name: draft.name.trim(),
      url: draft.url.trim(),
      method: draft.method,
      warnMs: Number(draft.warnMs),
      timeoutMs: Number(draft.timeoutMs),
    });
    onAdded(endpoint.id);
    setDraft(EMPTY);
    setTouched(false);
    onClose();
  };

  return (
    <Panel>
      <PanelHeader
        title="Endpunkt hinzufügen"
        description="Öffentliche URLs werden echt vom Server geprüft. Interne Adressen sind aus Sicherheitsgründen gesperrt."
        actions={
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Formular schließen">
            <X />
          </Button>
        }
      />
      <form onSubmit={submit} noValidate className="grid gap-4 p-5 md:grid-cols-12">
        <Field label="Name" htmlFor={`${id}-name`} error={shown.name} className="md:col-span-4">
          <Input
            id={`${id}-name`}
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="z. B. Checkout API"
            aria-invalid={!!shown.name}
            autoComplete="off"
          />
        </Field>
        <Field
          label="URL"
          htmlFor={`${id}-url`}
          error={shown.url}
          hint="Health-Check oder beliebige GET-Route"
          className="md:col-span-6"
        >
          <Input
            id={`${id}-url`}
            value={draft.url}
            onChange={(e) => update({ url: e.target.value })}
            placeholder="https://api.example.com/health"
            className="font-mono text-[13px]"
            aria-invalid={!!shown.url}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field label="Methode" htmlFor={`${id}-method`} className="md:col-span-2">
          <Select
            id={`${id}-method`}
            value={draft.method}
            onChange={(e) => update({ method: e.target.value as HttpMethod })}
          >
            <option>GET</option>
            <option>HEAD</option>
            <option>POST</option>
          </Select>
        </Field>

        <div className="md:col-span-12">
          <div className="mb-1.5 text-[13px] font-medium text-ink">Oder einen eingebauten Mock verwenden</div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SCENARIOS) as ScenarioId[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => applyScenario(s)}
                className="rounded-full border border-line-strong bg-surface px-3 py-1 text-xs text-ink transition-colors hover:border-accent hover:text-accent"
              >
                {SCENARIOS[s].label}
                <span className="ml-1.5 text-muted">{SCENARIOS[s].hint}</span>
              </button>
            ))}
          </div>
        </div>

        <Field
          label="Warnschwelle (ms)"
          htmlFor={`${id}-warn`}
          error={shown.warnMs}
          hint="Darüber: gelb"
          className="md:col-span-3"
        >
          <Input
            id={`${id}-warn`}
            type="number"
            inputMode="numeric"
            value={draft.warnMs}
            onChange={(e) => update({ warnMs: e.target.value })}
            aria-invalid={!!shown.warnMs}
            className="tabular"
          />
        </Field>
        <Field
          label="Timeout (ms)"
          htmlFor={`${id}-timeout`}
          error={shown.timeoutMs}
          hint="Danach: rot"
          className="md:col-span-3"
        >
          <Input
            id={`${id}-timeout`}
            type="number"
            inputMode="numeric"
            value={draft.timeoutMs}
            onChange={(e) => update({ timeoutMs: e.target.value })}
            aria-invalid={!!shown.timeoutMs}
            className="tabular"
          />
        </Field>
        <div className="flex items-end justify-end gap-2 md:col-span-6">
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" type="submit">
            <Plus />
            Hinzufügen und prüfen
          </Button>
        </div>
      </form>
    </Panel>
  );
}
