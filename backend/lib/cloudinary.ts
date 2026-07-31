import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const CLOUDINARY_FOLDER = "1583-menu/productos";
export const CLOUDINARY_STORE_FOLDER = "1583-menu/tienda";

export function createUploadSignature(folder: string = CLOUDINARY_FOLDER) {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET as string
  );

  return {
    timestamp,
    signature,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder,
  };
}

export async function destroyImage(publicId: string) {
  await cloudinary.uploader.destroy(publicId).catch(() => null);
}

export async function uploadLocalFile(filePath: string, folder: string = CLOUDINARY_FOLDER) {
  return cloudinary.uploader.upload(filePath, { folder });
}
