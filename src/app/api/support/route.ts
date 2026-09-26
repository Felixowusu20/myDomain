import { z } from "zod";
import { jsonCreated, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { prisma } from "@/lib/db";

const schema = z.object({
  subject: z.string().min(3),
  message: z.string().min(8),
});

export async function GET() {
  try {
    const session = await requireCustomer();
    const tickets = await prisma.supportTicket.findMany({
      where: { customerId: session.customerId },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk({ tickets });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireCustomer();
    const body = schema.parse(await request.json());
    const ticket = await prisma.supportTicket.create({
      data: {
        customerId: session.customerId,
        subject: body.subject,
        message: body.message,
      },
    });
    return jsonCreated({ ticket });
  } catch (error) {
    return handleRouteError(error);
  }
}
