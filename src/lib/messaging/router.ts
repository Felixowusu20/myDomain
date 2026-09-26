import { mockSmsNetworkConnector } from "@/lib/messaging/connectors/mock";
import { smsConnectorName } from "@/lib/messaging/config";
import { logMessaging } from "@/lib/messaging/log";
import type { SmsNetworkConnector } from "@/lib/messaging/types";

let warned = false;

/**
 * Picks a connector for a message.
 * The first implementation always uses the configured connector.
 * Country, sender, cost, and priority can be added here later without changing OTP.
 */
export function resolveConnector(_input: {
  to: string;
  senderId: string;
  type: string;
}): SmsNetworkConnector {
  const name = smsConnectorName();
  if (name !== "mock" && !warned) {
    warned = true;
    logMessaging("sms.connector.unsupported", {
      requested: name,
      active: "mock",
      simulated: true,
    });
  }
  return mockSmsNetworkConnector;
}
