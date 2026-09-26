import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  createBackupCodes,
  consumeBackupCode,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  setupFingerprint,
  timingSafeEqualHex,
  totpQrDataUrl,
  totpUri,
  verifyTotpCode,
} from "@/lib/security/totp";

export async function getAdminTotpStatus(userId: string) {
  const admin = await prisma.admin.findUnique({ where: { userId } });
  if (!admin) throw new Error("Admin profile not found.");
  return {
    enabled: admin.totpEnabled,
    enabledAt: admin.totpEnabledAt,
    backupCodesRemaining: admin.totpBackupHashes
      ? (JSON.parse(admin.totpBackupHashes) as string[]).length
      : 0,
  };
}

export async function beginAdminTotpSetup(userId: string, email: string) {
  const admin = await prisma.admin.findUnique({ where: { userId } });
  if (!admin) throw new Error("Admin profile not found.");
  if (admin.totpEnabled) {
    throw new Error("Two-factor authentication is already enabled.");
  }
  const secret = generateTotpSecret();
  const uri = totpUri(email, secret);
  const qrDataUrl = await totpQrDataUrl(uri);
  return {
    secret,
    uri,
    qrDataUrl,
    setupToken: setupFingerprint(userId, secret),
  };
}

export async function enableAdminTotp(input: {
  userId: string;
  actorId: string;
  secret: string;
  setupToken: string;
  code: string;
}) {
  const admin = await prisma.admin.findUnique({ where: { userId: input.userId } });
  if (!admin) throw new Error("Admin profile not found.");
  if (admin.totpEnabled) throw new Error("Two-factor authentication is already enabled.");
  if (!timingSafeEqualHex(setupFingerprint(input.userId, input.secret), input.setupToken)) {
    throw new Error("Invalid setup session. Start again.");
  }
  if (!verifyTotpCode(input.secret, input.code)) {
    throw new Error("That authenticator code is invalid or expired.");
  }
  const backup = await createBackupCodes(8);
  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      totpEnabled: true,
      totpSecretEnc: encryptTotpSecret(input.secret),
      totpBackupHashes: backup.hashesJson,
      totpEnabledAt: new Date(),
    },
  });
  await audit({
    actorId: input.actorId,
    action: "admin.totp.enable",
    entityType: "Admin",
    entityId: admin.id,
  });
  return { backupCodes: backup.codes };
}

export async function disableAdminTotp(input: {
  userId: string;
  actorId: string;
  code: string;
}) {
  const admin = await prisma.admin.findUnique({ where: { userId: input.userId } });
  if (!admin) throw new Error("Admin profile not found.");
  if (!admin.totpEnabled || !admin.totpSecretEnc) {
    throw new Error("Two-factor authentication is not enabled.");
  }
  const secret = decryptTotpSecret(admin.totpSecretEnc);
  const totpOk = verifyTotpCode(secret, input.code);
  let nextHashes = admin.totpBackupHashes;
  if (!totpOk) {
    const consumed = await consumeBackupCode(admin.totpBackupHashes, input.code);
    if (!consumed) throw new Error("That authenticator code is invalid or expired.");
    nextHashes = consumed;
  }
  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      totpEnabled: false,
      totpSecretEnc: null,
      totpBackupHashes: null,
      totpEnabledAt: null,
    },
  });
  await audit({
    actorId: input.actorId,
    action: "admin.totp.disable",
    entityType: "Admin",
    entityId: admin.id,
    metadata: { usedBackup: !totpOk, backupRemaining: nextHashes ? (JSON.parse(nextHashes) as string[]).length : 0 },
  });
  return { ok: true };
}

export async function verifyAdminTotpLogin(userId: string, code: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { customer: true, adminProfile: true },
  });
  if (!user?.adminProfile || user.role !== "ADMIN") {
    throw new Error("This account does not have admin access.");
  }
  if (user.status === "SUSPENDED") throw new Error("This account has been suspended.");
  const admin = user.adminProfile;
  if (!admin.totpEnabled || !admin.totpSecretEnc) {
    throw new Error("Two-factor authentication is not enabled for this account.");
  }
  const secret = decryptTotpSecret(admin.totpSecretEnc);
  if (verifyTotpCode(secret, code)) {
    return user;
  }
  const nextHashes = await consumeBackupCode(admin.totpBackupHashes, code);
  if (!nextHashes) {
    throw new Error("That authenticator code is invalid or expired.");
  }
  await prisma.admin.update({
    where: { id: admin.id },
    data: { totpBackupHashes: nextHashes },
  });
  return user;
}
