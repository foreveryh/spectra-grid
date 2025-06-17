#!/usr/bin/env bun
/**
 * sync-d1.ts – incremental import of photos.json into D1 `photos` table
 *
 * Usage:
 *   bun run scripts/sync-d1.ts            # local dev (wrangler dev sqlite)
 *   bun run scripts/sync-d1.ts --remote   # write to production D1
 *   DRY_RUN=1 bun run scripts/sync-d1.ts  # show SQL only
 */

// @ts-ignore bun globals
import { $ } from "bun";
import { promises as fs } from "fs";

interface PhotoJsonRec {
  id?: number;
  filename: string;
  r2_key: string;
  thumb_key: string;
  dominant_rgb: string;
  hue: number;
  saturation: number;
  lightness: number;
  is_bw: number;
  palette?: string;
  created_at: number;
}

function sqlEsc(val: unknown) {
  return String(val ?? "").replace(/'/g, "''");
}

async function main() {
  const args = process.argv.slice(2);
  const remote = args.includes("--remote");
  const dryRun = !!process.env.DRY_RUN;
  let data: PhotoJsonRec[] = [];
  try {
    data = JSON.parse(await fs.readFile("photos.json", "utf8"));
  } catch (e) {
    console.error("photos.json not found or invalid. Run import.ts first.");
    process.exit(1);
  }

  if (data.length === 0) {
    console.log("photos.json empty, nothing to sync.");
    return;
  }

  // Build SQL with INSERT OR IGNORE for idempotency
  const lines: string[] = remote ? [] : ["BEGIN TRANSACTION;"];
  for (const p of data) {
    const vals = [
      `'${sqlEsc(p.filename)}'`,
      `'${sqlEsc(p.r2_key)}'`,
      `'${sqlEsc(p.thumb_key)}'`,
      `'${sqlEsc(p.dominant_rgb)}'`,
      p.hue,
      p.saturation,
      p.lightness,
      p.is_bw ? 1 : 0,
      p.palette ? `'${sqlEsc(p.palette)}'` : "NULL",
      typeof p.created_at === "number" ? p.created_at : Date.now(),
    ];
    lines.push(`INSERT OR IGNORE INTO photos (filename,r2_key,thumb_key,dominant_rgb,hue,saturation,lightness,is_bw,palette,created_at) VALUES (${vals.join(",")});`);
  }
  if (!remote) lines.push("COMMIT;");

  const sql = lines.join("\n");

  if (dryRun) {
    console.log("-- DRY_RUN: showing generated SQL only --\n" + sql);
    return;
  }

  // Write SQL to temp file for wrangler execute
  const tmpPath = `./.tmp_sync_${Date.now()}.sql`;
  await fs.writeFile(tmpPath, sql);

  const wranglerArgs = [
    "d1",
    "execute",
    "DB",
    "--file",
    tmpPath,
    "--yes",
  ];
  if (remote) wranglerArgs.push("--remote");

  console.log(`Executing SQL against D1 (${remote ? "remote" : "local"})...`);
  try {
    await $`wrangler ${wranglerArgs}`;
    console.log("✅ D1 sync complete.");
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}

main(); 