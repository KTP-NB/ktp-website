import { NextResponse } from 'next/server';
import { requireJobBoardUser } from '@/lib/job-board/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request) {
  const auth = await requireJobBoardUser(request);
  if (auth.error) return auth.error;

  return NextResponse.json({
    ok: true,
    userId: auth.user.id,
  });
}
