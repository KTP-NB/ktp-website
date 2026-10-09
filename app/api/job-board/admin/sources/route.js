import { NextResponse } from 'next/server';
import { requireJobBoardAdmin } from '@/lib/job-board/auth';
import { jsonError, readJson } from '@/lib/job-board/apiResponses';
import { getJobBoardServiceClient } from '@/lib/job-board/supabaseServer';
import { createGithubSourceRow, JOB_SOURCE_PROVIDERS } from '@/lib/job-board/ingestion/github/sourceRegistry';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request) {
  const auth = await requireJobBoardAdmin(request);
  if (auth.error) return auth.error;

  const service = getJobBoardServiceClient();
  const provider = request.nextUrl.searchParams.get('provider');
  if (provider && !JOB_SOURCE_PROVIDERS.includes(provider)) {
    return jsonError('provider is invalid.');
  }

  let query = service
    .from('job_board_sources')
    .select('*');

  if (provider) query = query.eq('provider', provider);

  const { data, error } = await query
    .order('priority', { ascending: true })
    .order('source_name', { ascending: true });

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ sources: data || [] });
}

export async function PATCH(request) {
  const auth = await requireJobBoardAdmin(request);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  if (!body.sourceId) return jsonError('sourceId is required.');
  if (typeof body.enabled !== 'boolean') return jsonError('enabled boolean is required.');

  const service = getJobBoardServiceClient();
  const { data, error } = await service
    .from('job_board_sources')
    .update({ enabled: body.enabled, updated_at: new Date().toISOString() })
    .eq('id', body.sourceId)
    .select('*')
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ source: data });
}

export async function POST(request) {
  const auth = await requireJobBoardAdmin(request);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  let sourceRow;
  try {
    sourceRow = createGithubSourceRow(body);
  } catch (error) {
    return jsonError(error.message);
  }

  const service = getJobBoardServiceClient();
  const { data, error } = await service.from('job_board_sources').insert(sourceRow).select('*').single();
  if (error?.code === '23505') return jsonError('This source already exists.', 409);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ source: data }, { status: 201 });
}
