import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = 'edge';

/**
 * GET /api/photo/[id] – 根据 ID 获取单个图片数据
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  let photo: any = null;
  
  try {
    // 尝试获取 Cloudflare 环境
    const { env } = getCloudflareContext();
    const envAny = env as any;

    if (envAny?.DB) {
      // 生产环境：从 D1 数据库查询
      const { results } = await envAny.DB.prepare(
        'SELECT id,filename,thumb_key,r2_key,dominant_rgb,hue,saturation,lightness,is_bw,palette,created_at\n         FROM photos WHERE id = ? AND is_deleted = 0 AND purged = 0'
      ).bind(params.id).all();
      
      if (results && results.length > 0) {
        photo = results[0];
      }
    } else {
      // 本地开发：从 mockData 查询
      const { photos } = await import('../../../../lib/mockData');
      photo = photos.find((p: any) => String(p.id) === params.id);
    }
  } catch (e) {
    // 如果 getCloudflareContext 失败，说明是本地开发环境，直接使用 mockData
    try {
      const { photos } = await import('../../../../lib/mockData');
      photo = photos.find((p: any) => String(p.id) === params.id);
    } catch (mockError) {
      return new Response(JSON.stringify({ error: 'Failed to load photo data' }), { status: 500 });
    }
  }

  if (!photo) {
    return new Response(JSON.stringify({ error: '图片不存在' }), { status: 404 });
  }

  // 处理 R2 URL - 本地开发时使用相对路径
  const r2BaseUrl = process.env.NEXT_PUBLIC_R2_BASE;
  
  if (r2BaseUrl) {
    // 确保 r2_key 包含 photos_raw/ 前缀
    let normalizedR2Key = photo.r2_key;
    if (!normalizedR2Key.startsWith('photos_raw/') && !normalizedR2Key.startsWith('http')) {
      normalizedR2Key = `photos_raw/${normalizedR2Key}`;
    }
    
    photo.r2_key = normalizedR2Key ? new URL(normalizedR2Key, r2BaseUrl).toString() : null;
    photo.thumb_key = photo.thumb_key ? new URL(photo.thumb_key, r2BaseUrl).toString() : null;
  }

  return new Response(JSON.stringify(photo), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
} 