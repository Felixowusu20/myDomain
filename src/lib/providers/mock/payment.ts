import { randomUUID } from "crypto";
import type { PaymentProvider, PaymentRequest, PaymentResult } from "@/lib/providers/types";

const payments = new Map<string, PaymentResult>();

export class MockPaymentProvider implements PaymentProvider {
  async createPayment(input: PaymentRequest): Promise<PaymentResult> {
    const fail =
      input.metadata?.fail === true ||
      String(input.metadata?.cardNumber ?? "").endsWith("0002");
    const result: PaymentResult = {
      id: randomUUID(),
      status: fail ? "FAILED" : "SUCCESS",
      amountCents: input.amountCents,
      providerRef: `mock-pay-${randomUUID()}`,
    };
    payments.set(result.providerRef, result);
    return result;
  }

  async verifyPayment(providerRef: string) {
    const payment = payments.get(providerRef);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    return payment;
  }

  async getPayment(providerRef: string) {
    return payments.get(providerRef) ?? null;
  }

  async refundPayment(providerRef: string) {
    const payment = payments.get(providerRef);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    const refunded = { ...payment, status: "REFUNDED" as const };
    payments.set(providerRef, refunded);
    return refunded;
  }
}

export const mockPaymentProvider = new MockPaymentProvider();
