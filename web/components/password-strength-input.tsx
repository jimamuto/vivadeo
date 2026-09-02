'use client';

import { CheckCheck, Eye, EyeOff, Info, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

const PASSWORD_REQUIREMENTS = [
  { regex: /.{8,}/, text: 'At least 8 characters' },
  { regex: /[0-9]/, text: 'At least 1 number' },
  { regex: /[a-z]/, text: 'At least 1 lowercase letter' },
  { regex: /[A-Z]/, text: 'At least 1 uppercase letter' },
  { regex: /[^A-Za-z0-9]/, text: 'At least 1 special character' },
] as const;

const STRENGTH_LABELS = ['Enter a password', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'] as const;

export function PasswordStrengthInput() {
  const [password, setPassword] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const requirements = useMemo(
    () => PASSWORD_REQUIREMENTS.map((requirement) => ({ ...requirement, met: requirement.regex.test(password) })),
    [password],
  );
  const score = requirements.filter((requirement) => requirement.met).length;

  return (
    <div className="field password-strength-field" data-score={score}>
      <div className="password-label-row">
        <label htmlFor="password">Password</label>
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button className="password-info-trigger" type="button" aria-label="View password requirements">
              <Info aria-hidden="true" />
            </button>
          </HoverCardTrigger>
          <HoverCardContent>
            <strong>Password requirements</strong>
            <ul aria-label="Password requirements">
              {requirements.map((requirement) => (
                <li className={requirement.met ? 'is-met' : ''} key={requirement.text}>
                  {requirement.met ? <CheckCheck aria-hidden="true" /> : <X aria-hidden="true" />}
                  <span>{requirement.text}<span className="sr-only">, {requirement.met ? 'met' : 'not met'}</span></span>
                </li>
              ))}
            </ul>
          </HoverCardContent>
        </HoverCard>
      </div>
      <div className="password-input-wrap">
        <input
          id="password"
          name="password"
          type={isVisible ? 'text' : 'password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={password.length > 0 && score < PASSWORD_REQUIREMENTS.length}
          aria-describedby="password-strength"
        />
        <button
          className="password-visibility-toggle"
          type="button"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((visible) => !visible)}
        >
          {isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      <div className="password-strength-summary" id="password-strength" aria-live="polite">
        <span>{STRENGTH_LABELS[score]}</span>
        <span className="password-strength-meter" aria-hidden="true">
          {PASSWORD_REQUIREMENTS.map((requirement, index) => <i className={index < score ? 'is-active' : ''} key={requirement.text} />)}
        </span>
      </div>
    </div>
  );
}
