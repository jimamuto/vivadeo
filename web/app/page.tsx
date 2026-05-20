import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const services = [
  { title: "Search", body: "Ranked retrieval across footage, text, and image prompts." },
  { title: "Ingest", body: "Upload files or queue URLs into the indexing pipeline." },
  { title: "Clip review", body: "Preview matching moments and trim exact ranges." },
  { title: "Workspaces", body: "Keep teams, jobs, and libraries isolated by org." },
  { title: "Automation", body: "Background processing keeps heavier tasks off the front end." },
  { title: "Admin", body: "Invite users, switch workspaces, and review settings." },
];

function SubjectPlaceholder({ tone = "tan" }: { tone?: "tan" | "oxblood" | "grain" }) {
  return (
    <div className={`subject subject-${tone}`}>
      <div className="subject-cut" />
      <div className="subject-orb" />
      <div className="subject-line subject-line-a" />
      <div className="subject-line subject-line-b" />
    </div>
  );
}

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const signedIn = Boolean(session?.user);
  const profileInitial = (session?.user?.name || session?.user?.email || "V")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  return (
    <div className="shell page">
      <header className="topbar">
        <div className="topbar-shell">
          <Link href="/" className="brand">Vivadeo</Link>
          <div className="nav-center">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="#about" className="nav-link">About</Link>
            <Link href="#features" className="nav-link">Services</Link>
            <Link href="#contact" className="nav-link">Contact</Link>
          </div>
          <div className="nav-spacer" />
          <div className="nav-actions">
            {signedIn ? (
              <>
                <Link href="/dashboard" className="button-secondary">Console</Link>
                <Link href="/settings" className="nav-user" aria-label="Profile">{profileInitial}</Link>
                <form action="/api/auth/sign-out" method="post">
                  <button className="nav-logout" type="submit">Log out</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/sign-in" className="button-secondary">Sign in</Link>
                <Link href="/sign-up" className="button">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="hero hero-home fade-in">
        <div className="hero-copy">
          <h1>Search footage with clarity and keep review in one place.</h1>
          <p className="hero-lead">
            Vivadeo gives teams a clear place to search footage, review clips, and keep archive work organized.
          </p>
          <div className="hero-actions">
            <Link href={signedIn ? "/dashboard" : "/sign-up"} className="button">Open console</Link>
            <Link href="#features" className="button-secondary">See services</Link>
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
              <span>↗</span>
              <h3>{service.title}</h3>
              <p>{service.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="benefits-band">
        <div className="benefits-visual">
          <div className="benefits-stat card">
            <span>Workspace focus</span>
            <strong>Sample archive</strong>
            <p>A tactile block for a real workload summary or key visual.</p>
          </div>
          <div className="benefits-bars">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
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
          <Link href="/" className="brand">Vivadeo</Link>
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
