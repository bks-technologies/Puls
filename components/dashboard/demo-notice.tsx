"use client";

import { FlaskConical, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

const KEY = "puls:notice-dismissed";
const noop = () => () => {};

function readDismissed() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Tells first-time visitors what is real and what is simulated. Dismissal is remembered per browser. */
export function DemoNotice() {
  const stored = useSyncExternalStore(noop, readDismissed, () => true);
  const [hidden, setHidden] = useState(false);
  if (stored || hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // Without storage the notice simply returns on the next visit.
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-accent/25 bg-accent-soft px-4 py-3.5">
      <FlaskConical className="mt-0.5 size-[18px] shrink-0 text-accent-ink" />
      <div className="min-w-0 flex-1 text-sm text-accent-ink">
        <p className="font-medium">Das ist eine Demo, die echt prüft.</p>
        <p className="mt-0.5 opacity-90">
          Die Beispiel-Endpunkte sind eingebaute Simulationen für jeden Zustand. Eigene öffentliche URLs werden wirklich
          vom Server aufgerufen. Alles, was Sie anlegen, bleibt in Ihrem Browser.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hinweis schließen"
        className="grid size-7 shrink-0 place-items-center rounded-md text-accent-ink hover:bg-accent/10"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
