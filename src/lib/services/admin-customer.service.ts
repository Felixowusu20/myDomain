import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getDomainProvider } from "@/lib/providers";

export async function deleteAdminCustomer(input: {
  customerId: string;
  confirmEmail: string;
  actorId: string;
}) {
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    include: {
      user: true,
      domains: true,
      hosting: true,
    },
  });
  if (!customer) return null;
  if (customer.user.role !== "CUSTOMER") {
    throw new Error("Only customer accounts can be deleted from this panel.");
  }

  const expected = customer.user.email.trim().toLowerCase();
  const typed = input.confirmEmail.trim().toLowerCase();
  if (!typed || typed !== expected) {
    throw new Error("Type the customer email to confirm deletion.");
  }

  const provider = getDomainProvider();
  for (const domain of customer.domains) {
    try {
      if (domain.status === "PENDING_TRANSFER") {
        await provider.cancelInboundTransfer(domain.name);
      }
    } catch {
      // Continue wiping local account data.
    }
    try {
      await provider.deleteDomain(domain.name);
    } catch {
      // Registrar may not hard-delete; local wipe still proceeds.
    }
  }

  const domainIds = customer.domains.map((domain) => domain.id);
  if (domainIds.length) {
    await prisma.hostingAccount.updateMany({
      where: { domainId: { in: domainIds } },
      data: { domainId: null },
    });
  }

  // Preserve audit history by detaching this user as actor before delete.
  await prisma.auditLog.updateMany({
    where: { actorId: customer.userId },
    data: { actorId: null },
  });

  const snapshot = {
    customerId: customer.id,
    userId: customer.userId,
    email: customer.user.email,
    name: customer.user.name,
    domainCount: customer.domains.length,
    domains: customer.domains.map((domain) => ({
      name: domain.name,
      status: domain.status,
    })),
    hostingCount: customer.hosting.length,
  };

  // Deleting the user cascades Customer and related account data.
  await prisma.user.delete({ where: { id: customer.userId } });

  await audit({
    actorId: input.actorId,
    action: "customer.delete",
    entityType: "Customer",
    entityId: customer.id,
    metadata: snapshot,
  });

  return { ok: true as const, email: customer.user.email, name: customer.user.name };
}
