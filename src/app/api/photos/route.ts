export const runtime = 'edge';

/**
 * GET /api/photos – production uses D1, dev falls back to photos.json
 */
export async function GET(req: Request) {
  // Try Cloudflare Pages env binding first (available when deployed)
  // @ts-ignore – env is injected by Pages runtime
  const env = (globalThis as any).env as { DB?: any, NEXT_PUBLIC_R2_BASE?: string } | undefined;

  let rows: any[] = [];
  try {
    if (env?.DB) {
      const { results } = await env.DB.prepare(
        'SELECT id,filename,thumb_key,r2_key,dominant_rgb,hue,saturation,lightness,is_bw,palette,created_at\n         FROM photos WHERE is_deleted = 0 AND purged = 0 ORDER BY created_at DESC'
      ).all();
      rows = results;
    } else {
      // Local dev (npm run dev) – fallback to static JSON import
      const { photos } = await import('../../../lib/mockData');
      rows = photos as any[];
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }

  // Determine R2_BASE_URL from env (Pages Functions) or process.env (local Next.js dev)
  const r2BaseUrl = env?.NEXT_PUBLIC_R2_BASE || process.env.NEXT_PUBLIC_R2_BASE;

  let photosToReturn = [];
  if (r2BaseUrl) {
    for (const photo of rows) {
      photosToReturn.push({
        ...photo,
        r2_key: photo.r2_key ? new URL(photo.r2_key, r2BaseUrl).toString() : null,
        thumb_key: photo.thumb_key ? new URL(photo.thumb_key, r2BaseUrl).toString() : null,
      });
    }
  } else {
    photosToReturn = rows;
  }

  return new Response(JSON.stringify(photosToReturn), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
} 