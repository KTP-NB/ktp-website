import { NextResponse } from 'next/server';
import { requireJobBoardAdmin } from '@/lib/job-board/auth';
import { jsonError } from '@/lib/job-board/apiResponses';
import { generateDigestNotifications } from '@/lib/job-board/notifications';
import { getJobBoardServiceClient } from '@/lib/job-board/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(request) {
  const auth = await requireJobBoardAdmin(request);
  if (auth.error) return auth.error;

  try {
    const result = await generateDigestNotifications(getJobBoardServiceClient());
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error.message || 'Unable to generate digest.', 500);
  }
}
