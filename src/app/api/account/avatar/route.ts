import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { isCloudinaryConfigured } from "@/lib/env";
import { uploadAvatarImage } from "@/lib/cloudinary";

export async function POST(request: Request) {
  try {
    if (!isCloudinaryConfigured()) {
      return jsonError("Cloudinary is not configured.", 503);
    }
    const session = await requireCustomer();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return jsonError("Please choose an image.", 400);
    }
    if (file.size > 5 * 1024 * 1024) {
      return jsonError("Please use an image smaller than 5 MB.", 400);
    }
    if (!file.type.startsWith("image/")) {
      return jsonError("Please upload an image file.", 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    const uploaded = await uploadAvatarImage({
      dataUri,
      userId: session.sub,
    });
    const user = await prisma.user.update({
      where: { id: session.sub },
      data: { avatarUrl: uploaded.url },
    });
    return jsonOk({ avatarUrl: user.avatarUrl });
  } catch (error) {
    return handleRouteError(error);
  }
}
