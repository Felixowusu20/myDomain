import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { isCloudinaryConfigured } from "@/lib/env";
import { uploadCmsImage } from "@/lib/cloudinary";

export async function POST(request: Request) {
  try {
    if (!isCloudinaryConfigured()) {
      return jsonError("Cloudinary is not configured.", 503);
    }
    await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "partner");
    if (!(file instanceof File) || file.size === 0) {
      return jsonError("Please choose an image.", 400);
    }
    if (file.size > 8 * 1024 * 1024) {
      return jsonError("Please use an image smaller than 8 MB.", 400);
    }
    if (!file.type.startsWith("image/")) {
      return jsonError("Please upload an image file.", 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    const uploaded = await uploadCmsImage({
      dataUri,
      folder: kind === "hero" ? "mydomain/cms/hero" : "mydomain/cms/partners",
    });
    return jsonOk(uploaded);
  } catch (error) {
    return handleRouteError(error);
  }
}
