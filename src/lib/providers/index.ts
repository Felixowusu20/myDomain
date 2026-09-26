import { mockDomainProvider } from "@/lib/providers/mock/domain";
import { mockHostingProvider } from "@/lib/providers/mock/hosting";
import { mockDnsProvider } from "@/lib/providers/mock/dns";
import { mockPaymentProvider } from "@/lib/providers/mock/payment";
import { mockNotificationProvider } from "@/lib/providers/mock/notification";
import { smtpNotificationProvider } from "@/lib/providers/smtp/notification";
import { namecomDomainProvider } from "@/lib/providers/namecom/domain";
import { namecomDnsProvider } from "@/lib/providers/namecom/dns";
import { isNamecomConfigured } from "@/lib/providers/namecom/config";
import { isSmtpConfigured } from "@/lib/env";
import type {
  DnsProvider,
  DomainProvider,
  HostingProvider,
  NotificationProvider,
  PaymentProvider,
} from "@/lib/providers/types";

function driver(name: string) {
  return (process.env[name] ?? "mock").toLowerCase();
}

function usesNamecom(envName: string) {
  const value = driver(envName);
  return value === "namecom" || value === "name.com" || value === "name";
}

export function getDomainProvider(): DomainProvider {
  if (usesNamecom("DOMAIN_PROVIDER") && isNamecomConfigured()) {
    return namecomDomainProvider;
  }
  switch (driver("DOMAIN_PROVIDER")) {
    case "mock":
    default:
      return mockDomainProvider;
  }
}

export function getHostingProvider(): HostingProvider {
  switch (driver("HOSTING_PROVIDER")) {
    case "mock":
    default:
      return mockHostingProvider;
  }
}

export function getDnsProvider(): DnsProvider {
  if (usesNamecom("DNS_PROVIDER") && isNamecomConfigured()) {
    return namecomDnsProvider;
  }
  if (usesNamecom("DOMAIN_PROVIDER") && isNamecomConfigured()) {
    return namecomDnsProvider;
  }
  switch (driver("DNS_PROVIDER")) {
    case "mock":
    default:
      return mockDnsProvider;
  }
}

export function getPaymentProvider(): PaymentProvider {
  switch (driver("PAYMENT_PROVIDER")) {
    case "mock":
    default:
      return mockPaymentProvider;
  }
}

export function getNotificationProvider(): NotificationProvider {
  if (isSmtpConfigured()) return smtpNotificationProvider;
  switch (driver("NOTIFICATION_PROVIDER")) {
    case "smtp":
      return smtpNotificationProvider;
    case "mock":
    default:
      return mockNotificationProvider;
  }
}
