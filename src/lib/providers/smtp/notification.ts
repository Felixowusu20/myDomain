import type { NotificationProvider } from "@/lib/providers/types";
import { sendMail } from "@/lib/email/smtp";
import { notificationEmail } from "@/lib/email/templates";

export class SmtpNotificationProvider implements NotificationProvider {
  async send(input: {
    to?: string;
    event: string;
    title: string;
    body: string;
    channel?: "email" | "sms" | "whatsapp" | "in_app";
  }) {
    const channel = input.channel ?? (input.to ? "email" : "in_app");
    if (channel !== "email" || !input.to) {
      console.info("[notification]", {
        channel,
        to: input.to ?? "in-app",
        event: input.event,
        title: input.title,
      });
      return;
    }
    const message = notificationEmail(input.title, input.body);
    await sendMail({
      to: input.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}

export const smtpNotificationProvider = new SmtpNotificationProvider();
