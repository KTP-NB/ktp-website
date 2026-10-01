import { NextResponse } from 'next/server';
import { requireJobBoardAdmin } from '@/lib/job-board/auth';
import { jsonError, readJson } from '@/lib/job-board/apiResponses';
import { archiveJobPostings } from '@/lib/job-board/adminJobs';
import { getJobBoardServiceClient } from '@/lib/job-board/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(request) {
  const auth = await requireJobBoardAdmin(request);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  if (body.confirm !== 'archive-job-postings') {
    return jsonError('Confirmation token is required.');
  }

  try {
    const result = await archiveJobPostings(getJobBoardServiceClient());
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error.message || 'Unable to clear job postings.', 500);
  }
}
