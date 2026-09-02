import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";
import ScrollBaseAnimation from "@/components/ui/scroll-text-marque";

const archiveTeams = "Studios   •   Broadcasters   •   Newsrooms   •   Film archives   •   Sports media   •   Universities   •   Creative agencies   •";

const plans = [
  {
    name: "Free",
    description: "For exploring a searchable video archive.",
    price: "Free",
    detail: "Start with the essential search workflow.",
    features: ["Video ingest", "Transcript-grounded search", "Timestamp citations"],
    action: "Get started",
  },
  {
    name: "Pro",
    description: "For teams reviewing footage every day.",
    price: "Pro",
    detail: "Advanced search for collaborative work.",
    features: ["Everything in Free", "Premium answers", "Team workspace controls", "Transcript reindexing"],
    action: "Choose Pro",
    featured: true,
  },
  {
    name: "Enterprise",
    description: "For organizations with broader rollout needs.",
    price: "Custom",
    detail: "A tailored path for larger teams.",
    features: ["Everything in Pro", "Multiple workspace operations", "Administrative controls", "Rollout support"],
    action: "Contact us",
  },
];

const connections = [
  { icon: "/images/connections/google-drive.svg", name: "Google Drive" },
  { icon: "/images/connections/dropbox.svg", name: "Dropbox" },
  { icon: "/images/connections/one-drive.svg", name: "OneDrive" },
  { icon: "/images/connections/slack.svg", name: "Slack" },
  { icon: "/images/connections/notion.svg", name: "Notion" },
  { icon: "/images/connections/premiere-pro.svg", name: "Adobe Premiere Pro" },
];

const teamStories = [
  { image: "/images/testimonials/documentary-editor.webp", name: "Maya Chen", role: "Documentary editor", body: "I can ask about an interview and jump straight to the cited moment. Review starts with the footage instead of another search." },
  { image: "/images/testimonials/archive-manager.webp", name: "Elena Ward", role: "Archive manager", body: "Vivadeo keeps ingest progress, source context, and workspace access together. I always know what is ready and what needs attention." },
  { image: "/images/testimonials/sports-producer.webp", name: "Noah Brooks", role: "Sports producer", body: "Finding the exact play used to mean scrubbing through entire recordings. Now I can return to the relevant time range immediately." },
  { image: "/images/testimonials/newsroom-researcher.webp", name: "Nadia Okafor", role: "Newsroom researcher", body: "The citations make answers useful in an editorial workflow. I can verify the source moment before anything moves forward." },
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
            <Link href="/" className="nav-link">Home</Link>
            <Link href="#about" className="nav-link">About</Link>
            <Link href="#about" className="nav-link">Services</Link>
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
          <ScrollBaseAnimation baseVelocity={3} scrollDependent clasname="landing-marquee-text">
            {archiveTeams}
          </ScrollBaseAnimation>
        </div>
      </section>

      <section className="landing-solutions" id="about">
        <div className="landing-solutions-heading">
          <p>Solutions</p>
          <h2>Solve your team&apos;s<br />biggest footage challenges.</h2>
        </div>
        <div className="landing-solution-points">
          {solutions.map((solution) => (
            <article className="landing-solution-point" key={solution.title}>
              <span aria-hidden="true">{solution.icon}</span>
              <div>
                <h3>{solution.title}</h3>
                <p>{solution.body}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="landing-product-stage">
          <img src="/images/landing/dashboard-overview.webp" alt="Vivadeo archive search workspace" />
          <span className="landing-product-time" aria-hidden="true">00:42</span>
          <span className="landing-product-check" aria-hidden="true">✓</span>
        </div>
      </section>

      <section className="landing-connections">
        <div className="landing-section-heading">
          <p>Connections</p>
          <h2>Bring your video workflow together.</h2>
          <span>Connect the tools around your archive without fragmenting search and review.</span>
        </div>
        <div className="landing-connection-map">
          <div className="landing-connection-core"><img src="/images/connections/vivadeo-mark.webp" alt="Vivadeo" /></div>
          {connections.map((connection) => (
            <article className="landing-connection" key={connection.name}>
              <span><img src={connection.icon} alt={`${connection.name} logo`} /></span>
              <h3>{connection.name}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-stories">
        <div className="landing-section-heading">
          <p>Illustrative team stories</p>
          <h2>Built for people who live in footage.</h2>
        </div>
        <div className="landing-stories-grid">
          {teamStories.map((story) => (
            <article className="landing-story" key={story.role}>
              <p>{story.body}</p>
              <div>
                <img className="landing-story-avatar" src={story.image} alt="" />
                <span className="landing-story-person">
                  <strong>{story.name}</strong>
                  <small>{story.role}</small>
                </span>
              </div>
            </article>
          ))}
          <div className="landing-story-visual">
            <img src="/images/testimonials/featured-portrait.webp" alt="Video editor working in a film archive" />
            <span>Watch the story</span>
          </div>
        </div>
      </section>

      <section className="landing-pricing" id="pricing">
        <div className="landing-pricing-heading">
          <p>Pricing</p>
          <h2>Simple plans for every archive.</h2>
        </div>
        <div className="landing-pricing-grid">
          {plans.map((plan) => (
            <article className={`landing-plan${plan.featured ? " landing-plan-featured" : ""}`} key={plan.name}>
              <div>
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
              </div>
              <div className="landing-plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.detail}</span>
              </div>
              <Link href={plan.name === "Enterprise" ? "#contact" : signedIn ? "/dashboard" : "/sign-up"}>{plan.action}</Link>
              <ul>
                {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer" id="contact">
        <div className="landing-footer-top">
          <div>
            <Link href="/" className="landing-footer-brand"><BrandLogo /></Link>
            <h2>Find more in every frame.</h2>
          </div>
          <nav aria-label="Product">
            <h3>Product</h3>
            <Link href="/search">Search</Link>
            <Link href="/dashboard/library">Library</Link>
            <Link href="/jobs">Jobs</Link>
          </nav>
          <nav aria-label="Company">
            <h3>Company</h3>
            <Link href="#about">About</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href={signedIn ? "/dashboard" : "/sign-up"}>Get started</Link>
          </nav>
        </div>
        <div className="landing-footer-art" aria-hidden="true">
          <span>⌕</span><span>00:42</span><span>▶</span><span>CC</span><span>✓</span>
        </div>
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} Vivadeo</span>
          <span>Video search and review for workspace teams.</span>
        </div>
      </footer>
    </div>
  );
}
