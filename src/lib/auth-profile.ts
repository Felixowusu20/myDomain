import { prisma } from "@/lib/db";

export async function adminExists() {
  return (await prisma.admin.count()) > 0;
}
