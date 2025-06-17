// @ts-ignore – Bun runtime provides `$` but type may be missing in tsconfig
import { $ } from "bun";
import { promises as fs } from "fs";
import path from "path";

// Change this to your bucket name or set env R2_BUCKET (falls back to 'photos')
const BUCKET = process.env.R2_BUCKET ?? "photos";

// Wrangler v3 尚未提供 `r2 object head/list`，因此直接尝试上传。
// 若目标已存在，CLI 会返回 412 (Precondition Failed)。
async function uploadFile(localPath: string, r2Key: string, contentType?: string) {
  if (!(await fs.access(localPath).then(() => true).catch(() => false))) {
    console.warn(`! Skipping, local file not found: ${localPath}`);
    return;
  }

  const args = ["r2", "object", "put", `${BUCKET}/${r2Key}`, "--file", localPath];
  if (contentType) args.push("--content-type", contentType);

  try {
    console.log(`↑ Uploading: ${r2Key}`);
    await $`wrangler ${args}`;
  } catch (err: any) {
    const msg = String(err.stderr || err.message || err);
    if (msg.includes("412")) {
      console.log(`✓ Skipping, already exists in R2: ${r2Key}`);
    } else {
      console.error(`✗ Failed to upload ${r2Key}:`, msg.trim());
    }
  }
}

async function main() {
  let photos = [];
  try {
    photos = JSON.parse(await fs.readFile("photos.json", "utf8"));
  } catch {
    console.error("Error: photos.json not found. Please run the import script first.");
    return;
  }

  console.log(`--- Syncing ${photos.length} records from photos.json to R2 ---`);

  for (const photo of photos) {
    if (!photo.r2_key || !photo.thumb_key) {
      console.warn(`! Skipping record with missing keys: ID ${photo.id}, Filename: ${photo.filename}`);
      continue;
    }
    
    // Upload original
    const originalLocalPath = path.join("photos_raw", photo.filename);
    await uploadFile(originalLocalPath, photo.r2_key);

    // Upload thumbnail
    const thumbLocalPath = path.join("public", photo.thumb_key);
    await uploadFile(thumbLocalPath, photo.thumb_key, "image/avif");
  }
  
  console.log("\nUpload process complete.");
}

main(); 