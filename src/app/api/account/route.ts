import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/session";
import { isPasswordStrongEnough } from "@/lib/password-strength";

const schema = z
  .object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    password: z.string().min(8).optional(),
  })
  .refine((value) => !value.password || isPasswordStrongEnough(value.password), {
    message: "Choose a stronger password.",
    path: ["password"],
  });

export async function GET() {
  try {
    const session = await requireCustomer();
    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    return jsonOk({
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        phone: user?.phone ?? "",
        avatarUrl: user?.avatarUrl ?? session.avatarUrl ?? "",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireCustomer();
    const body = schema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id: session.sub },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.password ? { passwordHash: await hashPassword(body.password) } : {}),
      },
    });
    return jsonOk({
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl ?? "",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
