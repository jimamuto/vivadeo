"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";

export function SigninForm() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form className="form" method="post" action="/api/auth/sign-in">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="password-input-wrap">
          <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required />
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
      <label className="auth-remember-row">
        <input name="rememberMe" type="checkbox" defaultChecked />
        <span>Remember me</span>
      </label>
      <SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton>
    </form>
  );
}
