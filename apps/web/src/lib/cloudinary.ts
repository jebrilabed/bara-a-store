import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { InputError } from "@/lib/backend-policy.mjs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_RECEIPT_SIZE = 4 * 1024 * 1024;
const RECEIPT_TYPES = new Map([
  ["image/jpeg", { resourceType: "image" as const, format: "jpg" }],
  ["image/png", { resourceType: "image" as const, format: "png" }],
  ["image/webp", { resourceType: "image" as const, format: "webp" }],
  ["application/pdf", { resourceType: "raw" as const, format: "pdf" }],
]);

export type UploadedReceipt = {
  publicId: string;
  resourceType: "image" | "raw";
  format: string;
};

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables are missing");
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

export async function uploadProductImage(value: FormDataEntryValue | null): Promise<string | null> {
  if (value === null || (typeof value === "string" && value === "")) return null;
  if (typeof value === "string") throw new InputError("يرجى اختيار صورة من الجهاز");
  if (value.size === 0) return null;
  if (!ALLOWED_IMAGE_TYPES.has(value.type)) {
    throw new InputError("صيغة الصورة غير مدعومة. استخدمي JPG أو PNG أو WebP");
  }
  if (value.size > MAX_IMAGE_SIZE) {
    throw new InputError("حجم الصورة يجب ألا يتجاوز 5 ميجابايت");
  }

  configureCloudinary();
  const bytes = Buffer.from(await value.arrayBuffer());
  const uploaded = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "baraa-store/products", resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    uploadStream.end(bytes);
  });
  return uploaded.secure_url;
}

export async function uploadPaymentReceipt(value: FormDataEntryValue | null): Promise<UploadedReceipt | null> {
  if (value === null || (typeof value === "string" && value === "")) return null;
  if (typeof value === "string") throw new InputError("يرجى اختيار ملف إيصال صالح");
  if (value.size === 0) return null;
  const receiptType = RECEIPT_TYPES.get(value.type);
  if (!receiptType) throw new InputError("ارفعِي الإيصال بصيغة JPG أو PNG أو WebP أو PDF");
  if (value.size > MAX_RECEIPT_SIZE) throw new InputError("حجم الإيصال يجب ألا يتجاوز 4 ميجابايت");

  configureCloudinary();
  const bytes = Buffer.from(await value.arrayBuffer());
  const uploaded = await cloudinary.uploader.upload(
    `data:${value.type};base64,${bytes.toString("base64")}`,
    {
      folder: "baraa-store/payment-receipts",
      resource_type: receiptType.resourceType,
      type: "private",
      format: receiptType.format,
    },
  );
  return {
    publicId: uploaded.public_id,
    resourceType: receiptType.resourceType,
    format: receiptType.format,
  };
}

export async function deletePaymentReceipt(receipt: UploadedReceipt) {
  configureCloudinary();
  await cloudinary.uploader.destroy(receipt.publicId, {
    resource_type: receipt.resourceType,
    type: "private",
  });
}

export function getPrivateReceiptUrl(receipt: UploadedReceipt) {
  configureCloudinary();
  return cloudinary.url(receipt.publicId, {
    secure: true,
    type: "private",
    resource_type: receipt.resourceType,
    sign_url: true,
    format: receipt.format,
  });
}