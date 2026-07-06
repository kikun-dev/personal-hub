import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";

/**
 * member / release / spot の画像アップロード usecase の共通コア（Issue #298）。
 * mime/size/拡張子検証・base64 デコード検証・repository への upload 呼び出しは
 * 3系統でほぼ逐語一致していたため、ここに集約する。
 *
 * object path の生成規則（`members/{id}/...` 等）はドメインごとに異なるため
 * `buildObjectPath` として呼び出し側から注入する。
 */

export type StorageImageUploadRepo = {
  upload(input: {
    objectPath: string;
    body: Uint8Array;
    contentType: string;
    cacheControl: string;
    upsert: boolean;
  }): Promise<void>;
};

export type StorageImageUploadFile = {
  mimeType: string;
  size: number;
  base64Data: string;
};

export type UploadStorageImageConfig = {
  // ValidationError.field に載せる値（例: "imageUrl" / "artworkPath" / "photos"）
  errorField: string;
  maxBytes: number;
  isAllowedMimeType: (mimeType: string) => boolean;
  getExtensionFromMimeType: (mimeType: string) => string | null;
  buildObjectPath: (extension: string) => string;
};

function decodeBase64(data: string): Uint8Array | null {
  try {
    const buffer = Buffer.from(data, "base64");
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

export async function uploadStorageImage(
  repo: StorageImageUploadRepo,
  imageFile: StorageImageUploadFile,
  config: UploadStorageImageConfig
): Promise<Result<string, ValidationError[]>> {
  if (!config.isAllowedMimeType(imageFile.mimeType)) {
    return {
      ok: false,
      errors: [{ field: config.errorField, message: "画像形式が不正です" }],
    };
  }

  if (imageFile.size <= 0 || imageFile.size > config.maxBytes) {
    return {
      ok: false,
      errors: [{ field: config.errorField, message: "画像サイズが不正です" }],
    };
  }

  const extension = config.getExtensionFromMimeType(imageFile.mimeType);
  if (!extension) {
    return {
      ok: false,
      errors: [{ field: config.errorField, message: "画像形式が不正です" }],
    };
  }

  const body = decodeBase64(imageFile.base64Data);
  if (!body || body.byteLength !== imageFile.size) {
    return {
      ok: false,
      errors: [{ field: config.errorField, message: "画像データが不正です" }],
    };
  }

  const objectPath = config.buildObjectPath(extension);

  await repo.upload({
    objectPath,
    body,
    contentType: imageFile.mimeType,
    cacheControl: "31536000",
    upsert: false,
  });

  return { ok: true, data: objectPath };
}
