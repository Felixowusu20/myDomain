"use client";

import { ClipboardEvent, KeyboardEvent, useRef } from "react";

const LENGTH = 6;

export function OtpBoxes({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, index) => value[index] ?? "");

  function focusAt(index: number) {
    refs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();
  }

  function write(next: string, startIndex = 0) {
    const cleaned = next.replace(/\D/g, "").slice(0, LENGTH - startIndex);
    const chars = digits.slice();
    for (let i = 0; i < cleaned.length; i += 1) {
      chars[startIndex + i] = cleaned[i];
    }
    const joined = chars.join("").slice(0, LENGTH);
    onChange(joined);
    focusAt(startIndex + cleaned.length);
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        const chars = digits.slice();
        chars[index] = "";
        onChange(chars.join(""));
        return;
      }
      if (index > 0) {
        const chars = digits.slice();
        chars[index - 1] = "";
        onChange(chars.join(""));
        focusAt(index - 1);
      }
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAt(index - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAt(index + 1);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    write(event.clipboardData.getData("text"));
  }

  return (
    <div className="otp-boxes" role="group" aria-label="6 digit verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          className="otp-box"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          onChange={(event) => write(event.target.value, index)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={onPaste}
          onFocus={(event) => event.currentTarget.select()}
        />
      ))}
    </div>
  );
}
