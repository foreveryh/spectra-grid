# Project TODOs

## High Priority (before MVP release)
- [x] R2 / D1 incremental pipeline scripts
  - [x] `import.ts` generates thumbnails + `photos.json`
  - [x] `upload-r2.ts` skips objects that already exist
  - [x] `sync-d1.ts` writes to local & remote D1
- [ ] Front-end unified data source
  - [ ] Use `/api/photos` for the Grid component (production)
  - [ ] Detail page fetches palette / metadata from D1
- [ ] Soft-delete flow
  - [x] `POST /api/photo/[id]/delete` / `restore`
  - [ ] Delete / Restore buttons in Grid & Detail pages (dev/admin only)
- [ ] Error & loading states
  - [ ] Placeholder for failed image loads
  - [ ] Lazy-loading skeleton / spinner
- [ ] SEO / Meta
  - [ ] `og:image`, title, description generation

## Medium Priority (optimisation & automation)
- [ ] Nightly cleanup CI
  - [x] `purge-deleted.ts` removes R2 objects + sets `purged`
  - [ ] GitHub Action scheduled at `0 4 * * *`
- [ ] Image compression / multiple sizes
  - [ ] Generate 480 px `@2x` AVIF & WebP, use `srcSet`
- [ ] Upload script concurrency & progress
  - [ ] `--concurrency` flag (defaults to CPU cores)
  - [ ] CLI progress bar
- [ ] Data flow documentation (`docs/data-flow.md`)
  - [ ] ER diagram + sequence diagram
  - [ ] API contract (OpenAPI)

## Low Priority (quality assurance)
- [ ] Tests
  - [ ] Front-end component unit tests (Vitest + Testing Library)
  - [ ] Script e2e tests (Bun test)
- [ ] Performance monitoring
  - [ ] Lighthouse CI budget
  - [ ] Cloudflare Analytics integration
- [ ] Documentation
  - [x] R2 & D1 Setup Guides
  - [ ] Developer Contribution Guide (`CONTRIBUTING.md`)
  - [ ] Complete API Reference 