import { getAppUrl } from "@/lib/env";

function layout(title: string, body: string) {
  const app = getAppUrl();
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#12263a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e6ebf0;">
            <tr><td style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#0f766e;font-weight:700;">myDomain</td></tr>
            <tr><td style="padding-top:12px;font-size:22px;font-weight:800;">${title}</td></tr>
            <tr><td style="padding-top:16px;font-size:15px;line-height:1.6;color:#3d5166;">${body}</td></tr>
            <tr><td style="padding-top:28px;font-size:12px;color:#7a8b9a;">
              <a href="${app}" style="color:#0f766e;">Open myDomain</a>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function emailOtpEmail(name: string, code: string, minutes = 15) {
  return {
    subject: "Your myDomain verification code",
    html: layout(
      "Verify your email",
      `Hi ${name || "there"}, use this code to verify your myDomain account. It expires in ${minutes} minutes.<p style="margin:24px 0;font-size:32px;letter-spacing:.28em;font-weight:800;color:#12263a;">${code}</p>If you did not create this account, you can ignore this email.`,
    ),
    text: `Hi ${name || "there"}, your myDomain verification code is ${code}. It expires in ${minutes} minutes.`,
  };
}

export function welcomeEmail(name: string) {
  return {
    subject: "Welcome to myDomain",
    html: layout(
      `Welcome, ${name}`,
      "Your account is ready. Search a domain, add hosting, and manage everything from your dashboard.",
    ),
    text: `Welcome, ${name}. Your myDomain account is ready.`,
  };
}

export function adminWelcomeEmail(name: string) {
  return {
    subject: "Your myDomain admin account",
    html: layout(
      `Admin access for ${name}`,
      "You can sign in at the admin portal to manage customers, domains, hosting, and billing.",
    ),
    text: `Admin access is ready for ${name}.`,
  };
}

export function resetPasswordEmail(name: string, resetUrl: string) {
  return {
    subject: "Reset your myDomain password",
    html: layout(
      "Reset your password",
      `Hi ${name || "there"}, we received a request to reset your password. <p style="margin:20px 0;"><a href="${resetUrl}" style="background:#0f766e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;">Choose a new password</a></p>If you did not ask for this, you can ignore this email.`,
    ),
    text: `Reset your myDomain password: ${resetUrl}`,
  };
}

export function notificationEmail(title: string, body: string) {
  return {
    subject: title,
    html: layout(title, body),
    text: `${title}\n\n${body}`,
  };
}
