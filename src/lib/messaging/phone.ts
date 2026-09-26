import { MessagingError } from "@/lib/messaging/errors";

const E164 = /^\+[1-9]\d{7,14}$/;

export function normalizePhone(input: string) {
  let value = input.trim().replace(/[\s().-]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (!E164.test(value)) {
    throw new MessagingError("Enter a phone number in international format, like +233XXXXXXXXX.");
  }
  return value;
}

export function maskPhone(e164: string) {
  if (e164.length < 6) return "+***";
  return `${e164.slice(0, 4)}******${e164.slice(-2)}`;
}

/** Coarse calling-code hint for future routing. This is not a carrier lookup. */
export function callingCountry(e164: string) {
  if (e164.startsWith("+233")) return "GH";
  if (e164.startsWith("+234")) return "NG";
  if (e164.startsWith("+44")) return "GB";
  if (e164.startsWith("+1")) return "NANP";
  return "UN";
}
