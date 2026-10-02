const time = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const dateTime = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const integer = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export const fmtTime = (ms: number) => time.format(ms);
export const fmtDateTime = (ms: number) => dateTime.format(ms);
export const fmtMs = (ms: number | null | undefined) => (ms == null ? "–" : `${integer.format(ms)} ms`);
export const fmtPercent = (value: number | null) => (value == null ? "–" : `${percent.format(value)} %`);

export function fmtRelative(ms: number, now: number) {
  const diff = Math.max(0, Math.round((now - ms) / 1000));
  if (diff < 5) return "gerade eben";
  if (diff < 60) return `vor ${diff} s`;
  const min = Math.round(diff / 60);
  if (min < 60) return `vor ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} h`;
  return fmtDateTime(ms);
}

export function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60} s`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

/** Pretty-prints JSON bodies, leaves everything else untouched. */
export function prettyBody(body: string | null) {
  if (!body) return "";
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function displayUrl(url: string) {
  return url.startsWith("/") ? url : url.replace(/^https?:\/\//, "");
}
