import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { smsConfig } from "@/lib/messaging/config";
import { MessagingError } from "@/lib/messaging/errors";
import { createApiKeyMaterial, normalizeScopes, parseScopes, type ApiKeyScope } from "@/lib/security/api-key";

const SENDER = /^[A-Za-z0-9][A-Za-z0-9 ]{0,10}$/;

export function assertSenderId(value: string) {
  const sender = value.trim();
  if (!SENDER.test(sender)) {
    throw new MessagingError("Sender ID must be 1 to 11 letters or numbers.");
  }
  return sender;
}

export async function createApiProject(input: {
  customerId: string;
  name: string;
  actorId?: string | null;
}) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) {
    throw new MessagingError("Project name must be between 2 and 80 characters.");
  }
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    include: { user: true },
  });
  if (!customer || customer.user.status !== "ACTIVE") {
    throw new MessagingError("Customer not found.", 404);
  }

  const sender = assertSenderId(smsConfig().defaultSender);
  const project = await prisma.apiProject.create({
    data: {
      customerId: customer.id,
      name,
      defaultSender: sender,
      senderIds: { create: { value: sender, status: "ACTIVE" } },
    },
    include: { senderIds: true },
  });
  await audit({
    actorId: input.actorId,
    action: "api_project.created",
    entityType: "ApiProject",
    entityId: project.id,
    metadata: { customerId: customer.id, name },
  });
  return project;
}

export async function assertOwnedProject(customerId: string, projectId: string) {
  const project = await prisma.apiProject.findFirst({ where: { id: projectId, customerId } });
  if (!project) throw new MessagingError("Project not found.", 404);
  return project;
}

export async function assertOwnedKey(customerId: string, keyId: string) {
  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, project: { customerId } },
    include: { project: true },
  });
  if (!key) throw new MessagingError("API key not found.", 404);
  return key;
}

export async function assertOwnedSender(customerId: string, senderId: string) {
  const sender = await prisma.senderId.findFirst({
    where: { id: senderId, project: { customerId } },
  });
  if (!sender) throw new MessagingError("Sender ID not found.", 404);
  return sender;
}

export async function createProjectApiKey(input: {
  projectId: string;
  name: string;
  scopes: string[];
  expiresAt?: Date | null;
  actorId?: string | null;
}) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) {
    throw new MessagingError("Key name must be between 2 and 80 characters.");
  }
  const scopes = normalizeScopes(input.scopes);
  if (!scopes.length) throw new MessagingError("Choose at least one API key scope.");
  const project = await prisma.apiProject.findUnique({ where: { id: input.projectId } });
  if (!project || project.status !== "ACTIVE") throw new MessagingError("Project not found.", 404);

  const material = createApiKeyMaterial();
  const key = await prisma.apiKey.create({
    data: {
      projectId: project.id,
      name,
      prefix: material.prefix,
      secretHash: material.secretHash,
      scopesJson: JSON.stringify(scopes),
      expiresAt: input.expiresAt ?? null,
    },
  });
  await audit({
    actorId: input.actorId,
    action: "api_key.created",
    entityType: "ApiKey",
    entityId: key.id,
    metadata: { projectId: project.id, prefix: key.prefix, scopes },
  });
  return { id: key.id, prefix: key.prefix, secret: material.token, scopes, name: key.name };
}

export async function revokeProjectApiKey(id: string, actorId?: string | null) {
  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key) throw new MessagingError("API key not found.", 404);
  if (key.status === "REVOKED") return key;
  const updated = await prisma.apiKey.update({
    where: { id },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  await audit({
    actorId,
    action: "api_key.revoked",
    entityType: "ApiKey",
    entityId: id,
    metadata: { prefix: key.prefix, projectId: key.projectId },
  });
  return updated;
}

export async function rotateProjectApiKey(id: string, actorId?: string | null) {
  const current = await prisma.apiKey.findUnique({ where: { id } });
  if (!current || current.status !== "ACTIVE") throw new MessagingError("API key not found.", 404);
  const scopes = parseScopes(current.scopesJson);
  const created = await createProjectApiKey({
    projectId: current.projectId,
    name: current.name,
    scopes,
    expiresAt: current.expiresAt,
    actorId,
  });
  await revokeProjectApiKey(current.id, actorId);
  await audit({
    actorId,
    action: "api_key.rotated",
    entityType: "ApiKey",
    entityId: created.id,
    metadata: { previousId: current.id, prefix: created.prefix },
  });
  return created;
}

export async function addSenderId(input: { projectId: string; value: string; actorId?: string | null }) {
  const value = assertSenderId(input.value);
  const project = await prisma.apiProject.findUnique({ where: { id: input.projectId } });
  if (!project) throw new MessagingError("Project not found.", 404);
  const sender = await prisma.senderId.upsert({
    where: { projectId_value: { projectId: project.id, value } },
    create: { projectId: project.id, value, status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });
  await audit({
    actorId: input.actorId,
    action: "sender_id.saved",
    entityType: "SenderId",
    entityId: sender.id,
    metadata: { projectId: project.id, value },
  });
  return sender;
}

export async function disableSenderId(id: string, actorId?: string | null) {
  const sender = await prisma.senderId.findUnique({ where: { id } });
  if (!sender) throw new MessagingError("Sender ID not found.", 404);
  const updated = await prisma.senderId.update({
    where: { id },
    data: { status: "DISABLED" },
  });
  await audit({
    actorId,
    action: "sender_id.disabled",
    entityType: "SenderId",
    entityId: id,
    metadata: { projectId: sender.projectId, value: sender.value },
  });
  return updated;
}

export async function assertActiveSender(projectId: string, senderId: string) {
  const sender = assertSenderId(senderId);
  const row = await prisma.senderId.findFirst({
    where: { projectId, value: sender, status: "ACTIVE" },
  });
  if (!row) throw new MessagingError("That sender ID is not enabled for this project.");
  return row.value;
}

export function publicKey(key: {
  id: string;
  name: string;
  prefix: string;
  status: string;
  scopesJson: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  project?: { id: string; name: string };
}) {
  return {
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    status: key.status,
    scopes: parseScopes(key.scopesJson) satisfies ApiKeyScope[],
    expiresAt: key.expiresAt?.toISOString() ?? null,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
    project: key.project ? { id: key.project.id, name: key.project.name } : undefined,
  };
}
