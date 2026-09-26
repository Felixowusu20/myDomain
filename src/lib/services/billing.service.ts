import { prisma } from "@/lib/db";
import { getPaymentProvider, getNotificationProvider } from "@/lib/providers";
import { registerPurchasedDomain, transferPurchasedDomain } from "@/lib/services/domain.service";
import { purchaseHosting } from "@/lib/services/hosting.service";
import { customerErrors } from "@/lib/api";
import { audit } from "@/lib/audit";
import { parseJson } from "@/lib/utils";

type CartMeta = {
  domain?: string;
  years?: number;
  privacy?: boolean;
  planSlug?: string;
  hostingId?: string;
  authCode?: string;
};

export async function getCart(customerId: string) {
  const items = await prisma.cartItem.findMany({
    where: { customerId },
    orderBy: { createdAt: "asc" },
  });
  const totalCents = items.reduce((sum, item) => sum + item.amountCents, 0);
  return { items, totalCents };
}

export async function addCartItem(
  customerId: string,
  input: {
    type: string;
    description: string;
    amountCents: number;
    meta?: CartMeta;
  },
) {
  return prisma.cartItem.create({
    data: {
      customerId,
      type: input.type,
      description: input.description,
      amountCents: input.amountCents,
      metaJson: JSON.stringify(input.meta ?? {}),
    },
  });
}

export async function removeCartItem(customerId: string, id: string) {
  const item = await prisma.cartItem.findFirst({ where: { id, customerId } });
  if (!item) throw new Error("That item is no longer in your cart.");
  await prisma.cartItem.delete({ where: { id } });
}

export async function clearCart(customerId: string) {
  await prisma.cartItem.deleteMany({ where: { customerId } });
}

export async function checkoutCart(input: {
  customerId: string;
  actorId: string;
  fail?: boolean;
}) {
  const cart = await getCart(input.customerId);
  if (!cart.items.length) throw new Error("Your cart is empty.");

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    include: { user: true },
  });
  if (!customer) throw new Error("Customer not found");

  const order = await prisma.order.create({
    data: {
      customerId: input.customerId,
      status: "PENDING",
      totalCents: cart.totalCents,
      items: {
        create: cart.items.map((item) => ({
          type: item.type,
          description: item.description,
          amountCents: item.amountCents,
          metaJson: item.metaJson,
        })),
      },
    },
    include: { items: true },
  });

  const paymentResult = await getPaymentProvider().createPayment({
    amountCents: cart.totalCents,
    metadata: { orderId: order.id, fail: input.fail === true },
  });

  const payment = await prisma.payment.create({
    data: {
      customerId: input.customerId,
      orderId: order.id,
      amountCents: cart.totalCents,
      status: paymentResult.status,
      providerRef: paymentResult.providerRef,
    },
  });

  if (paymentResult.status !== "SUCCESS") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED" },
    });
    await getNotificationProvider().send({
      to: customer.user.email,
      event: "payment_failed",
      title: "Payment failed",
      body: customerErrors.paymentFailed,
    });
    throw new Error(customerErrors.paymentFailed);
  }

  await prisma.order.update({ where: { id: order.id }, data: { status: "PROCESSING" } });

  const invoiceCount = await prisma.invoice.count();
  await prisma.invoice.create({
    data: {
      customerId: input.customerId,
      orderId: order.id,
      number: `INV-${String(invoiceCount + 1).padStart(5, "0")}`,
      amountCents: cart.totalCents,
      status: "PAID",
    },
  });

  const registeredDomains: { id: string; name: string }[] = [];
  for (const item of order.items) {
    const meta = parseJson<CartMeta>(item.metaJson, {});
    if (item.type === "DOMAIN_REGISTRATION" && meta.domain) {
      try {
        const domain = await registerPurchasedDomain({
          customerId: input.customerId,
          domainName: meta.domain,
          years: meta.years ?? 1,
          privacy: Boolean(meta.privacy),
          orderId: order.id,
          actorId: input.actorId,
        });
        registeredDomains.push({ id: domain.id, name: domain.name });
      } catch (error) {
        if (error instanceof Error && error.message === "REGISTRATION_PENDING") {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: "PROCESSING" },
          });
        } else {
          throw error;
        }
      }
    }
    if (item.type === "DOMAIN_TRANSFER" && meta.domain && meta.authCode) {
      try {
        const domain = await transferPurchasedDomain({
          customerId: input.customerId,
          domainName: meta.domain,
          authCode: meta.authCode,
          privacy: Boolean(meta.privacy),
          orderId: order.id,
          actorId: input.actorId,
        });
        registeredDomains.push({ id: domain.id, name: domain.name });
      } catch (error) {
        if (error instanceof Error && error.message === "TRANSFER_PENDING") {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: "PROCESSING" },
          });
        } else {
          throw error;
        }
      }
    }
    if (item.type === "HOSTING" && meta.planSlug) {
      await purchaseHosting({
        customerId: input.customerId,
        planSlug: meta.planSlug,
        hostingId: meta.hostingId,
        actorId: input.actorId,
      });
    }
  }

  await prisma.order.update({ where: { id: order.id }, data: { status: "COMPLETED" } });
  await clearCart(input.customerId);
  await getNotificationProvider().send({
    to: customer.user.email,
    event: "payment_successful",
    title: "Payment successful",
    body: "Your order is complete.",
  });
  await audit({
    actorId: input.actorId,
    action: "billing.checkout",
    entityType: "Order",
    entityId: order.id,
    metadata: { totalCents: cart.totalCents },
  });

  return {
    orderId: order.id,
    paymentId: payment.id,
    registeredDomains,
    totalCents: cart.totalCents,
  };
}

export async function customerBilling(customerId: string) {
  const [orders, payments, invoices, subscriptions, renewals] = await Promise.all([
    prisma.order.findMany({
      where: { customerId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { customerId },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.subscription.findMany({
      where: { customerId },
      orderBy: { renewsAt: "asc" },
    }),
    prisma.renewal.findMany({
      where: { customerId, status: "UPCOMING" },
      orderBy: { dueAt: "asc" },
    }),
  ]);
  return { orders, payments, invoices, subscriptions, renewals };
}
