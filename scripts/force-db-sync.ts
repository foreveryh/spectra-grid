// @ts-ignore – Bun runtime provides `$` but type may be missing in tsconfig
import { $ } from "bun";
import { promises as fs } from "fs";

const DB_BINDING = "DB";

async function main() {
  console.log("--- Force Database Sync Script ---");

  // 1. Read the photos.json file
  console.log("Reading photos.json...");
  let photos = [];
  try {
    photos = JSON.parse(await fs.readFile("photos.json", "utf8"));
    console.log(`Found ${photos.length} records in photos.json.`);
  } catch (e) {
    console.error("✗ Failed to read photos.json.", e);
    return;
  }

  // 2. Generate and execute an update for each record
  console.log("\nPreparing to update D1 database records one by one...");
  for (const photo of photos) {
    if (!photo.id || !photo.thumb_key) {
      console.warn(`- Skipping record with missing id or thumb_key: ${JSON.stringify(photo)}`);
      continue;
    }

    const sql = `UPDATE photos SET thumb_key = '${photo.thumb_key}' WHERE id = ${photo.id};`;
    console.log(`Executing: ${sql}`);
    try {
      await $`wrangler d1 execute ${DB_BINDING} --remote --command ${sql}`;
    } catch (e) {
      console.error(`✗ Failed to update record for ID ${photo.id}.`, e);
    }
  }

  console.log("\n✅ Database sync process complete.");
}

main();
