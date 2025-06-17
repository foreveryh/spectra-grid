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

## Deploying to Cloudflare R2 + D1

```bash
# 0) prerequisites (run once)
wrangler login                                  # OAuth
wrangler d1 execute DB --file db/schema.sql     # --remote for production

# 1) generate metadata & thumbnails
bun run scripts/import.ts ./photos_raw

# 2) upload originals & thumbs to R2
bun run scripts/upload-r2.ts                    # idempotent

# 3) sync metadata to D1
bun run scripts/sync-d1.ts --remote             # local omit --remote

# 4) deploy the static Next.js build
bun run build
wrangler pages deploy ./.next
```

Production runtime fetches data via `/api/photos` (Edge Function, reads D1) while local dev still uses the static `photos.json` fallback.

---

## Deploying to Cloudflare Pages (next-on-pages scheme)

```bash
# 0) 先准备好 R2/D1 数据（同上）

# 1) 构建 Next.js 产物
bun run build

# 2) 用 next-on-pages 导出 Cloudflare Pages 兼容产物
bun run export

# 3) 部署到 Cloudflare Pages
wrangler pages deploy .vercel/output/static
```

This new workflow, based on next-on-pages, produces much smaller output and eliminates the 25 MiB single file limit. It is the recommended way to deploy to Cloudflare Pages.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `bun run dev` | Next.js dev server (rewrites `/api/*` to Wrangler dev if present) |
| `wrangler dev` | Cloudflare Functions & D1/R2 emulator on <http://127.0.0.1:8787> |
| `bun run scripts/import.ts ./photos_raw` | Analyse colours & create thumbnails |
| `bun run scripts/upload-r2.ts` | Incremental upload originals + thumbs to R2 |
| `bun run scripts/sync-d1.ts` | Write `photos.json` records to D1 (add `--remote` for prod) |
| `bun run scripts/purge-deleted.ts` | Nightly purge of soft-deleted objects |

---

## Roadmap
See [`TODO.md`](./TODO.md) and the original [MVP PRD](./mvp_photo_grid_prd_and_skeleton.md) for full backlog & milestones.

## Dependencies

- **@cloudflare/next-on-pages** (devDependencies):
  Enables one-command export of Next.js projects to Cloudflare Pages compatible output, automatically splits Edge Functions, and solves the 25 MiB single file limit.
- **wrangler** (devDependencies):
  Official Cloudflare CLI for deploying to Pages, managing R2/D1 resources, and local Edge Functions debugging.
- **@cloudflare/workers-types**:
  TypeScript type definitions for Cloudflare Workers, ensuring type-safe development.
- Other dependencies such as next, react, sharp, colorthief, exifreader, etc. are required for the core features of the project. 