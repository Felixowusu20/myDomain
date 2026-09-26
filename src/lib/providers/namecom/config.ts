export type NamecomEnv = "sandbox" | "production";

export type NamecomConfig = {
  username: string;
  token: string;
  env: NamecomEnv;
  baseUrl: string;
  prefix: string;
};

export function namecomEnv(): NamecomEnv {
  const raw = (process.env.NAMECOM_ENV ?? "sandbox").trim().toLowerCase();
  return raw === "production" || raw === "live" || raw === "prod" ? "production" : "sandbox";
}

export function getNamecomConfig(): NamecomConfig | null {
  const env = namecomEnv();
  let username = (process.env.NAMECOM_USERNAME || process.env.DOMAIN_PROVIDER_API_KEY || "").trim();
  const token = (process.env.NAMECOM_API_TOKEN || process.env.DOMAIN_PROVIDER_API_SECRET || "").trim();
  if (!username || !token) return null;
  if (env === "sandbox" && !username.endsWith("-test")) username = `${username}-test`;
  const baseUrl = (
    process.env.NAMECOM_API_BASE_URL ||
    (env === "production" ? "https://api.name.com" : "https://api.dev.name.com")
  )
    .trim()
    .replace(/\/+$/, "");
  const prefix = (process.env.NAMECOM_API_PREFIX || "/core/v1").trim() || "/core/v1";
  return { username, token, env, baseUrl, prefix: prefix.startsWith("/") ? prefix : `/${prefix}` };
}

export function isNamecomConfigured() {
  return Boolean(getNamecomConfig());
}

export function namecomDefaultContacts() {
  const firstName = process.env.NAMECOM_CONTACT_FIRST_NAME?.trim() ?? "";
  const lastName = process.env.NAMECOM_CONTACT_LAST_NAME?.trim() ?? "";
  const email = process.env.NAMECOM_CONTACT_EMAIL?.trim() ?? "";
  const phone = process.env.NAMECOM_CONTACT_PHONE?.trim() ?? "";
  const address1 = process.env.NAMECOM_CONTACT_ADDRESS1?.trim() ?? "";
  const city = process.env.NAMECOM_CONTACT_CITY?.trim() ?? "";
  const zip = process.env.NAMECOM_CONTACT_ZIP?.trim() ?? "";
  const country = process.env.NAMECOM_CONTACT_COUNTRY?.trim() ?? "";
  if (!firstName || !lastName || !email || !phone || !address1 || !city || !country) return null;
  const contact = {
    firstName,
    lastName,
    email,
    phone,
    address1,
    city,
    zip,
    country,
    organization: process.env.NAMECOM_CONTACT_ORG?.trim() || undefined,
    state: process.env.NAMECOM_CONTACT_STATE?.trim() || undefined,
  };
  return {
    registrant: contact,
    admin: contact,
    tech: contact,
    billing: contact,
  };
}
