import { describe, expect, it } from "vitest";
import { isBlockedAddress, resolveTarget } from "@/lib/server/guard";

const ORIGIN = "https://monitor.example";

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.178.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "::",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
  ])("blocks %s", (ip) => expect(isBlockedAddress(ip)).toBe(true));

  it.each(["8.8.8.8", "140.82.121.6", "172.32.0.1", "2606:4700:4700::1111"])("allows %s", (ip) =>
    expect(isBlockedAddress(ip)).toBe(false),
  );
});

describe("resolveTarget", () => {
  it("accepts own mock routes as internal", async () => {
    const r = await resolveTarget("/api/mock/healthy", ORIGIN);
    expect(r).toMatchObject({ ok: true, internal: true });
    if (r.ok) expect(r.url.href).toBe("https://monitor.example/api/mock/healthy");
  });

  it("rejects other relative paths", async () => {
    expect((await resolveTarget("/api/check", ORIGIN)).ok).toBe(false);
    expect((await resolveTarget("/api/alerts/slack", ORIGIN)).ok).toBe(false);
  });

  it.each([
    "http://localhost:3000",
    "http://127.0.0.1/admin",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data",
    "http://10.0.0.5:8080",
    "http://printer.local",
    "file:///etc/passwd",
    "ftp://example.com",
    "https://user:pw@example.com",
    "kein url",
  ])("rejects %s", async (url) => {
    expect((await resolveTarget(url, ORIGIN)).ok).toBe(false);
  });

  it("accepts public IP literals", async () => {
    expect(await resolveTarget("https://1.1.1.1/", ORIGIN)).toMatchObject({ ok: true, internal: false });
  });
});
