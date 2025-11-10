import { getDb } from "../../../lib/db";

export async function POST(req: Request, env: any) {
  // expects FormData with file & meta JSON
  const form = await req.formData();
  const file = form.get("file") as File;
  const meta = JSON.parse(form.get("meta") as string);
  const key = `orig/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
  await env.PHOTOS_BUCKET.put(key, file.stream());

  const db = getDb(env) as any;
  await db.execute(
    `INSERT INTO photos (r2_key, dominant_rgb, hue, saturation, lightness, is_bw, palette) VALUES (?,?,?,?,?,?,?)`,
    [key, meta.dominant_rgb, meta.hue, meta.saturation, meta.lightness, meta.is_bw, JSON.stringify(meta.palette)]
  );
  return new Response(JSON.stringify({ ok: true, key }), { status: 201 });
} 