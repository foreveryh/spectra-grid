# Cloudflare D1 – Initial Setup & Migration Guide

This doc walks you through **one-time setup** of your `photo_meta` database and how to apply the schema from `db/schema.sql`.

---
## 0 · Prerequisites
* Node / Bun installed locally.
* Wrangler CLI ≥ v3 (`npm i -g wrangler@latest` or dev-dep).
* You already created a D1 database in the Cloudflare dashboard named **`photo_meta`** and placed it in the same account as your R2 bucket.

---
## 1 · Authenticate Wrangler
```bash
wrangler login              # opens browser → OAuth → stores creds locally
```
This creates `~/.wrangler/config/default.toml` containing an OAuth token so you **don't** need to store account-wide keys in the repo. CI/CD can use `CLOUDFLARE_API_TOKEN` instead.

---
## 2 · Update `wrangler.toml`
Make sure the D1 section has **database_id** (not database_name!).
```toml
[[d1_databases]]
binding     = "DB"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" # copy from Dashboard → D1 → Overview
```

> Tip:  run `npx wrangler d1 list`  to list all DBs and grab the correct id.

---
## 3 · Apply schema
Run once (or on every deploy if you like idempotency):
```bash
# local dev DB (auto-persisted SQLite)
wrangler d1 execute DB --file db/schema.sql

# production D1 (add --remote)
wrangler d1 execute DB --file db/schema.sql --remote
```
`CREATE TABLE IF NOT EXISTS` makes the command safe to re-run, so it's fine if your CI/CD repeats execution.

> 💡 **TIP** 远程 D1 does not allow explicit `BEGIN TRANSACTION`, so if you write custom scripts to batch insert, ensure you remove `BEGIN/COMMIT` in `--remote` mode (already handled by `scripts/sync-d1.ts`).

---
## 4 · Daily Workflow (incremental images)
1.  `bun run scripts/import.ts ./photos_raw`   # generate meta + thumbs  
2.  `bun run scripts/upload-r2.ts`              # sync originals & thumbs to R2  
3.  `bun run scripts/sync-d1.ts`                # 把 photos.json 增量写入本地 D1  
    `bun run scripts/sync-d1.ts --remote`       # 同步到生产 D1  
4.  `bun run build && wrangler pages deploy ./.next`

---
## 5 · SQL snippets (for scripts)
### Insert new photo
```sql
INSERT INTO photos (
  filename, r2_key, thumb_key,
  dominant_rgb, hue, saturation, lightness,
  is_bw, palette, created_at
) VALUES (?,?,?,?,?,?,?,?,?,?);
```
### Soft-delete
```sql
UPDATE photos SET is_deleted = 1 WHERE id = ?;
```
### Mark as purged after physically deleting from R2
```sql
UPDATE photos SET purged = 1 WHERE id = ?;
```

---
## 6 · Next steps
* `scripts/sync-d1.ts` 已实现增量写入（`INSERT OR IGNORE`）。本地带事务，远程自动去掉事务语句。
* 可加 cron Worker/GitHub Action：定期物理删除 `is_deleted = 1 AND purged = 0` 且 R2 对象已删除的行。 