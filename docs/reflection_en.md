# Project Reflection

_Last updated: 2025-06-17_

## 1. Background & Goals
Spectra Grid started as an experiment to recreate the **Thiings** hue-sorted infinite photo wall while learning the modern Cloudflare stack.  The initial MVP aimed to:

1. Display ≈1 000 model photos in a draggable grid that feels instantly responsive on desktop & mobile.
2. Run 100 % serverless on Cloudflare Pages + Functions, with assets in **R2** and metadata in **D1**.
3. Keep local prototyping smooth and fully offline by falling back to static `photos.json`.

Success criteria were a first paint < 1 s (Edge cache warm) and an import pipeline that could ingest 1 000 images in < 30 s locally.

---
## 2. Key Technical Decisions
| Area | Decision | Rationale |
|------|----------|-----------|
| Runtime | **Next.js 14 `app/` @ Edge** running on **Bun** | Next's React 18 features + Edge-optimised server components, while Bun gives fast TS/ESM & single-runtime scripts. |
| Deployment | **next-on-pages** + `wrangler pages deploy` | Solved Cloudflare Pages' 25 MiB single-file limit and produced ~1 MiB Edge Functions. |
| Image processing | Local **sharp** + CLI | Keeps R2 usage in free tier, no paid Image Resizing, deterministic AVIF thumbs. |
| Colour analysis | **colorthief** (+ optional EXIF via exifreader) | Lightweight JS libs to avoid Python/OpenCV deps. |
| Data | **R2** for originals/thumbs, **D1** for metadata | Native CF products, no external DB. |
| Auth / Payments | Plan to integrate **Rownd** (password-less auth & payments) | Off-the-shelf solution that matches serverless model and reduces maintenance (see Next Steps). |

---
## 3. Major Challenges & Solutions

1. **Interactive Grid Experience**  
   Designing a hue-sorted, inertia-driven grid that stays at 60 fps while keeping URL state and click-through navigation intact.  *Solution:* debounced drag events, CSS `will-change`, and Next router prefetch for detail pages.

2. **End-to-End Asset Pipeline**  
   Creating a one-command flow to import hundreds of local images, generate AVIF thumbnails, compute colour metadata, upload to R2, and sync records to D1.  *Solution:* a trio of Bun scripts (`import` → `upload-r2` → `sync-d1`) with idempotent logic and hash-based keys.

3. **First-Time Use of R2 & D1**  
   Learning quirks such as missing `head/list` in R2 and no remote transactions in D1.  *Solution:* catch-412 upload pattern for R2 and automatic transaction stripping for remote D1 scripts.

4. **Deploying on Cloudflare Pages**  
   Hitting the 25 MiB single-file limit and Node built-in shims.  *Solution:* switched to **next-on-pages** and enabled the `nodejs_compat` flag, reducing the Edge bundle to < 1 MiB per function.

---
## 4. Achievements (so far)
* MVP grid & detail page functioning at 60 fps on M2 / iPhone 13.
* Fully automated **import → upload → sync → deploy** pipeline via Bun scripts + Wrangler.
* Edge function bundle shrunk from 26.9 MiB → 740 KiB total across 11 modules.
* README refactored, dependence list documented; CI-friendly build + export commands.
* Documentation re-organised (`docs/`), bilingual reflection templates added.

---
## 5. Improvements & Risks
* **Data source unification** – Grid still uses static JSON in dev; needs runtime `/api/photos` in prod.
* **Soft-delete UI** – API exists, but admin buttons & optimistic updates pending.
* **Large batch uploads** – `sharp` is CPU-bound; concurrency flag + progress bar remain TODO.
* **Testing** – No automated tests yet (Vitest / Bun test planned).
* **Dependency drift** – Keeping up with Next 15/Bun stable may require periodic refactor.

---
## 6. Next Steps (next 1-2 weeks)
1. **Authentication & Payments**  
   Evaluate [Rownd](https://rownd.com/) SDK for password-less sign-in and subscription payments.  The goal is to:
   * Gate high-res downloads behind an authenticated tier.
   * Offload privacy, T&C, and payment compliance to Rownd's managed flows.
2. **Privacy & Legal Pages**  
   Auto-generate Privacy Policy & Terms via Rownd or static Markdown pages.
3. **Data API Consolidation**  
   Ship `/api/photos` Edge Function and migrate front-end fetching logic.
4. **Soft-Delete UI polish**  
   Add admin-only Delete/Restore buttons, reflect state in grid instantly.
5. **Observability**  
   Integrate Lighthouse CI budget + Cloudflare Analytics dashboards.

Progress on these items will be captured in future UPDATE entries of the PRD and detailed retros in this reflection. 