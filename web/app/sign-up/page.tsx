import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignupForm } from "./signup-form";
import { BrandLogo } from "@/components/brand-logo";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; verify?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <div className="auth-minimal-page">
      <main className="auth-minimal-main">
        <section className="auth-minimal-card auth-minimal-card-signup fade-in">
          <Link href="/" className="auth-minimal-logo"><BrandLogo /></Link>
          <h1>{params.verify === "sent" ? "Verify your email" : "Create your account"}</h1>
          <p className="muted">{params.verify === "sent" ? `Enter the six-digit code sent to ${params.email || "your email address"}.` : "Set up your private video archive."}</p>
          <SignupForm initialError={params.error} verificationEmail={params.email} verificationSent={params.verify === "sent"} />
          <div className="auth-minimal-links auth-minimal-links-centered">
            <span className="muted">Already have an account?</span>
            <Link href="/sign-in">Sign in</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
