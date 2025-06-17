export const runtime = 'edge';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) return new Response('invalid id', { status: 400 });
  // @ts-ignore env binding provided by CF Pages
  const env = (globalThis as any).env as { DB?: any } | undefined;
  if (!env?.DB) return new Response('DB not bound', { status: 500 });
  try {
    await env.DB.prepare('UPDATE photos SET is_deleted=0 WHERE id=?').bind(id).run();
    return new Response('restored', { status: 200 });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
} 