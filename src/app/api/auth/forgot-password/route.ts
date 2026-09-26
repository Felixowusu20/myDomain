import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { rateLimit } from "@/lib/rate-limit";
import { createResetToken } from "@/lib/session";
import { getAppUrl } from "@/lib/env";
import { sendMail } from "@/lib/email/smtp";
import { resetPasswordEmail } from "@/lib/email/templates";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (!rateLimit(`forgot:${ip}`, 6).ok) {
      return jsonError("Too many attempts. Please wait a moment.", 429);
    }
    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await createResetToken(user.id);
      const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      const message = resetPasswordEmail(user.name, resetUrl);
      void sendMail({
        to: user.email,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }).catch((mailError) => console.error("Reset email failed", mailError));
    }
    return jsonOk({
      ok: true,
      message: "If that email is registered, we sent reset instructions.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
