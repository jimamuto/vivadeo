import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";
import { LandingFaq } from "@/components/landing-faq";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import ScrollBaseAnimation from "@/components/ui/scroll-text-marque";
import TextAnimation from "@/components/ui/scroll-text";
import type { Metadata } from "next";
import { contactEmail, contactLocation } from "@/lib/site";
import { CookieSettingsButton } from "@/components/cookie-consent";
import { VIVADEO_PLANS } from "@/lib/plans";

export const metadata: Metadata = { title: "Video evidence search", description: "Find exact moments across your video archive, verify their sources, and keep your team moving." };

const archiveTeams = "Studios   •   Broadcasters   •   Newsrooms   •   Film archives   •   Sports media   •   Universities   •   Creative agencies   •";

const connections = [
  { icon: "/images/connections/google-drive.svg", name: "Google Drive" },
  { icon: "/images/connections/dropbox.svg", name: "Dropbox" },
  { icon: "/images/connections/one-drive.svg", name: "OneDrive" },
  { icon: "/images/connections/slack.svg", name: "Slack" },
  { icon: "/images/connections/notion.svg", name: "Notion" },
  { icon: "/images/connections/premiere-pro.svg", name: "Adobe Premiere Pro" },
];

const solutions = [
  { icon: "⌕", title: "Find the right moment", body: "Ask a question and move directly to the relevant part of your archive." },
  { icon: "✓", title: "Keep evidence attached", body: "Review source context and timestamps before footage moves forward." },
  { icon: "◎", title: "Work from one shared view", body: "Give every teammate the same place to search, review, and organize." },
];

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const signedIn = Boolean(session?.user);

  return (
    <div className="landing-page">
      <header className="topbar">
        <div className="topbar-shell">
          <Link href="/" className="brand"><BrandLogo /></Link>
          <div className="nav-center">
            <Link href="#about" className="nav-link">About</Link>
            <Link href="#about" className="nav-link">Services</Link>
            <Link href="#pricing" className="nav-link">Pricing</Link>
          </div>
          <div className="nav-spacer" />
          <div className="nav-actions">
            {signedIn ? (
              <Link href="/dashboard" className="button-secondary">Console</Link>
            ) : (
              <>
                <Link href="/sign-in" className="button-secondary">Sign in</Link>
                <Link href="#contact" className="button">Contact</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="landing-hero fade-in">
        <div className="landing-hero-copy">
          <h1>Search less,<br /><span>find more.</span></h1>
          <p>Search your video archive, review cited moments, and move from question to footage in one place.</p>
          <div className="landing-hero-actions">
            <Link href={signedIn ? "/dashboard" : "/sign-up"}>{signedIn ? "Open console" : "Get started for free"}</Link>
            <Link href="#contact">Talk to sales team</Link>
          </div>
        </div>
        <div className="landing-hero-marquee" aria-label="Built for video teams">
          <p>Built for video teams</p>
          <ScrollBaseAnimation baseVelocity={0.5} scrollDependent clasname="landing-marquee-text">
            {archiveTeams}
          </ScrollBaseAnimation>
        </div>
      </section>

      <section className="landing-solutions" id="about">
        <ScrollAnimation className="landing-solutions-heading">
          <p>Solutions</p>
          <TextAnimation as="h2" text={"Solve your team's\nbiggest footage challenges."} lineAnime />
        </ScrollAnimation>
        <div className="landing-solution-points">
          {solutions.map((solution) => (
            <ScrollAnimation as="article" className="landing-solution-point" key={solution.title}>
              <span aria-hidden="true">{solution.icon}</span>
              <div>
                <h3>{solution.title}</h3>
                <p>{solution.body}</p>
              </div>
            </ScrollAnimation>
          ))}
        </div>
        <ScrollAnimation className="landing-product-stage">
          <Image src="/images/landing/dashboard-overview.webp" alt="Vivadeo archive search workspace" width={1600} height={1000} sizes="(max-width: 860px) calc(100vw - 48px), 1240px" />
          <span className="landing-product-time" aria-hidden="true">00:42</span>
          <span className="landing-product-check" aria-hidden="true">✓</span>
        </ScrollAnimation>
      </section>

      <section className="landing-connections">
        <ScrollAnimation className="landing-section-heading">
          <p>Connections</p>
          <TextAnimation as="h2" text="Bring your video workflow together." direction="right" />
          <span>Connect the tools around your archive without fragmenting search and review.</span>
        </ScrollAnimation>
        <div className="landing-connection-map">
          <div className="landing-connection-core"><Image src="/images/connections/vivadeo-mark.webp" alt="Vivadeo" width={256} height={256} /></div>
          {connections.map((connection) => (
            <ScrollAnimation as="article" className="landing-connection" key={connection.name}>
              <span><img src={connection.icon} alt={`${connection.name} logo`} /></span>
              <h3>{connection.name}</h3>
            </ScrollAnimation>
          ))}
        </div>
      </section>

      <section className="landing-pricing" id="pricing">
        <ScrollAnimation className="landing-pricing-heading">
          <p>Pricing</p>
          <TextAnimation as="h2" text="Simple plans for every archive." />
        </ScrollAnimation>
        <div className="landing-pricing-grid">
          {VIVADEO_PLANS.map((plan) => (
            <ScrollAnimation as="article" className={`landing-plan${plan.featured ? " landing-plan-featured" : ""}`} key={plan.name}>
              <div>
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
              </div>
              <div className="landing-plan-price">
                <strong>{plan.priceLabel}</strong>
                <span>{plan.billingNote}</span>
              </div>
              {plan.id === "free" ? (
                <Link href={signedIn ? "/dashboard" : "/sign-up"}>{signedIn ? "Open Vivadeo" : "Start free"}</Link>
              ) : plan.id === "enterprise" ? (
                <Link href="#contact">Contact us</Link>
              ) : (
                <span className="landing-plan-unavailable">Billing coming soon</span>
              )}
              <ul>
                {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </ScrollAnimation>
          ))}
        </div>
      </section>

      <LandingFaq />

      <footer className="landing-footer" id="contact">
        <ScrollAnimation className="landing-footer-cta">
          <div>
            <TextAnimation as="h2" text={"Your archive already\nhas the answer."} lineAnime />
            <p>Find the exact moment, verify the source, and keep your team moving.</p>
          </div>
          <Link href={signedIn ? "/dashboard" : "/sign-up"}>
            {signedIn ? "Open console" : "Start searching"}
          </Link>
        </ScrollAnimation>

        <ScrollAnimation className="landing-footer-main">
          <div className="landing-footer-intro">
            <Link href="/" className="landing-footer-brand"><BrandLogo /></Link>
            <p>Video search and review for workspace teams.</p>
          </div>
          <nav aria-label="Product">
            <h3>Product</h3>
            <Link href="/search">Search</Link>
            <Link href="/dashboard/library">Library</Link>
            <Link href="/jobs">Jobs</Link>
          </nav>
          <nav aria-label="Explore">
            <h3>Explore</h3>
            <Link href="#about">About</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href={signedIn ? "/dashboard" : "/sign-up"}>Get started</Link>
            <Link href={"/privacy" as any}>Privacy</Link>
            <Link href={"/terms" as any}>Terms</Link>
            <CookieSettingsButton />
          </nav>
          <address><h3>Contact</h3><a href={`mailto:${contactEmail}`}>{contactEmail}</a><span>{contactLocation}</span></address>
        </ScrollAnimation>
        <ScrollAnimation className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} Vivadeo</span>
          <span>Find more in every frame.</span>
        </ScrollAnimation>
      </footer>
      {!signedIn ? <div className="landing-mobile-cta"><Link href="/sign-up">Get started for free</Link></div> : null}
    </div>
  );
}
