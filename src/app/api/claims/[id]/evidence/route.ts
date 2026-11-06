import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/security';
import { mediaRoot } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

/**
 * Claim evidence file — served ONLY to staff sessions (OWNER/ADMIN/MANAGER/PACKING/SUPPORT).
 * Anyone else gets 403; missing claims/files get 404.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(req, ['orders', 'inbox']);
  if ('error' in staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const claim = await db.claim.findUnique({ where: { id } });
  if (!claim || !claim.evidencePath) {
    return NextResponse.json({ error: 'No evidence file for this claim' }, { status: 404 });
  }

  const claimsDir = path.join(mediaRoot(), 'claims');
  const filePath = path.join(claimsDir, path.basename(claim.evidencePath));
  if (!filePath.startsWith(claimsDir + path.sep)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Evidence file not found on disk' }, { status: 404 });
  }
}
