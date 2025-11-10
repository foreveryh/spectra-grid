import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = 'edge';

/**
 * GET /api/photos – production uses D1, dev falls back to photos.json
 */
export async function GET(req: Request) {
  // 日志输出，方便线上调试
  // @ts-ignore
  console.log('globalThis.env:', typeof globalThis.env, globalThis.env);
  // @ts-ignore
  console.log('process.env:', typeof process !== 'undefined' ? process.env : 'process undefined');

  // 解析查询参数
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = (page - 1) * limit;

  let rows: any[] = [];
  let totalCount = 0;
  
  try {
    // 尝试获取 Cloudflare 环境
    const { env } = getCloudflareContext();
    const envAny = env as any;

    if (envAny?.DB) {
      // 生产环境：从 D1 数据库查询
      // 获取总数
      const { results: countResults } = await envAny.DB.prepare(
        'SELECT COUNT(*) as count FROM photos WHERE is_deleted = 0 AND purged = 0'
      ).all();
      totalCount = countResults[0].count;

      // 获取分页数据
      const { results } = await envAny.DB.prepare(
        'SELECT id,filename,thumb_key,r2_key,dominant_rgb,hue,saturation,lightness,is_bw,palette,created_at\n         FROM photos WHERE is_deleted = 0 AND purged = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?'
      ).bind(limit, offset).all();
      rows = results;
    } else {
      // 本地开发：从 mockData 查询
      const { photos } = await import('../../../lib/mockData');
      totalCount = photos.length;
      rows = photos.slice(offset, offset + limit) as any[];
    }
  } catch (e) {
    // 如果 getCloudflareContext 失败，说明是本地开发环境，直接使用 mockData
    try {
      const { photos } = await import('../../../lib/mockData');
      totalCount = photos.length;
      rows = photos.slice(offset, offset + limit) as any[];
    } catch (mockError) {
      return new Response(JSON.stringify({ error: 'Failed to load photo data' }), { status: 500 });
    }
  }

  // Determine R2_BASE_URL from env (Pages Functions) or process.env (local Next.js dev)
  const r2BaseUrl = process.env.NEXT_PUBLIC_R2_BASE;

  let photosToReturn = [];
  if (r2BaseUrl) {
    for (const photo of rows) {
      // 确保 r2_key 包含 photos_raw/ 前缀
      let normalizedR2Key = photo.r2_key;
      if (!normalizedR2Key.startsWith('photos_raw/') && !normalizedR2Key.startsWith('http')) {
        normalizedR2Key = `photos_raw/${normalizedR2Key}`;
      }
      
      photosToReturn.push({
        ...photo,
        r2_key: normalizedR2Key ? new URL(normalizedR2Key, r2BaseUrl).toString() : null,
        thumb_key: photo.thumb_key ? new URL(photo.thumb_key, r2BaseUrl).toString() : null,
      });
    }
  } else {
    photosToReturn = rows;
  }

  return new Response(JSON.stringify({
    photos: photosToReturn,
    pagination: {
      page,
      limit,
      total: totalCount,
      hasMore: offset + limit < totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
} 