import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";

const archiveTeams = ["Studios", "Broadcasters", "Newsrooms", "Film archives", "Sports media", "Universities", "Creative agencies"];

const services = [
  { title: "Search", body: "Ask about footage and get transcript-grounded answers with timestamp citations.", meta: "Cited answers" },
  { title: "Ingest", body: "Upload files or queue URLs, then watch every indexing stage move toward ready.", meta: "Live pipeline" },
  { title: "Clip review", body: "Use cited moments as the starting point for faster editorial review.", meta: "Evidence first" },
  { title: "Workspaces", body: "Keep teams, jobs, libraries, and permissions isolated by organization.", meta: "Role aware" },
  { title: "Automation", body: "Background processing keeps heavier video tasks off the front end.", meta: "Async jobs" },
  { title: "Admin", body: "Invite users, switch workspaces, and review operational settings.", meta: "Controlled ops" },
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
            <Link href="#features" className="nav-link">Services</Link>
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
          <h1>Search less.<br /><span>Find more.</span></h1>
          <p>Search your video archive, review cited moments, and move from question to footage in one place.</p>
          <div className="landing-hero-actions">
            <Link href={signedIn ? "/dashboard" : "/sign-up"}>{signedIn ? "Open console" : "Get started for free"}</Link>
            <Link href="#contact">Talk to sales team</Link>
          </div>
        </div>
        <div className="landing-hero-marquee" aria-label="Built for video teams">
          <p>Built for video teams</p>
          <div className="landing-marquee-track">
            {[0, 1].map((copy) => (
              <div aria-hidden={copy === 1} className="landing-marquee-group" key={copy}>
                {archiveTeams.map((team) => <span key={team}>{team}</span>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="service-band" id="features">
        <div className="section-heading">
          <p className="eyebrow eyebrow-dark">Efficient and integrated video services</p>
          <h2>Everything the archive needs, in one system.</h2>
          <p>Search, ingest, clip, and administer without fragmenting the workflow.</p>
        </div>
        <div className="service-grid">
          {services.map((service) => (
            <article className="service-card" key={service.title}>
              <span>{service.meta}</span>
              <h3>{service.title}</h3>
              <p>{service.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="benefits-band">
        <div className="benefits-visual workflow-preview" aria-label="Indexing workflow preview">
          <div className="workflow-card workflow-card-active">
            <span>01</span>
            <strong>Upload source</strong>
            <p>Drop a video or queue a permitted URL.</p>
          </div>
          <div className="workflow-card">
            <span>02</span>
            <strong>Index transcript</strong>
            <p>Chunks, embeddings, and job status stay visible.</p>
          </div>
          <div className="workflow-card">
            <span>03</span>
            <strong>Ask and cite</strong>
            <p>Answers point back to the exact footage range.</p>
          </div>
          <div className="workflow-rail"><span /></div>
        </div>
        <div className="benefits-copy">
          <p className="eyebrow">Key benefits</p>
          <h2>Search, clip, and manage footage with less friction.</h2>
          <ul>
            <li><strong>Accurate retrieval</strong> Text and image search share one embedding path.</li>
            <li><strong>Faster review</strong> Inline clip preview keeps context on screen.</li>
            <li><strong>Cleaner ops</strong> Workspace controls stay visible and scannable.</li>
          </ul>
        </div>
      </section>

      <section className="pricing-band">
        <div className="section-heading section-heading-dark">
          <p className="eyebrow eyebrow-dark">Tailored plans</p>
          <h2>Pricing for one workspace or many.</h2>
          <p>Pick a shape that fits your team, then scale without changing workflows.</p>
        </div>
        <div className="pricing-grid">
          <article className="pricing-card">
            <h3>Studio</h3>
            <p>For small teams getting started with searchable archives.</p>
            <strong>Launch</strong>
            <span>Simple onboarding and a focused workspace.</span>
            <Link href={signedIn ? "/dashboard" : "/sign-up"} className="button-secondary pricing-cta">Get started</Link>
          </article>
          <article className="pricing-card">
            <h3>Archive</h3>
            <p>For larger teams that need multiple workspaces and tighter controls.</p>
            <strong>Custom</strong>
            <span>Audit, admin, and rollout support.</span>
            <Link href={signedIn ? "/dashboard" : "/sign-up"} className="button-secondary pricing-cta">Talk to sales</Link>
          </article>
        </div>
        <div className="pricing-pro">
          <h3>Professional</h3>
          <p>Designed for flexibility, with advanced tools for custom tailoring.</p>
          <Link href={signedIn ? "/dashboard" : "/sign-in"} className="button pricing-cta">Open console</Link>
        </div>
      </section>

      <section className="integration-band" id="contact">
        <div>
          <h2>Empowering teams with seamless integrations.</h2>
          <p>Vivadeo keeps search, review, and workspace context synchronized.</p>
          <Link href={signedIn ? "/dashboard" : "/sign-up"} className="button-secondary">Work with us</Link>
        </div>
        <div className="integration-orbit">
          <span>API</span>
          <span>Storage</span>
          <span>Review</span>
          <span>Auth</span>
          <span>Jobs</span>
          <span>Media</span>
        </div>
      </section>

      <section className="cta-band">
        <h2>From idea to production in days.</h2>
        <p>Ship searchable video workflows without rebuilding the stack around them.</p>
        <Link href={signedIn ? "/dashboard" : "/sign-up"} className="button">Start free</Link>
      </section>

      <footer className="footer">
        <div>
          <Link href="/" className="brand"><BrandLogo /></Link>
          <p>Video search and clip review for workspace teams.</p>
        </div>
        <div>
          <h4>Company</h4>
          <a href="#about">About us</a>
          <a href="#about">Customers</a>
          <a href="#features">Newsroom</a>
        </div>
        <div>
          <h4>Products</h4>
          <a href="/dashboard">Search</a>
          <a href="/dashboard">Clips</a>
          <a href="/dashboard">Admin</a>
        </div>
        <div>
          <h4>Get in touch</h4>
          <a href="mailto:hello@vivadeo.example">hello@vivadeo.example</a>
        </div>
      </footer>
    </div>
  );
}
