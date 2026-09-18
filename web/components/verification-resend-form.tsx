'use client';

import { useEffect, useState } from 'react';
import { SubmitButton } from '@/components/submit-button';

const RESEND_COOLDOWN_SECONDS = 60;

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

export function VerificationResendForm({ email, cooldown = false }: { email: string; cooldown?: boolean }) {
  const [secondsRemaining, setSecondsRemaining] = useState(cooldown ? RESEND_COOLDOWN_SECONDS : 0);

  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsRemaining]);

  if (secondsRemaining > 0) {
    return (
      <p className="verification-resend-cooldown" aria-live="polite">
        You can request a new code in {formatCountdown(secondsRemaining)}.
      </p>
    );
  }

  return (
    <form className="verify-resend-form" method="post" action="/api/auth/verify-email">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="intent" value="resend" />
      <SubmitButton className="button-secondary" pendingLabel="Sending...">Send a new code</SubmitButton>
    </form>
  );
}
