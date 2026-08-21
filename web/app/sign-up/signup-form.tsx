"use client";

import { FormEvent, useState } from "react";
import { SubmitButton } from "@/components/submit-button";

export function SignupForm({ initialError }: { initialError?: string }) {
  const [error, setError] = useState(initialError === "PASSWORD_MISMATCH" ? "Passwords do not match." : "");

  function validate(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (password !== confirmPassword) {
      event.preventDefault();
      setError("Passwords do not match.");
    }
  }

  return (
    <form className="form" method="post" action="/api/auth/sign-up" onSubmit={validate}>
      {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
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
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">Confirm password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <SubmitButton pendingLabel="Creating workspace...">Create workspace</SubmitButton>
    </form>
  );
}
