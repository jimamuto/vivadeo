"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { PasswordStrengthInput } from "@/components/password-strength-input";
import { SubmitButton } from "@/components/submit-button";

export function SignupForm({ initialError }: { initialError?: string }) {
  const error = initialError ? "Could not create your account. Please try again." : "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const passwordsDoNotMatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <form className="form" method="post" action="/api/auth/sign-up" onSubmit={(event) => {
      const formData = new FormData(event.currentTarget);
      const password = String(formData.get("password") || "");
      if (password !== confirmPassword) {
        event.preventDefault();
      }
    }}>
      {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" type="text" autoComplete="name" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <PasswordStrengthInput onPasswordChange={setPassword} />
      <div className="field confirm-password-field">
        <label htmlFor="confirm-password">Confirm password</label>
        <div className="password-input-wrap">
          <input
            id="confirm-password"
            name="confirmPassword"
            type={confirmVisible ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
            aria-invalid={passwordsDoNotMatch}
            aria-describedby={passwordsDoNotMatch ? "confirm-password-error" : undefined}
          />
          <button
            className="password-visibility-toggle"
            type="button"
            aria-label={confirmVisible ? "Hide confirmed password" : "Show confirmed password"}
            aria-pressed={confirmVisible}
            onClick={() => setConfirmVisible((visible) => !visible)}
          >
            {confirmVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
        {passwordsDoNotMatch ? <p className="field-error" id="confirm-password-error" role="alert">Passwords do not match.</p> : null}
      </div>
      <p className="auth-legal-copy">
        By creating an account, you agree to Vivadeo&apos;s{" "}
        <Link href="/terms">Terms and Conditions</Link> and acknowledge our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <SubmitButton pendingLabel="Creating account..." disabled={!confirmPassword || password !== confirmPassword}>Create account</SubmitButton>
    </form>
  );
}
