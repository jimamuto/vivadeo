'use client';

import { useEffect, useState } from 'react';

export function VerificationSentNotice() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  return visible ? <p className="notice notice-good" role="status">Verification code sent.</p> : null;
}
