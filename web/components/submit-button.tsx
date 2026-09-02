"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
};

export function SubmitButton({ children, pendingLabel, className = "button" }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      <span className="submit-button-content" aria-live="polite">
        {pending ? <span className="submit-button-spinner" aria-hidden="true" /> : null}
        {pending ? pendingLabel : children}
      </span>
    </button>
  );
}
