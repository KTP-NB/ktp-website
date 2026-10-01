import { NextResponse } from 'next/server';
import { requireJobBoardAdmin } from '@/lib/job-board/auth';
import { jsonError, readJson } from '@/lib/job-board/apiResponses';
import { runInternListIngestion } from '@/lib/job-board/ingestion/internList/runInternListIngestion';
import { getJobBoardServiceClient } from '@/lib/job-board/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(request) {
  const auth = await requireJobBoardAdmin(request);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  try {
    const summary = await runInternListIngestion({
      service: getJobBoardServiceClient(),
      sourceId: body.sourceId || null,
      provider: body.provider === 'new_grad_jobs' ? 'new_grad_jobs' : 'intern_list',
    });
    return NextResponse.json({ summary });
  } catch (error) {
    return jsonError(error.message || 'Airtable ingestion failed.', error.status || 500);
  }
}
