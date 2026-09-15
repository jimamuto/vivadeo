import Link from "next/link";
import { MascotScout } from "@/components/mascot-scout";

export default function NotFound() {
  return (
    <main className="mascot-state-page">
      <MascotScout size="large" motion="look" />
      <p className="mascot-state-kicker">404</p>
      <h1>This frame is missing.</h1>
      <p>Our scout checked the map, but this page is not in the archive.</p>
      <Link className="button" href="/dashboard/ingest">Return to your videos</Link>
    </main>
  );
}
