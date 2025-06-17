export const runtime = 'edge';

/**
 * GET /api/photos – production uses D1, dev falls back to photos.json
 */
export async function GET(req: Request) {
  // Try Cloudflare Pages env binding first (available when deployed)
  // @ts-ignore – env is injected by Pages runtime
  const env = (globalThis as any).env as { DB?: any } | undefined;

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

  return new Response(JSON.stringify(rows), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
} 