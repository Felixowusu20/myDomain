import { maskPhone } from "@/lib/messaging/phone";
import { logMessaging } from "@/lib/messaging/log";
import type { DeliveryStatusResult, OutboundSms, SendResult, SmsNetworkConnector } from "@/lib/messaging/types";

export function developmentMockOutcome(metadata: Record<string, unknown>, nodeEnv = process.env.NODE_ENV) {
  if (nodeEnv === "production") return undefined;
  const value = metadata.mockOutcome;
  return value === "temporary" || value === "reject" ? value : undefined;
}

/**
 * Development-only SMS connector.
 * It does not connect to MTN, Telecel, AirtelTigo, SMPP, or any other mobile network.
 * Delivery receipts it returns are simulated.
 */
export class MockSmsNetworkConnector implements SmsNetworkConnector {
  readonly id = "mock";
  readonly developmentOnly = true;

  async send(message: OutboundSms): Promise<SendResult> {
    const outcome = developmentMockOutcome(message.metadata);
    logMessaging("sms.mock.send", {
      messageId: message.messageId,
      to: maskPhone(message.to),
      senderId: message.senderId,
      simulated: true,
      connector: this.id,
    });

    if (outcome === "temporary") {
      return { status: "FAILED", errorCode: "MOCK_TEMPORARY", retryable: true };
    }
    if (outcome === "reject") {
      return { status: "REJECTED", errorCode: "MOCK_REJECTED", retryable: false };
    }
    return {
      status: "SENT",
      providerMessageId: `mock_${message.messageId}`,
      retryable: false,
    };
  }

  async getDeliveryStatus(providerMessageId: string): Promise<DeliveryStatusResult> {
    if (!providerMessageId.startsWith("mock_")) {
      return { status: "UNKNOWN" };
    }
    return { status: "DELIVERED", simulated: true };
  }
}

export const mockSmsNetworkConnector = new MockSmsNetworkConnector();
