// @ts-ignore – Bun runtime provides `$` but type may be missing in tsconfig
import { $ } from "bun";
import { promises as fs } from "fs";
import path from "path";

const DB_BINDING = "DB";
const THUMBS_DIR = "/Users/peng/Dev/Blog/spectra-grid/public/thumbs";

async function main() {
  console.log("--- Thumbnail Key Fix Script (Local Thumbs) ---");

  // 1. List all thumbnails from the local directory
  console.log(`Listing all files in ${THUMBS_DIR}...`);
  let localThumbFiles: string[] = [];
  try {
    localThumbFiles = await fs.readdir(THUMBS_DIR);
    console.log(`Found ${localThumbFiles.length} thumbnails locally.`);
  } catch (e) {
    console.error(`✗ Failed to read directory ${THUMBS_DIR}.`, e);
    return;
  }

  // 2. Get all photo records from the D1 database
  console.log("Fetching all photo records from D1 database...");
  let dbPhotos: any[] = [];
  try {
    const dbQueryOutput = await $`wrangler d1 execute ${DB_BINDING} --remote --command "SELECT id, filename, thumb_key FROM photos" --json`;
    const parsedResult = JSON.parse(dbQueryOutput.stdout);
    dbPhotos = parsedResult[0]?.results || [];
    console.log(`Found ${dbPhotos.length} photo records in D1.`);
  } catch (e) {
    console.error("✗ Failed to query D1 database.", e);
    return;
  }

  // 3. Find mismatches and prepare SQL updates
  const updatesToRun: { id: number; new_thumb_key: string }[] = [];
  const localThumbMap = new Map(localThumbFiles.map(thumbFile => {
    const timestamp = thumbFile.split('_')[0];
    // The key in R2 includes the 'thumbs/' prefix
    const r2Key = path.join("thumbs", thumbFile);
    return [timestamp, r2Key];
  }));

  for (const photo of dbPhotos) {
    const photoTimestamp = photo.filename.split('_')[0];
    const expectedThumbKey = localThumbMap.get(photoTimestamp);

    if (expectedThumbKey && photo.thumb_key !== expectedThumbKey) {
      updatesToRun.push({ id: photo.id, new_thumb_key: expectedThumbKey });
    }
  }

  if (updatesToRun.length === 0) {
    console.log("\n✅ No mismatches found. Database is already in sync.");
    return;
  }

  // 4. Execute SQL updates
  console.log(`\nFound ${updatesToRun.length} mismatches. Preparing to update D1...`);
  const sqlStatements = updatesToRun.map(update => 
    `UPDATE photos SET thumb_key = '${update.new_thumb_key}' WHERE id = ${update.id};`
  ).join('\n');

  try {
    await $`wrangler d1 execute ${DB_BINDING} --remote --command ${sqlStatements}`;
    console.log("\n✅ Successfully updated all mismatched thumbnail keys in the database.");
  } catch (e) {
    console.error("\n✗ Failed to execute update statements in D1.", e);
    console.log("\nGenerated SQL statements:\n", sqlStatements);
  }
}

main();