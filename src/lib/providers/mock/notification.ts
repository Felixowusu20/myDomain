import type { NotificationProvider } from "@/lib/providers/types";

export class MockNotificationProvider implements NotificationProvider {
  async send(input: {
    to?: string;
    event: string;
    title: string;
    body: string;
    channel?: "email" | "sms" | "whatsapp" | "in_app";
  }) {
    console.info("[mock-notification]", {
      channel: input.channel ?? "in_app",
      to: input.to ?? "in-app",
      event: input.event,
      title: input.title,
    });
  }
}

export const mockNotificationProvider = new MockNotificationProvider();
