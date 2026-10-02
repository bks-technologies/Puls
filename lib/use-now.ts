"use client";

import { useSyncExternalStore } from "react";

const subscribers = new Map<number, (onChange: () => void) => () => void>();

function subscribeEvery(intervalMs: number) {
  let subscribe = subscribers.get(intervalMs);
  if (!subscribe) {
    subscribe = (onChange) => {
      const timer = setInterval(onChange, intervalMs);
      return () => clearInterval(timer);
    };
    subscribers.set(intervalMs, subscribe);
  }
  return subscribe;
}

/**
 * Current time, rounded down to the interval so the snapshot stays stable
 * between ticks. Returns 0 on the server to keep hydration deterministic.
 */
export function useNow(intervalMs = 1000) {
  return useSyncExternalStore(
    subscribeEvery(intervalMs),
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => 0,
  );
}
