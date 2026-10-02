import { ImageResponse } from "next/og";

export const alt = "Puls – API- & Webhook-Monitor. Eine Demo von BKS Technologies.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ROWS = [
  { name: "Payments API", status: "Betriebsbereit", color: "#2bc685", latency: "84 ms" },
  { name: "Orders API", status: "Latenz-Warnung", color: "#f1b02e", latency: "1.214 ms" },
  { name: "ERP-Bridge", status: "Ausfall · 500", color: "#f0525f", latency: "231 ms" },
];

/** Preview image for links: brand on the left, a miniature of the status table on the right. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{ width: "100%", height: "100%", display: "flex", background: "#0a101c", padding: 72, color: "#e8ecf3" }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 520 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#2550d9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
            </svg>
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>Puls</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>
            API- & Webhook-Monitor
          </div>
          <div style={{ fontSize: 26, color: "#9aa5b8", lineHeight: 1.35 }}>
            Live-Status, Latenz, Vorfälle und Alarme. Echte Prüfungen, keine Attrappe.
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#9aa5b8" }}>Eine Demo von BKS Technologies</div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 16,
          marginLeft: "auto",
          width: 500,
        }}
      >
        {ROWS.map((r) => (
          <div
            key={r.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "22px 26px",
              borderRadius: 18,
              background: "#111a2a",
              border: "1px solid #1f2a3e",
            }}
          >
            <div style={{ width: 16, height: 16, borderRadius: 8, background: r.color }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 26, fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 20, color: r.color }}>{r.status}</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 24, color: "#9aa5b8" }}>{r.latency}</div>
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
