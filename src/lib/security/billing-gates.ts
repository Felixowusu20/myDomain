/**
 * Paid registrar actions (renew, purchase privacy) must not hit name.com
 * while checkout is still on the free mock gateway.
 * Domain registration via cart/checkout stays available for testing.
 */
export function paymentProviderSlug() {
  return (process.env.PAYMENT_PROVIDER ?? "mock").trim().toLowerCase() || "mock";
}

export function isLivePaymentConfigured() {
  const slug = paymentProviderSlug();
  return slug !== "mock" && slug !== "none" && slug !== "off";
}

export function assertBilledRegistrarAction(action: "renewal" | "privacy") {
  if (isLivePaymentConfigured()) return;
  const label = action === "renewal" ? "Domain renewals" : "Paid WHOIS privacy";
  throw new Error(
    `${label} are paused until a live payment provider is connected. New registrations via checkout still work in test mode.`,
  );
}
