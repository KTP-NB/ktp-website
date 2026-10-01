import { NextResponse } from 'next/server';
import { requireJobBoardAdmin } from '@/lib/job-board/auth';
import { jsonError, readJson } from '@/lib/job-board/apiResponses';
import { runGithubIngestion } from '@/lib/job-board/ingestion/github/runGithubIngestion';
import { invokeGithubIngestionEdge } from '@/lib/job-board/ingestion/github/edgeAdminProxy';
import { getJobBoardServiceClient } from '@/lib/job-board/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(request) {
  const auth = await requireJobBoardAdmin(request);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  if (!body.sourceId) return jsonError('Choose one GitHub source to run.');
  try {
    const summary = auth.devAdmin
      ? await runGithubIngestion({ service: getJobBoardServiceClient(), sourceId: body.sourceId })
      : await invokeGithubIngestionEdge({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        accessToken: auth.token,
        sourceId: body.sourceId,
        provider: body.provider,
      });
    return NextResponse.json({ summary });
  } catch (error) {
    return jsonError(error.message || 'GitHub ingestion failed.', error.status || 500);
  }
}
