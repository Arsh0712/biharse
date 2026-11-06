import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { mediaRoot } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/**
 * GET /api/media/products/<file> — public product-image serving.
 * Serves ONLY files under the uploads root — db/uploads/** locally,
 * /tmp/biharse-uploads/** on Vercel (path traversal denied);
 * immutable 1-year caching + weak ETag with 304 support.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  if (!Array.isArray(segments) || segments.length === 0 || segments.some((s) => !s || s === '.' || s === '..')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const root = mediaRoot();
  const filePath = path.resolve(root, ...segments);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) return NextResponse.json({ error: 'Unsupported media type' }, { status: 404 });

  let data: Buffer;
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error('not a file');
    data = await fs.readFile(filePath);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const etag = `"${stat.size.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}-${crypto.createHash('md5').update(filePath).digest('hex').slice(0, 8)}"`;
  if (req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'public, max-age=31536000, immutable' } });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': mime,
      'Content-Length': String(data.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
    },
  });
}
