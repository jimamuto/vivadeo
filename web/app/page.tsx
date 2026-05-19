import Link from "next/link";

const features = [
  {
    title: "Workspace isolation by default",
    body: "Every video, job, clip, and setting belongs to an organization. The app keeps a clean tenant boundary from the dashboard to the backend proxy."
  },
  {
    title: "Search that stays in sync",
    body: "Typed client calls the FastAPI contract directly through a server-side proxy, so UI behavior tracks the backend schema instead of drifting."
  },
  {
    title: "Operator-grade flows",
    body: "Upload, monitor jobs, review clips, switch workspaces, and manage account settings from one browser-first surface."
  }
];

export default function HomePage() {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Vivadeo
        </div>
        <nav className="nav">
          <Link href="#features">Features</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="/sign-in" className="button-secondary">Sign in</Link>
          <Link href="/sign-up" className="button">Start free</Link>
        </nav>
      </header>

      <section className="hero fade-in">
        <div>
          <div className="eyebrow">Browser-first video intelligence</div>
          <h1>Search footage, create clips, and keep teams aligned.</h1>
          <p>
            Vivadeo wraps the existing FastAPI, Celery, Postgres, and MinIO stack in a production web app with team workspaces,
            auth, and an operator-friendly dashboard.
          </p>
          <div className="hero-actions">
            <Link href="/sign-up" className="button">Create workspace</Link>
            <Link href="/dashboard" className="button-secondary">Open dashboard</Link>
          </div>
        </div>

        <div className="panel dashboard-card">
          <div className="tabs" style={{ marginBottom: 18 }}>
            <span className="pill">Workspace: Northwind</span>
            <span className="pill">Uploads: 18</span>
            <span className="pill">Jobs: 4 running</span>
          </div>
          <div className="metric-grid">
            <div className="metric">
              <strong>94%</strong>
              clip completion
            </div>
            <div className="metric">
              <strong>1.2s</strong>
              median search response
            </div>
            <div className="metric">
              <strong>28</strong>
              indexed hours
            </div>
            <div className="metric">
              <strong>12</strong>
              active users
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <h2>Built for public SaaS, not a local-only demo</h2>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section split" id="pricing">
        <article className="card">
          <h3>Starter</h3>
          <p className="muted">For small teams getting started with searchable archives.</p>
          <p><strong>$29</strong> / workspace / month</p>
        </article>
        <article className="card">
          <h3>Scale</h3>
          <p className="muted">For larger teams that need multiple workspaces and tighter controls.</p>
          <p><strong>Custom</strong> pricing with audit and admin controls.</p>
        </article>
      </section>
    </div>
  );
}
