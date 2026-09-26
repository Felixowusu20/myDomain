import { prisma } from "@/lib/db";
import { getDomainProvider } from "@/lib/providers";

function domainNameFromPayload(body: Record<string, unknown>) {
  const nested = body.data && typeof body.data === "object" ? (body.data as Record<string, unknown>) : {};
  const domain =
    body.domainName ??
    body.domain ??
    nested.domainName ??
    nested.domain ??
    (nested.domain && typeof nested.domain === "object"
      ? (nested.domain as Record<string, unknown>).domainName
      : undefined);
  return typeof domain === "string" ? domain.toLowerCase() : "";
}

export async function handleNamecomWebhook(body: Record<string, unknown>) {
  const event = String(body.eventName ?? body.event ?? body.type ?? "");
  const name = domainNameFromPayload(body);
  if (!name) return { handled: false, event };

  const domain = await prisma.domain.findUnique({ where: { name } });
  if (!domain) return { handled: false, event, name };

  if (event.includes("expiration")) {
    await prisma.domain.update({ where: { id: domain.id }, data: { status: "EXPIRED" } });
  } else if (event.includes("lock")) {
    const live = await getDomainProvider().getDomain(name).catch(() => null);
    await prisma.domain.update({
      where: { id: domain.id },
      data: {
        locked: live?.locked ?? true,
        status: live?.locked ? "LOCKED" : "ACTIVE",
      },
    });
  } else if (event.includes("transfer") && event.includes("out")) {
    await prisma.domain.update({ where: { id: domain.id }, data: { status: "PENDING_TRANSFER" } });
  } else if (event.includes("transfer")) {
    const live = await getDomainProvider().getDomain(name).catch(() => null);
    if (live) {
      await prisma.domain.update({
        where: { id: domain.id },
        data: {
          status: live.status,
          expiresAt: live.expiresAt ? new Date(live.expiresAt) : domain.expiresAt,
          nameserversJson: JSON.stringify(live.nameservers),
        },
      });
    }
  } else if (event.includes("verification") || event.includes("contact")) {
    const live = await getDomainProvider().getDomain(name).catch(() => null);
    if (live) {
      await prisma.domain.update({
        where: { id: domain.id },
        data: { status: live.status },
      });
    }
  } else if (event.includes("removal") || event.includes("rejection")) {
    await prisma.domain.update({ where: { id: domain.id }, data: { status: "FAILED" } });
  }

  return { handled: true, event, name };
}
