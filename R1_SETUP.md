# Cloudflare R2 – Setup & Workflow Guide

## 0 · Create an R2 Bucket & Bind via Wrangler

Before running any upload script you need a bucket to hold originals & thumbnails.

### 0.1  Create via Cloudflare Dashboard
1.  Open **R2** in your Cloudflare dashboard.
2.  Click **"Create bucket"**, name it for example `photos`.
3.  Leave the bucket public (default) so images are accessible via the **`.r2.dev`** domain.

### 0.2  Or create with CLI
```bash
# bucket name must be globally unique per account
wrangler r2 bucket create photos
```

### 0.3  Add a binding in `wrangler.toml`
```toml
[[r2_buckets]]
binding             = "PHOTOS_BUCKET"   # used in Workers if you need runtime access
bucket_name         = "photos"
preview_bucket_name = "photos-preview"   # optional
```

> **Note**  The static Pages build (`wrangler pages deploy`) cannot access R2 at runtime, but you still need the binding for CLI commands like `wrangler r2 object put`.

### 0.4  Useful bucket commands
```bash
wrangler r2 bucket list                 # list all buckets
wrangler r2 object put  <bucket>/<key> --file ./local/file.ext  --content-type image/avif
```

> ℹ️ Wrangler v4 尚未提供 `r2 object head/list`，脚本已通过"直接上传¬→捕获 412"规避，无需额外操作。

---

> **Scope**  Free-tier R2 only (no Image Resizing add-on). All heavy work—crop, resize, AVIF transcode—is done locally with **sharp** and committed/deployed as static files.

---
## 1 · Overview

| Goal | Approach |
|------|----------|
| 240 × 240 thumbnails | Generated once via `sharp` → saved to `public/thumbs/` or uploaded to `thumbs/` folder in R2. |
| Lightweight format | AVIF (`quality ≈ 50`). Fallback to original JPEG/PNG if browser lacks support (handled by `<picture>`). |
| Stable URLs | Store `thumb_key` and `r2_key` in metadata with unique, hash-based names to ensure immutability. |
| Easy import | `scripts/import.ts` processes only new images and generates unique keys. |

This keeps Cloudflare usage inside the **free storage/egress quota**; no paid Image Resizing or Workers KV needed.

---
## 2 · Step-by-Step

### 2.1 Local script changes (`scripts/import.ts`)
The script intelligently handles both full and incremental runs.
- It reads `photos.json` to see what's already been processed.
- For new files, it generates a unique name (`<timestamp>_<hash>`) for both the original and thumbnail key.
- It creates a 240x240 AVIF thumbnail in `public/thumbs/` if it doesn't already exist.
- It updates `photos.json` with the new records.

**Usage:**
```bash
# Processes any new images in ./photos_raw
bun run scripts/import.ts ./photos_raw
```

### 2.2 Front-end (`PhotoCell.tsx`)
The component should use the `thumb_key` for the `srcSet` in a `<picture>` element to load the AVIF thumbnail.
```tsx
<picture>
  <source srcSet={photo.thumb_key} type="image/avif" />
  <img src={photo.r2_key} ... /> {/* Fallback to original */}
</picture>
```

### 2.3 Upload originals & thumbs to R2 (`scripts/upload-r2.ts`)
```bash
# idempotent, skips objects that already exist
bun run scripts/upload-r2.ts
```

### 2.4 Sync metadata to D1 (`scripts/sync-d1.ts`)
```bash
# local dev DB
bun run scripts/sync-d1.ts
# production DB
bun run scripts/sync-d1.ts --remote
```
The script uses `INSERT OR IGNORE` so it can run safely on every deploy.

### 2.5 Environment variable
Expose bucket base URL to the frontend:
```bash
NEXT_PUBLIC_R2_BASE=https://<ACCOUNT_ID>.r2.dev/
```

### 2.6 README additions
- Mention `sharp` dependency.
- Update "Local dev" section to reflect the `import` -> `upload` workflow.

# (已完成) 进一步改进
* `scripts/purge-deleted.ts` 可配合 GitHub Action 进行夜间清理。

---
## 3 · TODO (add to project `TODO.md`)
- [x] **import.ts** – integrate `sharp`; write `thumb_key` with unique names; handle incremental runs.
- [x] **package.json** – add `sharp` as a dependency.
- [x] **PhotoCell** – switch to `thumb_key` & use `<picture>` fallback.
- [x] **Upload script** – Create `scripts/upload-r2.ts` to sync files to R2 based on `photos.json`.
- [x] **README** – document new workflow.
- [x] **D1 Sync Script** - Create a script to sync `photos.json` to the D1 database.
- [ ] Optional: Add `--concurrency` flag to upload script for performance.

---
## 4 · Why not CF Image Resizing?
* It's a paid feature.
* Local one-off processing with `sharp` keeps infra cost at **$0** while giving full control over quality and format.

---
## 5 · Advanced considerations & common pitfalls

### 5.1 MIME-Type headers in R2
When you upload via `wrangler r2 object put`, Wrangler tries to infer `Content-Type`.
* `.avif` is sometimes sent as `application/octet-stream` → Safari < 16 will refuse to display.
* Explicitly pass `--content-type image/avif` for thumbnails:
  ```bash
  wrangler r2 object put thumbs/foo_240.avif \
    --file ./public/thumbs/foo_240.avif \
    --content-type image/avif
  ```

### 5.2 Browser fallback strategy
`<picture>` fallback order example:
```tsx
<picture>
  <source srcSet={photo.thumb_key} type="image/avif" />
  <source srcSet={photo.thumb_key.replace(/\.avif$/, '.webp')} type="image/webp" />
  <img src={photo.thumb_key.replace(/\.avif$/, '.jpg')} loading="lazy" />
</picture>
```
You may generate WebP + JPEG in `import.ts` by adding another `sharp()` call.

### 5.3 Name collisions & caching
* Use a **hash** of the original file (`sha1`) as base name to avoid duplicate uploads:
  ```ts
  const hash = createHash('sha1').update(await fs.readFile(fp)).digest('hex').slice(0,12);
  const thumbName = `${hash}_240.avif`;
  ```
* This ensures immutable URLs → safe long-term CDN caching.

### 5.4 Large batches & concurrency
`sharp` is CPU-bound; for thousands of photos use a concurrency limit:
```ts
import pMap from 'p-map';
await pMap(files, async f => { /* sharp work */ }, { concurrency: 4 });
```

### 5.5 Storage cost estimate (R2 free tier)
| Item | Size (≈) | Count | Total |
|------|----------|-------|-------|
| Original JPEG | 1 MB | 1 000 | 1 GB |
| AVIF 240 | 20 KB | 1 000 | 20 MB |
Free tier includes **10 GB** → plenty of headroom.

### 5.6 Deleting objects
Soft-delete via DB flag only.  When you _purge_:
```bash
wrangler r2 object delete photos_raw/<key>
wrangler r2 object delete thumbs/<key>_240.avif
```
Consider a nightly script that reads `is_deleted=1 AND purged=0` and removes both versions, then marks `purged=1`.

### 5.7 CI/CD automation
Add to **GitHub Actions**:
```yaml
- name: Generate thumbnails
  run: bun run scripts/import.ts ./photos_raw --generate-only
- name: Upload to R2
  run: bun run scripts/upload-r2.ts public/thumbs photos_raw
```

---
## 6 · FAQ
**Q:** _Why not generate multiple sizes?_  
**A:** AVIF at 240 px looks good when up-scaled via device pixel ratio; if you need retina fidelity, also make 480 px versions and use `srcSet`.

**Q:** _How to handle EXIF rotation?_  
**A:** Add `.rotate()` before `.resize()` in sharp pipeline to respect orientation.

**Q:** _Can I run import script inside Wrangler?_  
**A:** Yes, but not recommended—sharp is heavy. Keep it local CI/CLI.