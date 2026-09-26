import { prisma } from "@/lib/db";
import { callingCountry, maskPhone } from "@/lib/messaging/phone";

export async function recordSmsUsage(input: {
  projectId: string;
  customerId: string;
  apiKeyId?: string | null;
  messageId: string;
  endpoint: string;
  destination: string;
  messageType: string;
}) {
  await prisma.usageRecord.create({
    data: {
      projectId: input.projectId,
      customerId: input.customerId,
      apiKeyId: input.apiKeyId ?? null,
      messageId: input.messageId,
      endpoint: input.endpoint,
      destination: maskPhone(input.destination),
      country: callingCountry(input.destination),
      messageType: input.messageType,
      units: 1,
    },
  });
}
