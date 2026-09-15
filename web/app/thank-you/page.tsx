import Link from "next/link";
import { MascotScout } from "@/components/mascot-scout";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Thank you", description: "Your message has been received by Vivadeo." };

export default function ThankYouPage() {
  return (
    <main className="mascot-state-page">
      <MascotScout size="large" motion="look" />
      <h1>Thank you.</h1>
      <p>Your message made it safely into the archive.</p>
      <Link className="button" href="/dashboard/ingest">Return to Vivadeo</Link>
    </main>
  );
}
