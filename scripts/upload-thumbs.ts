// @ts-ignore – Bun runtime provides `$` but type may be missing in tsconfig
import { $ } from "bun";
import { promises as fs } from "fs";
import path from "path";

// Change this to your bucket name or set env R2_BUCKET (falls back to 'photos')
const BUCKET = process.env.R2_BUCKET ?? "photos";
const THUMBS_DIR = "public/thumbs";

// Wrangler v3 尚未提供 `r2 object head/list`，因此直接尝试上传。
// 若目标已存在，CLI 会返回 412 (Precondition Failed)。
async function uploadFile(localPath: string, r2Key: string, contentType?: string) {
  if (!(await fs.access(localPath).then(() => true).catch(() => false))) {
    console.warn(`! Skipping, local file not found: ${localPath}`);
    return;
  }

  const args = ["r2", "object", "put", `${BUCKET}/${r2Key}`, "--file", localPath, "--remote"];
  if (contentType) args.push("--content-type", contentType);

  try {
    const cmdString = `wrangler ${args.join(' ')}`;
    console.log(`↑ Executing: ${cmdString}`);
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
  let thumbFiles = [];
  try {
    thumbFiles = await fs.readdir(THUMBS_DIR);
  } catch (err) {
    console.error(`Error: Could not read directory ${THUMBS_DIR}.`, err);
    return;
  }

  console.log(`--- Found ${thumbFiles.length} thumbnails in ${THUMBS_DIR} to sync to R2 ---`);

  for (const filename of thumbFiles) {
    // Skip non-files if any directories exist
    const localPath = path.join(THUMBS_DIR, filename);
    const stat = await fs.stat(localPath);
    if (!stat.isFile()) {
        continue;
    }

    // R2 key should be like 'thumbs/thumbnail.avif'
    const r2Key = path.join("thumbs", filename);
    
    await uploadFile(localPath, r2Key, "image/avif");
  }
  
  console.log("\nThumbnail upload process complete.");
}

main();
