// @ts-ignore – Bun runtime provides `$` but type may be missing in tsconfig
import { $ } from "bun";
import { promises as fs } from "fs";
import path from "path";

// Change this to your bucket name or set env R2_BUCKET (falls back to 'photos')
const BUCKET = process.env.R2_BUCKET ?? "photos";
const PHOTOS_DIR = "photos_raw";

// 上传大图，key 为 photos_raw/原始文件名
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
  let photoFiles = [];
  try {
    photoFiles = (await fs.readdir(PHOTOS_DIR)).filter(f => !f.startsWith('.') && /\.(jpe?g|png)$/i.test(f));
  } catch (err) {
    console.error(`Error: Could not read directory ${PHOTOS_DIR}.`, err);
    return;
  }

  console.log(`--- Found ${photoFiles.length} photos in ${PHOTOS_DIR} to sync to R2 ---`);

  for (const filename of photoFiles) {
    const localPath = path.join(PHOTOS_DIR, filename);
    const stat = await fs.stat(localPath);
    if (!stat.isFile()) {
      continue;
    }
    // R2 key: photos_raw/原始文件名
    const r2Key = path.join("photos_raw", filename);
    // contentType 可根据扩展名判断
    let contentType = undefined;
    if (/\.jpe?g$/i.test(filename)) contentType = "image/jpeg";
    if (/\.png$/i.test(filename)) contentType = "image/png";
    await uploadFile(localPath, r2Key, contentType);
  }

  console.log("\nPhoto upload process complete.");
}

main(); 