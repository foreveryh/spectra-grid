// @ts-ignore 
import { promises as fs } from "fs";

async function main() {
  console.log("--- Generating Full SQL Sync Script ---");

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

  // 2. Generate SQL statements
  const sqlStatements = photos.map(photo => 
    `UPDATE photos SET thumb_key = '${photo.thumb_key}' WHERE id = ${photo.id};`
  ).join('\n');

  // 3. Write to sync.sql file
  try {
    await fs.writeFile("sync.sql", sqlStatements);
    console.log("\n✅ Successfully generated sync.sql file.");
    console.log("You can now run the following command to sync your database:");
    console.log("wrangler d1 execute DB --remote --file=./sync.sql");
  } catch (e) {
    console.error("\n✗ Failed to write sync.sql file.", e);
  }
}

main();
