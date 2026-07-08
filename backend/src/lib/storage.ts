import fs from "fs/promises";
import path from "path";

const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(process.cwd(), "storage");

/**
 * Minimal local-disk storage so the "re-index" feature can re-read the original
 * file without asking the admin to re-upload it. Swap this module for an S3/GCS
 * client in production - the interface (save/read by key) stays the same.
 */
export async function saveFile(businessId: string, documentId: string, filename: string, buffer: Buffer): Promise<string> {
  const dir = path.join(STORAGE_ROOT, businessId);
  await fs.mkdir(dir, { recursive: true });
  const key = path.join(dir, `${documentId}__${filename}`);
  await fs.writeFile(key, buffer);
  return key;
}

export async function readFile(storagePath: string): Promise<Buffer> {
  return fs.readFile(storagePath);
}

export async function deleteFile(storagePath: string): Promise<void> {
  await fs.rm(storagePath, { force: true });
}
