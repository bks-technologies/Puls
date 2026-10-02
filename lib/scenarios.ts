/**
 * Built-in mock endpoints served by this app under /api/mock/<id>.
 * They give the demo realistic traffic without depending on third parties.
 */
export const SCENARIOS = {
  healthy: { label: "Stabil", hint: "200 in 40–180 ms" },
  slow: { label: "Langsam", hint: "200 in 0,9–1,6 s" },
  flaky: { label: "Wackelig", hint: "jede vierte Anfrage 503" },
  error: { label: "Serverfehler", hint: "immer 500 mit Fehler-Body" },
  missing: { label: "Nicht gefunden", hint: "immer 404" },
  timeout: { label: "Hängt", hint: "antwortet erst nach 8 s" },
} as const;

export type ScenarioId = keyof typeof SCENARIOS;

export function isScenario(value: string): value is ScenarioId {
  return Object.hasOwn(SCENARIOS, value);
}

export const mockPath = (id: ScenarioId) => `/api/mock/${id}`;
