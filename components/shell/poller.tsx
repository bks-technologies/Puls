"use client";

import { useEffect } from "react";
import { getState, hydrate, runChecks, useMonitor } from "@/lib/store";

/** Loads saved state once and runs checks on the configured interval while the tab is visible. */
export function Poller() {
  const ready = useMonitor((s) => s.ready);
  const enabled = useMonitor((s) => s.polling.enabled);
  const intervalSec = useMonitor((s) => s.polling.intervalSec);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const stale = (getState().lastRunAt ?? 0) < Date.now() - 5000;
    if (stale) void runChecks();
  }, [ready]);

  useEffect(() => {
    if (!ready || !enabled) return;
    const tick = () => {
      if (document.visibilityState === "visible") void runChecks();
    };
    const timer = setInterval(tick, intervalSec * 1000);
    return () => clearInterval(timer);
  }, [ready, enabled, intervalSec]);

  return null;
}
