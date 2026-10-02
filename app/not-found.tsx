import Link from "next/link";
import { PageBody } from "@/components/shell/page-header";

export default function NotFound() {
  return (
    <PageBody>
      <div className="flex flex-col items-start gap-3 py-16">
        <span className="rounded bg-fail-soft px-2 py-1 font-mono text-sm font-semibold text-fail-ink">404</span>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Diese Seite gibt es nicht.</h1>
        <p className="text-sm text-muted">Ironisch für einen Monitor, aber hier hätte er Alarm geschlagen.</p>
        <Link href="/" className="mt-2 text-sm font-medium text-accent hover:text-accent-hover">
          Zur Übersicht
        </Link>
      </div>
    </PageBody>
  );
}
