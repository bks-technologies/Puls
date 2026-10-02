"use client";

import { PageBody } from "@/components/shell/page-header";
import { Button } from "@/components/ui/primitives";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageBody>
      <div className="flex flex-col items-start gap-3 py-16">
        <span className="rounded bg-fail-soft px-2 py-1 font-mono text-sm font-semibold text-fail-ink">500</span>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Hier ist etwas schiefgelaufen.</h1>
        <p className="text-sm text-muted">Laden Sie die Ansicht neu. Ihre Daten im Browser bleiben erhalten.</p>
        <Button variant="primary" className="mt-2" onClick={reset}>
          Neu laden
        </Button>
      </div>
    </PageBody>
  );
}
