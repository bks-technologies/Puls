/** Example webhook payloads for the simulator. Fictional data, example.com domains only. */

const iso = () => new Date().toISOString();

export const PAYLOAD_TEMPLATES = {
  "order.created": () => ({
    id: "evt_1Q8xK2mZ4p",
    type: "order.created",
    created_at: iso(),
    data: {
      order_id: "ORD-2026-10482",
      customer: { id: "cus_7731", email: "einkauf@example.com", company: "Muster GmbH" },
      currency: "EUR",
      total: 1249.9,
      items: [
        { sku: "SRV-ANNUAL", name: "Wartungsvertrag 12 Monate", qty: 1, price: 990 },
        { sku: "ADD-SLA", name: "SLA 4h Reaktionszeit", qty: 1, price: 259.9 },
      ],
    },
  }),
  "invoice.paid": () => ({
    id: "evt_1Q8xL9aB2c",
    type: "invoice.paid",
    created_at: iso(),
    data: {
      invoice_id: "RE-2026-0381",
      amount: 4760,
      currency: "EUR",
      paid_via: "sepa_debit",
      customer_id: "cus_7731",
    },
  }),
  "shipment.delivered": () => ({
    id: "evt_1Q8xM4dE7f",
    type: "shipment.delivered",
    created_at: iso(),
    data: {
      shipment_id: "SHP-55120",
      carrier: "DHL",
      tracking: "00340434161234567890",
      delivered_at: iso(),
      signed_by: "M. Muster",
    },
  }),
  "customer.updated": () => ({
    id: "evt_1Q8xN1gH3i",
    type: "customer.updated",
    created_at: iso(),
    data: { customer_id: "cus_7731", changes: { billing_email: ["alt@example.com", "rechnung@example.com"] } },
  }),
} as const;

export type TemplateId = keyof typeof PAYLOAD_TEMPLATES;

export const SIMULATIONS = {
  accept: { label: "Annehmen", expect: "202 Accepted", tone: "ok" },
  slow: { label: "Langsam annehmen", expect: "202 nach ca. 2 s", tone: "warn" },
  error: { label: "Handler-Fehler", expect: "500 Internal Server Error", tone: "fail" },
  unauthorized: { label: "Signatur ungültig", expect: "401 Unauthorized", tone: "fail" },
  gone: { label: "Kein Abnehmer", expect: "404 Not Found", tone: "fail" },
} as const;

export type SimulationId = keyof typeof SIMULATIONS;

export function templateJson(id: TemplateId) {
  return JSON.stringify(PAYLOAD_TEMPLATES[id](), null, 2);
}

/** Returns a readable JSON error with line and column, or null when valid. */
export function jsonError(text: string): string | null {
  try {
    JSON.parse(text);
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ungültiges JSON";
    const pos = message.match(/position (\d+)/);
    if (pos) {
      const index = Number(pos[1]);
      const before = text.slice(0, index).split("\n");
      return `Ungültiges JSON in Zeile ${before.length}, Spalte ${before.at(-1)!.length + 1}`;
    }
    const lineCol = message.match(/line (\d+) column (\d+)/);
    if (lineCol) return `Ungültiges JSON in Zeile ${lineCol[1]}, Spalte ${lineCol[2]}`;
    return "Ungültiges JSON";
  }
}
