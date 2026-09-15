import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { contactEmail, contactLocation } from "@/lib/site";

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <div className="legal-page"><header><div className="legal-header-inner"><Link href="/"><BrandLogo /></Link><nav><Link href={"/privacy" as any}>Privacy</Link><Link href={"/terms" as any}>Terms</Link></nav></div></header><main><p className="legal-updated">Last updated 14 September 2026</p><h1>{title}</h1><p className="legal-intro">{intro}</p>{children}<section><h2>Contact</h2><p>Vivadeo, {contactLocation}. Questions can be sent to <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p></section></main></div>;
}
