function intEnv(name: string, fallback: number, min: number, max: number) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

export function otpConfig() {
  return {
    length: intEnv("OTP_LENGTH", 6, 4, 8),
    ttlSeconds: intEnv("OTP_TTL_SECONDS", 300, 30, 3600),
    maxAttempts: intEnv("OTP_MAX_ATTEMPTS", 5, 1, 10),
    resendCooldownMs: intEnv("OTP_RESEND_COOLDOWN_SECONDS", 60, 0, 3600) * 1000,
    maxPerPhone: intEnv("OTP_MAX_PER_PHONE", 5, 1, 100),
    maxPerIp: intEnv("OTP_MAX_PER_IP", 20, 1, 1000),
    maxPerProject: intEnv("OTP_MAX_PER_PROJECT", 100, 1, 10_000),
    windowMs: intEnv("OTP_WINDOW_SECONDS", 600, 60, 86_400) * 1000,
  };
}

export function smsConfig() {
  return {
    maxRetries: intEnv("SMS_MAX_RETRIES", 5, 1, 10),
    maxPerProject: intEnv("SMS_MAX_PER_PROJECT", 60, 1, 10_000),
    windowMs: intEnv("SMS_WINDOW_SECONDS", 60, 10, 3600) * 1000,
    defaultSender: (process.env.SMS_DEFAULT_SENDER ?? "MyDomain").trim() || "MyDomain",
  };
}

export function smsConnectorName() {
  return (process.env.SMS_CONNECTOR ?? "mock").trim().toLowerCase() || "mock";
}
