import { createFileRoute, useLocation } from "@tanstack/react-router";
import { getRequestSession } from "~/lib/server-functions";
import { Link } from "~/components/link";
import { SignupForm } from "~/components/signup-form";

function SignUpPage() {
  const session = Route.useLoaderData();
  const params = { error: new URLSearchParams(useLocation().searchStr).get("error") || undefined };

  return (
    <div className="shell" style={{ padding: "28px 0 48px" }}>
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Vivadeo
        </div>
        <Link to="/" className="button-secondary">Back to landing</Link>
      </div>

      <div className="fade-in">
        <section className="card workspace-create-card">
          <h1>Create a workspace</h1>
          <p className="muted">Start a new tenant, invite your team, and keep content isolated from day one.</p>
          <SignupForm initialError={params.error} />
        </section>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/sign-up")({ loader: () => getRequestSession(), component: SignUpPage as any });
