#!/usr/bin/env bun

/**
 * 一键同步脚本：
 * 1. 生成/更新 photos.json 和缩略图
 * 2. 上传大图到 R2
 * 3. 上传缩略图到 R2
 * 4. 同步 photos.json 到 D1 数据库
 */

const { $ } = Bun;

async function main() {
  console.log("\n=== 1. 生成/更新 photos.json 和缩略图 ===");
  await $`bun run scripts/import.ts ./photos_raw`;

  console.log("\n=== 2. 上传大图到 R2 ===");
  await $`bun run scripts/upload-photos.ts`;

  console.log("\n=== 3. 上传缩略图到 R2 ===");
  await $`bun run scripts/upload-thumbs.ts`;

  console.log("\n=== 4. 同步 photos.json 到 D1 数据库 ===");
  await $`bun run scripts/sync-d1.ts --remote`;

  console.log("\n🎉 一键同步完成！");
}

main(); 