import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  createBackupCodes,
  consumeBackupCode,
  customerTotpUri,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  setupFingerprint,
  timingSafeEqualHex,
  totpQrDataUrl,
  verifyTotpCode,
} from "@/lib/security/totp";

export async function getCustomerTotpStatus(userId: string) {
  const customer = await prisma.customer.findUnique({ where: { userId } });
  if (!customer) throw new Error("Customer profile not found.");
  return {
    enabled: customer.totpEnabled,
    enabledAt: customer.totpEnabledAt,
    backupCodesRemaining: customer.totpBackupHashes
      ? (JSON.parse(customer.totpBackupHashes) as string[]).length
      : 0,
  };
}

export async function beginCustomerTotpSetup(userId: string, email: string) {
  const customer = await prisma.customer.findUnique({ where: { userId } });
  if (!customer) throw new Error("Customer profile not found.");
  if (customer.totpEnabled) {
    throw new Error("Two-factor authentication is already enabled.");
  }
  const secret = generateTotpSecret();
  const uri = customerTotpUri(email, secret);
  const qrDataUrl = await totpQrDataUrl(uri);
  return {
    secret,
    uri,
    qrDataUrl,
    setupToken: setupFingerprint(userId, secret),
  };
}

export async function enableCustomerTotp(input: {
  userId: string;
  actorId: string;
  secret: string;
  setupToken: string;
  code: string;
}) {
  const customer = await prisma.customer.findUnique({ where: { userId: input.userId } });
  if (!customer) throw new Error("Customer profile not found.");
  if (customer.totpEnabled) throw new Error("Two-factor authentication is already enabled.");
  if (!timingSafeEqualHex(setupFingerprint(input.userId, input.secret), input.setupToken)) {
    throw new Error("Invalid setup session. Start again.");
  }
  if (!verifyTotpCode(input.secret, input.code)) {
    throw new Error("That authenticator code is invalid or expired.");
  }
  const backup = await createBackupCodes(8);
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      totpEnabled: true,
      totpSecretEnc: encryptTotpSecret(input.secret),
      totpBackupHashes: backup.hashesJson,
      totpEnabledAt: new Date(),
    },
  });
  await audit({
    actorId: input.actorId,
    action: "customer.totp.enable",
    entityType: "Customer",
    entityId: customer.id,
  });
  return { backupCodes: backup.codes };
}

export async function disableCustomerTotp(input: {
  userId: string;
  actorId: string;
  code: string;
}) {
  const customer = await prisma.customer.findUnique({ where: { userId: input.userId } });
  if (!customer) throw new Error("Customer profile not found.");
  if (!customer.totpEnabled || !customer.totpSecretEnc) {
    throw new Error("Two-factor authentication is not enabled.");
  }
  const secret = decryptTotpSecret(customer.totpSecretEnc);
  const totpOk = verifyTotpCode(secret, input.code);
  let nextHashes = customer.totpBackupHashes;
  if (!totpOk) {
    const consumed = await consumeBackupCode(customer.totpBackupHashes, input.code);
    if (!consumed) throw new Error("That authenticator code is invalid or expired.");
    nextHashes = consumed;
  }
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      totpEnabled: false,
      totpSecretEnc: null,
      totpBackupHashes: null,
      totpEnabledAt: null,
    },
  });
  await audit({
    actorId: input.actorId,
    action: "customer.totp.disable",
    entityType: "Customer",
    entityId: customer.id,
    metadata: {
      usedBackup: !totpOk,
      backupRemaining: nextHashes ? (JSON.parse(nextHashes) as string[]).length : 0,
    },
  });
  return { ok: true };
}

export async function verifyCustomerTotpLogin(userId: string, code: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { customer: true, adminProfile: true },
  });
  if (!user?.customer || user.role !== "CUSTOMER") {
    throw new Error("This account does not have customer access.");
  }
  if (user.status === "SUSPENDED") throw new Error("This account has been suspended.");
  const customer = user.customer;
  if (!customer.totpEnabled || !customer.totpSecretEnc) {
    throw new Error("Two-factor authentication is not enabled for this account.");
  }
  const secret = decryptTotpSecret(customer.totpSecretEnc);
  if (verifyTotpCode(secret, code)) {
    return user;
  }
  const nextHashes = await consumeBackupCode(customer.totpBackupHashes, code);
  if (!nextHashes) {
    throw new Error("That authenticator code is invalid or expired.");
  }
  await prisma.customer.update({
    where: { id: customer.id },
    data: { totpBackupHashes: nextHashes },
  });
  return user;
}
