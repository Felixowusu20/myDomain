import { v2 as cloudinary } from "cloudinary";
import { isCloudinaryConfigured } from "@/lib/env";

let configured = false;

function ensureConfig() {
  if (configured) return;
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured.");
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
    api_key: process.env.CLOUDINARY_API_KEY?.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
    secure: true,
  });
  configured = true;
}

export function avatarDeliveryUrl(publicId: string) {
  ensureConfig();
  return cloudinary.url(publicId, {
    width: 160,
    height: 160,
    crop: "fill",
    gravity: "face",
    fetch_format: "auto",
    quality: "auto",
    secure: true,
  });
}

export async function uploadAvatarImage(input: {
  dataUri: string;
  userId: string;
}) {
  ensureConfig();
  const result = await cloudinary.uploader.upload(input.dataUri, {
    folder: "mydomain/avatars",
    public_id: input.userId,
    overwrite: true,
    resource_type: "image",
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
      { fetch_format: "auto", quality: "auto" },
    ],
  });
  return {
    publicId: result.public_id,
    url: avatarDeliveryUrl(result.public_id),
  };
}

export async function uploadCmsImage(input: {
  dataUri: string;
  folder: string;
  publicId?: string;
}) {
  ensureConfig();
  const result = await cloudinary.uploader.upload(input.dataUri, {
    folder: input.folder,
    public_id: input.publicId,
    overwrite: Boolean(input.publicId),
    resource_type: "image",
    transformation: [{ fetch_format: "auto", quality: "auto" }],
  });
  return {
    publicId: result.public_id,
    url: cloudinary.url(result.public_id, {
      fetch_format: "auto",
      quality: "auto",
      secure: true,
    }),
  };
}
