"use client";

import { Activity, BellRing, LayoutDashboard, Menu, RotateCcw, Send, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { company } from "@/lib/legal";
import { resetDemo, useMonitor } from "@/lib/store";
import { fmtRelative } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { cx } from "../ui/primitives";
import { StatusDot } from "../ui/status";

const NAV = [
  { href: "/", label: "Übersicht", icon: LayoutDashboard },
  { href: "/incidents", label: "Vorfälle", icon: TriangleAlert, badge: true },
  { href: "/simulator", label: "Webhook-Simulator", icon: Send },
  { href: "/alerts", label: "Benachrichtigungen", icon: BellRing },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md">
      <span className="grid size-8 place-items-center rounded-lg bg-accent text-white">
        <Activity className="size-[18px]" strokeWidth={2.4} />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight text-rail-ink">Puls</span>
        <span className="block text-[11px] text-rail-muted">API- &amp; Webhook-Monitor</span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const openIncidents = useMonitor((s) => s.incidents).filter((i) => i.resolvedAt === null).length;

  return (
    <nav aria-label="Hauptnavigation" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cx(
              "group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
              active ? "bg-white/[0.08] text-rail-ink" : "text-rail-muted hover:bg-white/[0.04] hover:text-rail-ink",
            )}
          >
            <Icon className={cx("size-4", active ? "text-accent-ink" : "")} />
            <span className="flex-1">{item.label}</span>
            {"badge" in item && openIncidents > 0 && (
              <span className="rounded-full bg-fail px-1.5 py-px text-[11px] font-semibold text-white tabular">
                {openIncidents}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function MonitorStatus() {
  const now = useNow(1000);
  const running = useMonitor((s) => s.running);
  const lastRunAt = useMonitor((s) => s.lastRunAt);
  const polling = useMonitor((s) => s.polling);
  const lastError = useMonitor((s) => s.lastError);

  return (
    <div className="rounded-lg border border-rail-line p-3 text-xs">
      <div className="flex items-center gap-2 text-rail-ink">
        <StatusDot
          status={lastError ? "down" : polling.enabled ? "operational" : "pending"}
          live={polling.enabled && !lastError}
        />
        <span className="font-medium">
          {lastError
            ? "Prüfdienst gestört"
            : polling.enabled
              ? `Prüft alle ${polling.intervalSec} s`
              : "Automatik pausiert"}
        </span>
      </div>
      <p className="mt-1.5 text-rail-muted tabular">
        {running
          ? "Prüfung läuft …"
          : lastRunAt && now
            ? `Letzte Prüfung ${fmtRelative(lastRunAt, now)}`
            : "Noch keine Prüfung"}
      </p>
    </div>
  );
}

function ResetButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("Alle eigenen Endpunkte, Vorfälle und Einstellungen in diesem Browser löschen?")) resetDemo();
      }}
      className="flex h-8 items-center gap-2 rounded-md px-2 text-xs text-rail-muted transition-colors hover:bg-white/[0.04] hover:text-rail-ink"
    >
      <RotateCcw className="size-3.5" />
      Demo zurücksetzen
    </button>
  );
}

function Credits() {
  return (
    <div className="flex flex-col gap-1.5 border-t border-rail-line px-2 pt-3 text-[11px] text-rail-muted">
      <a href={company.url} className="hover:text-rail-ink">
        Eine Demo von <span className="font-medium text-rail-ink">{company.name}</span>
      </a>
      <div className="flex gap-3">
        <Link href="/impressum" className="hover:text-rail-ink">
          Impressum
        </Link>
        <Link href="/datenschutz" className="hover:text-rail-ink">
          Datenschutz
        </Link>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop rail */}
      <div className="hidden w-64 shrink-0 border-r border-rail-line bg-rail lg:block">
        <aside className="sticky top-0 flex h-dvh flex-col gap-6 px-4 py-5">
          <Brand />
          <NavLinks />
          <div className="mt-auto flex flex-col gap-2">
            <MonitorStatus />
            <ResetButton />
            <Credits />
          </div>
        </aside>
      </div>

      {/* Mobile bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rail-line bg-rail px-4 lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Menü schließen" : "Menü öffnen"}
          className="grid size-9 place-items-center rounded-lg text-rail-ink hover:bg-white/[0.06]"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>
      {open && (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-14 z-30 border-b border-rail-line bg-rail px-4 pt-3 pb-4 shadow-xl lg:hidden"
        >
          <NavLinks onNavigate={() => setOpen(false)} />
          <div className="mt-4 flex flex-col gap-2">
            <MonitorStatus />
            <ResetButton />
            <Credits />
          </div>
        </div>
      )}
    </>
  );
}
