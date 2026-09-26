export type PasswordChecks = {
  length: boolean;
  lower: boolean;
  upper: boolean;
  number: boolean;
  symbol: boolean;
};

export function scorePassword(password: string) {
  const checks: PasswordChecks = {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const percent = Math.round((score / 5) * 100);
  const label =
    password.length === 0
      ? ""
      : score <= 2
        ? "Weak"
        : score === 3
          ? "Fair"
          : score === 4
            ? "Strong"
            : "Very strong";
  const level = score <= 2 ? "weak" : score === 3 ? "fair" : "strong";
  return { checks, score, percent, label, level };
}

export function isPasswordStrongEnough(password: string) {
  return scorePassword(password).score >= 4;
}

export function matchProgress(password: string, confirm: string) {
  if (!confirm) {
    return { percent: 0, matched: false, label: "Type it again to confirm" };
  }
  if (password === confirm) {
    return { percent: 100, matched: true, label: "Passwords match" };
  }
  const shorter = password.length <= confirm.length ? password : confirm;
  const longer = password.length > confirm.length ? password : confirm;
  if (longer.startsWith(shorter)) {
    return {
      percent: Math.round((shorter.length / Math.max(longer.length, 1)) * 100),
      matched: false,
      label: "Keep going, they do not match yet",
    };
  }
  return { percent: 8, matched: false, label: "Passwords do not match" };
}
