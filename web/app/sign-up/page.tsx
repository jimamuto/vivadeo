import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/dashboard");
  const params = await searchParams;

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
          <SignupForm initialError={params.error} />
        </section>
      </div>
    </div>
  );
}
