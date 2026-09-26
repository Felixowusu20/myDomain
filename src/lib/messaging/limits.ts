import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export async function consumeDurableLimit(key: string, limit: number, windowMs: number) {
  const burst = rateLimit(`durable:${key}`, limit, windowMs);
  if (!burst.ok) return { ok: false as const, retryAfterMs: windowMs };

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.rateLimitBucket.findUnique({ where: { key } });
    if (!existing || existing.resetAt <= now) {
      await tx.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, resetAt: new Date(now.getTime() + windowMs) },
        update: { count: 1, resetAt: new Date(now.getTime() + windowMs) },
      });
      return { ok: true as const, retryAfterMs: 0 };
    }
    if (existing.count >= limit) {
      return {
        ok: false as const,
        retryAfterMs: Math.max(0, existing.resetAt.getTime() - now.getTime()),
      };
    }
    await tx.rateLimitBucket.update({
      where: { id: existing.id },
      data: { count: { increment: 1 } },
    });
    return { ok: true as const, retryAfterMs: 0 };
  });
}
