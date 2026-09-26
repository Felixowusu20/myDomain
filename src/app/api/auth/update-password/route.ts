import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { hashPassword, verifyResetToken } from "@/lib/session";
import { isPasswordStrongEnough } from "@/lib/password-strength";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().optional(),
    token: z.string().min(10, "This reset link is invalid or has expired."),
  })
  .refine((value) => isPasswordStrongEnough(value.password), {
    message: "Choose a stronger password.",
    path: ["password"],
  })
  .refine((value) => !value.confirmPassword || value.confirmPassword === value.password, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const userId = await verifyResetToken(body.token);
    if (!userId) {
      return jsonError("This reset link is invalid or has expired. Request a new one.", 401);
    }
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(body.password) },
    });
    return jsonOk({ ok: true, redirectTo: "/login" });
  } catch (error) {
    return handleRouteError(error);
  }
}
