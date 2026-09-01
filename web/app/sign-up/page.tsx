import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignupForm } from "./signup-form";
import { BrandLogo } from "@/components/brand-logo";
import { AuthSocialOptions } from "@/components/auth-social-options";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <div className="auth-minimal-page">
      <Link href="/" className="auth-minimal-logo"><BrandLogo /></Link>
      <main className="auth-minimal-main">
        <section className="auth-minimal-card auth-minimal-card-signup fade-in">
          <h1>Create account</h1>
          <p className="muted">Set up your private video archive.</p>
          <SignupForm initialError={params.error} />
          <AuthSocialOptions />
          <div className="auth-minimal-links auth-minimal-links-centered">
            <span className="muted">Already have an account?</span>
            <Link href="/sign-in">Sign in</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
