import { fmtMs, fmtTime } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import type { CheckResult } from "@/lib/types";
import { cx } from "../ui/primitives";

/** Status-page style strip: one bar per check, newest on the right, empty slots padded left. */
export function HistoryBars({ results, slots = 30 }: { results: CheckResult[]; slots?: number }) {
  const recent = results.slice(-slots);
  const padding = Array.from({ length: slots - recent.length });
  return (
    <div className="flex h-6 items-stretch gap-[2px]" aria-label={`Letzte ${recent.length} Prüfungen`}>
      {padding.map((_, i) => (
        <span key={`p${i}`} className="w-[3px] rounded-[1px] bg-line" />
      ))}
      {recent.map((r) => (
        <span
          key={r.at}
          title={`${fmtTime(r.at)} · ${STATUS_META[r.status].label} · ${r.statusCode ?? "kein Status"} · ${fmtMs(r.latencyMs)}`}
          className={cx("w-[3px] rounded-[1px]", STATUS_META[r.status].bar)}
        />
      ))}
    </div>
  );
}
