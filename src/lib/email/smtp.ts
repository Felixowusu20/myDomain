import nodemailer from "nodemailer";
import { isSmtpConfigured, smtpAuthUser } from "@/lib/env";

type MailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!isSmtpConfigured()) return null;
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure =
    String(process.env.SMTP_SECURE ?? (port === 465 ? "true" : "false")).toLowerCase() ===
    "true";
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: smtpAuthUser(),
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

export async function sendMail(input: MailInput) {
  const mailer = getTransporter();
  if (!mailer) {
    console.info("[smtp:skipped]", { to: input.to, subject: input.subject });
    return { skipped: true as const };
  }
  await mailer.sendMail({
    from: process.env.SMTP_FROM || smtpAuthUser(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  return { skipped: false as const };
}
