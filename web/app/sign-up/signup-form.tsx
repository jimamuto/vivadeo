"use client";

import { PasswordStrengthInput } from "@/components/password-strength-input";
import { SubmitButton } from "@/components/submit-button";

export function SignupForm({ initialError }: { initialError?: string }) {
  const error = initialError ? "Could not create your account. Please try again." : "";

  return (
    <form className="form" method="post" action="/api/auth/sign-up">
      {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" type="text" autoComplete="name" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <PasswordStrengthInput />
      <SubmitButton pendingLabel="Creating account...">Create account</SubmitButton>
    </form>
  );
}
