import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * The checker fetches URLs on behalf of anonymous visitors, so it must never
 * become a proxy into private networks (SSRF). Only public http(s) targets and
 * this app's own mock endpoints are allowed.
 */

const SELF_PREFIXES = ["/api/mock/"];

function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

const V4_BLOCKED: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function isBlockedV4(ip: string) {
  const value = ipv4ToInt(ip);
  return V4_BLOCKED.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
}

function isBlockedV6(ip: string) {
  const lower = ip.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedV4(mapped[1]);
  if (lower === "::" || lower === "::1") return true;
  const first = parseInt(lower.split(":")[0] || "0", 16);
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
  if ((first & 0xff00) === 0xff00) return true; // multicast
  if (lower.startsWith("64:ff9b:") || lower.startsWith("2001:db8:")) return true;
  return false;
}

export function isBlockedAddress(ip: string) {
  const family = isIP(ip);
  if (family === 4) return isBlockedV4(ip);
  if (family === 6) return isBlockedV6(ip);
  return true;
}

export type ResolvedTarget = { ok: true; url: URL; internal: boolean } | { ok: false; error: string };

export async function resolveTarget(raw: string, origin: string): Promise<ResolvedTarget> {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Keine URL angegeben." };
  if (value.length > 2048) return { ok: false, error: "URL ist zu lang." };

  if (value.startsWith("/")) {
    if (!SELF_PREFIXES.some((p) => value.startsWith(p))) {
      return { ok: false, error: "Relative Pfade sind nur für die eingebauten Mock-Endpunkte erlaubt." };
    }
    return { ok: true, url: new URL(value, origin), internal: true };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: "Keine gültige URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Nur http und https werden unterstützt." };
  }
  if (url.username || url.password) {
    return { ok: false, error: "Zugangsdaten in der URL werden nicht akzeptiert." };
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    return { ok: false, error: "Interne Adressen werden aus Sicherheitsgründen nicht geprüft." };
  }

  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);
    } catch {
      return { ok: false, error: `DNS-Auflösung für ${host} fehlgeschlagen.` };
    }
  }
  if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
    return { ok: false, error: "Interne Adressen werden aus Sicherheitsgründen nicht geprüft." };
  }
  return { ok: true, url, internal: false };
}
