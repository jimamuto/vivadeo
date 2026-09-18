'use client';

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';

const CODE_LENGTH = 6;

export function VerificationCodeInput() {
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const code = digits.join('');

  const focusInput = (index: number) => {
    inputRefs.current[Math.max(0, Math.min(index, CODE_LENGTH - 1))]?.focus();
  };

  const updateDigits = (value: string, startIndex: number) => {
    const nextDigits = [...digits];
    value.replace(/\D/g, '').slice(0, CODE_LENGTH - startIndex).split('').forEach((digit, offset) => {
      nextDigits[startIndex + offset] = digit;
    });
    setDigits(nextDigits);
    focusInput(Math.min(startIndex + value.replace(/\D/g, '').length, CODE_LENGTH - 1));
  };

  const handleChange = (index: number, value: string) => {
    updateDigits(value, index);
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    event.preventDefault();
    updateDigits(event.clipboardData.getData('text'), index);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      const nextDigits = [...digits];
      nextDigits[index - 1] = '';
      setDigits(nextDigits);
      focusInput(index - 1);
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
    } else if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  return (
    <div className="verification-code-input" role="group" aria-label="Six-digit verification code">
      <input type="hidden" name="code" value={code} required pattern="[0-9]{6}" />
      {digits.map((digit, index) => (
        <input
          key={index}
          id={index === 0 ? 'code' : undefined}
          ref={(element) => { inputRefs.current[index] = element; }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          aria-label={`Verification code digit ${index + 1} of ${CODE_LENGTH}`}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onPaste={(event) => handlePaste(event, index)}
          required
        />
      ))}
    </div>
  );
}
