# Spectra Grid

Infinite, inertia-driven photo grid inspired by Thiings.co.  Built with **Next.js @ Edge**, **Bun** and **Cloudflare R2/D1** but works completely offline for local prototyping.

---

## Features

* Drag / fling to scroll an infinite grid (desktop & mobile)
* Colour-sorted thumbnails for a smooth hue gradient
* Detail page per photo (`/photo/[id]`) with responsive two-column layout
* CLI importer that analyses dominant colours & palette via `colorthief`
* TailwindCSS-powered UI, zero runtime deps

---

## Local development (no R2 required)

1. **Add photos** – drop JPG / PNG files into the `photos_raw/` folder.
2. **Generate metadata** – run:
   ```bash
   bun run scripts/import.ts ./photos_raw
   ```
   This script will:
   * read every image
   * calculate dominant RGB & HSL
   * write `photos.json` with an incremental `id` and `r2_key` that simply points to `/photos_raw/<file>` (served by Next.js static middleware).
3. **Start dev servers**
   ```bash
   bun install          # first time only
   bun run dev          # Next.js (http://localhost:3000)
   # optional: wrangler dev   # if you want Edge Functions locally
   ```
4. Open http://localhost:3000, drag the grid, click a tile → routed to the detail page.

That's it – **no Cloudflare account needed** for local work.

---

## Deploying to Cloudflare

This project is designed to be deployed to Cloudflare Pages, using R2 for object storage and D1 for metadata.

The recommended and tested workflow uses `@cloudflare/next-on-pages` to create a Pages-compatible build.

**Deployment Steps:**

```bash
# 0) One-time setup for your Cloudflare account
wrangler login
wrangler d1 execute DB --file db/schema.sql --remote

# 1) Import local images, generate metadata and thumbnails
bun run scripts/import.ts ./photos_raw

# 2) Upload original images and thumbnails to R2
bun run scripts/upload-r2.ts
bun run scripts/upload-thumbs.ts # If you need to upload only thumbnails

# 3) Sync local metadata from photos.json to the production D1 database
bun run scripts/sync-d1.ts --remote

# 4) Build and deploy the application to Cloudflare Pages
bun run build
bun run export
bun run deploy
```

This process ensures that all assets are correctly uploaded and the Next.js application is properly adapted for the Cloudflare Edge environment.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `bun run scripts/sync-all.ts` | 一键同步所有图片、缩略图和数据库 |
| `bun run dev` | Next.js dev server (rewrites `/api/*` to Wrangler dev if present) |
| `wrangler dev` | Cloudflare Functions & D1/R2 emulator on <http://127.0.0.1:8787> |
| `bun run scripts/import.ts ./photos_raw` | Analyse colours & create thumbnails |
| `bun run scripts/upload-r2.ts` | Incremental upload originals to R2 |
| `bun run scripts/upload-thumbs.ts` | Incremental upload thumbnails to R2 |
| `bun run scripts/sync-d1.ts` | Write `photos.json` records to D1 (add `--remote` for prod) |
| `bun run scripts/purge-deleted.ts` | Nightly purge of soft-deleted objects |
| `bun run build` | Builds the Next.js application for production |
| `bun run export` | Exports the build to a Cloudflare Pages compatible format |
| `bun run deploy` | Deploys the application to Cloudflare Pages |

---

## Roadmap
See [`TODO`](./docs/TODO.md) and the original [MVP PRD](./docs/mvp_photo_grid_prd_and_skeleton.md) for the full backlog and milestones.

## Dependencies

- **@cloudflare/next-on-pages** (devDependencies):
  Enables one-command export of Next.js projects to Cloudflare Pages compatible output, automatically splits Edge Functions, and solves the 25 MiB single file limit.
- **wrangler** (devDependencies):
  Official Cloudflare CLI for deploying to Pages, managing R2/D1 resources, and local Edge Functions debugging.
- **@cloudflare/workers-types**:
  TypeScript type definitions for Cloudflare Workers, ensuring type-safe development.
- Other dependencies such as next, react, sharp, colorthief, exifreader, etc. are required for the core features of the project.

## Documentation

- [Cloudfare D1 Setup](./docs/D1_SETUP.md)
- [Cloodfare R1 Setup](./docs/R1_SETUP.md)
- [MVP Product Requirement & Skeleton](./docs/mvp_photo_grid_prd_and_skeleton.md)
- [Reflection (EN)](./docs/reflection_en.md)
- [Reflection (ZH)](./docs/reflection_zh.md)
- [TODO](./docs/TODO.md) 