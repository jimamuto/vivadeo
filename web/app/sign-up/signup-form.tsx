"use client";

import { FormEvent, useEffect, useState } from "react";
import { SubmitButton } from "@/components/submit-button";

export function SignupForm({
  initialError,
  verificationEmail = "",
  verificationSent: initialVerificationSent = false,
}: {
  initialError?: string;
  verificationEmail?: string;
  verificationSent?: boolean;
}) {
  const [error, setError] = useState(initialError === "PASSWORD_MISMATCH" ? "Passwords do not match." : "");
  const [verificationSent, setVerificationSent] = useState(initialVerificationSent);
  const [resendSeconds, setResendSeconds] = useState(initialVerificationSent ? 60 : 0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!resendSeconds) return;
    const timer = window.setInterval(() => setResendSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  function validate(event: FormEvent<HTMLFormElement>) {
    if (verificationSent) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (password !== confirmPassword) {
      event.preventDefault();
      setError("Passwords do not match.");
    }
  }

  async function sendCode(button: HTMLButtonElement) {
    const form = button.form;
    if (!form || !form.reportValidity()) return;
    const formData = new FormData(form);
    formData.delete("code");
    setError("");
    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not send the verification code.");
      setVerificationSent(true);
      setResendSeconds(60);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the verification code.");
    }
  }

  return (
    <form className="form" method="post" action={verificationSent ? "/api/auth/verify-email" : "/api/auth/sign-up"} onSubmit={validate}>
      {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
      {verificationSent ? <input type="hidden" name="returnTo" value="signup" /> : null}
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" type="text" autoComplete="name" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" defaultValue={verificationEmail} required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="password-input-wrap">
          <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required />
          <button
            className="password-visibility-toggle"
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2 12s3.5-5 10-5 10 5 10 5-3.5 5-10 5S2 12 2 12Z" />
              <circle cx="12" cy="12" r="2.5" />
              {showPassword ? <path d="m3 3 18 18" /> : null}
            </svg>
          </button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">Confirm password</label>
        <div className="password-input-wrap">
          <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required />
          <button
            className="password-visibility-toggle"
            type="button"
            aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
            aria-pressed={showConfirmPassword}
            onClick={() => setShowConfirmPassword((visible) => !visible)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2 12s3.5-5 10-5 10 5 10 5-3.5 5-10 5S2 12 2 12Z" />
              <circle cx="12" cy="12" r="2.5" />
              {showConfirmPassword ? <path d="m3 3 18 18" /> : null}
            </svg>
          </button>
        </div>
      </div>
      <div className="field auth-code-field">
        <label htmlFor="signup-code">Verification code</label>
        <div className="auth-code-row">
          <input id="signup-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required={verificationSent} />
          {!verificationSent ? (
            <button className="button-secondary" type="button" onClick={(event) => void sendCode(event.currentTarget)}>
              Send code
            </button>
          ) : (
            <span className="auth-code-timer" aria-live="polite">
              {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Code sent"}
            </span>
          )}
        </div>
      </div>
      {verificationSent ? <p className="notice notice-good" role="status">Code sent. Enter it above to verify your email.</p> : null}
      <SubmitButton pendingLabel={verificationSent ? "Verifying..." : "Creating account..."}>
        {verificationSent ? "Verify email" : "Create account"}
      </SubmitButton>
    </form>
  );
}
