// @ts-ignore – Bun runtime provides `$` but type may be missing in tsconfig
import { $ } from "bun";
import { promises as fs } from "fs";

async function main() {
  console.log("--- Generating Delete Script ---");

  let photos = [];
  try {
    photos = JSON.parse(await fs.readFile("photos.json", "utf8"));
  } catch {
    console.error("Error: photos.json not found. Please run the import script first.");
    return;
  }

  const deleteCommands = photos.map(photo => `wrangler r2 object delete photos/${photo.thumb_key}`);

  await fs.writeFile("delete-thumbs.sh", deleteCommands.join('\n'));
  console.log("✅ Successfully generated delete-thumbs.sh");
}

main();

