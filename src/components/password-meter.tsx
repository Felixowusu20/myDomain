"use client";

import { matchProgress } from "@/lib/password-strength";

export function PasswordMeter({
  password,
  confirm = "",
}: {
  password: string;
  confirm?: string;
}) {
  if (!password) return null;
  const match = matchProgress(password, confirm);

  return (
    <div className="password-meter">
      <div
        className="password-meter-track"
        role="progressbar"
        aria-label="Password match"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={match.percent}
        aria-valuetext={match.label}
      >
        <div
          className={`password-meter-fill ${match.matched ? "is-strong" : "is-fair"}`}
          style={{ width: `${match.percent}%` }}
        />
      </div>
    </div>
  );
}
