import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/dashboard");

  return (
    <div className="shell" style={{ padding: "28px 0 48px" }}>
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Vivadeo
        </div>
        <Link href="/" className="button-secondary">Back to landing</Link>
      </div>

      <div className="fade-in">
        <section className="card workspace-create-card">
          <h1>Create a workspace</h1>
          <p className="muted">Start a new tenant, invite your team, and keep content isolated from day one.</p>
          <form className="form" method="post" action="/api/auth/sign-up">
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input id="name" name="name" type="text" autoComplete="name" required />
            </div>
            <div className="field">
              <label htmlFor="workspace">Workspace name</label>
              <input id="workspace" name="workspace" type="text" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" required />
            </div>
            <button className="button" type="submit">Create workspace</button>
          </form>
        </section>
      </div>
    </div>
  );
}
