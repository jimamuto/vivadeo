"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
};

export function SubmitButton({ children, pendingLabel, className = "button" }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const [nativePending, setNativePending] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const form = buttonRef.current?.form;
    const handleSubmit = () => setNativePending(true);
    form?.addEventListener("submit", handleSubmit);
    return () => form?.removeEventListener("submit", handleSubmit);
  }, []);

  const isPending = pending || nativePending;
  return (
    <button ref={buttonRef} className={className} type="submit" disabled={isPending} aria-busy={isPending}>
      <span className="submit-button-content" aria-live="polite">
        {isPending ? <span className="submit-button-spinner" aria-hidden="true" /> : null}
        {isPending ? pendingLabel : children}
      </span>
    </button>
  );
}
