"use client";

import Link from "next/link";
import { MascotScout } from "@/components/mascot-scout";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mascot-state-page">
      <MascotScout size="large" motion="look" />
      <h1>We lost the trail.</h1>
      <p>Something interrupted the route. You can try this step again.</p>
      <div className="mascot-state-actions">
        <button type="button" onClick={reset}>Try again</button>
        <Link className="button-secondary" href="/dashboard/ingest">Return to your videos</Link>
      </div>
    </main>
  );
}
