#!/usr/bin/env bun
// Purge R2 objects & mark purged=1 for rows where is_deleted=1 and purged=0
// Usage: bun run scripts/purge-deleted.ts [--remote]

// @ts-ignore Bun global
import { $ } from 'bun';
import { promises as fs } from 'fs';

async function main() {
  const remote = process.argv.includes('--remote');
  const selectSQL = `SELECT id,r2_key,thumb_key FROM photos WHERE is_deleted=1 AND purged=0 LIMIT 1000;`;
  const rowsJson = await $`wrangler d1 execute DB ${remote ? '--remote' : ''} --command ${selectSQL} --json`.text();
  const rows = JSON.parse(rowsJson)[0]?.results as any[];
  if (!rows?.length) {
    console.log('Nothing to purge.');
    return;
  }
  const bucket = process.env.R2_BUCKET ?? 'photos';
  for (const r of rows) {
    const orig = `${bucket}/${r.r2_key}`;
    const thumb = `${bucket}/${r.thumb_key}`;
    await $`wrangler r2 object delete ${orig} --yes`.quiet();
    await $`wrangler r2 object delete ${thumb} --yes`.quiet();
    await $`wrangler d1 execute DB ${remote ? '--remote' : ''} --command ${`UPDATE photos SET purged=1 WHERE id=${r.id};`}`.quiet();
    console.log(`Purged ${r.id}`);
  }
}

main(); 