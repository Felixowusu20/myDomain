import type { SmsStatus } from "@/lib/messaging/status";

export type OutboundSms = {
  messageId: string;
  to: string;
  body: string;
  senderId: string;
  metadata: Record<string, unknown>;
};

export type SendResult = {
  status: "SENT" | "FAILED" | "REJECTED";
  providerMessageId?: string;
  errorCode?: string;
  retryable: boolean;
};

export type DeliveryStatusResult = {
  status: SmsStatus | "UNKNOWN";
  errorCode?: string;
  /** True when the receipt was produced by the development connector, not a mobile network. */
  simulated?: boolean;
};

export interface SmsNetworkConnector {
  readonly id: string;
  /** Development connectors must set this so callers cannot treat them as carrier access. */
  readonly developmentOnly: boolean;
  send(message: OutboundSms): Promise<SendResult>;
  getDeliveryStatus(providerMessageId: string): Promise<DeliveryStatusResult>;
}
