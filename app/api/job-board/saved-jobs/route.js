import { NextResponse } from 'next/server';
import { requireJobBoardUser } from '@/lib/job-board/auth';
import { getJobBoardServiceClient } from '@/lib/job-board/supabaseServer';
import { jsonError, readJson } from '@/lib/job-board/apiResponses';
import { logJobBoardEvent } from '@/lib/job-board/events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request) {
  const auth = await requireJobBoardUser(request);
  if (auth.error) return auth.error;

  const service = getJobBoardServiceClient();
  const { data, error } = await service
    .from('job_board_saved_jobs')
    .select('id, job_id, notes, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ savedJobs: data || [] });
}

export async function POST(request) {
  const auth = await requireJobBoardUser(request);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  if (!body.jobId) return jsonError('jobId is required.');

  const service = getJobBoardServiceClient();
  const { data, error } = await service
    .from('job_board_saved_jobs')
    .upsert({
      user_id: auth.user.id,
      job_id: body.jobId,
      notes: body.notes || null,
    }, { onConflict: 'user_id,job_id' })
    .select('*')
    .single();

  if (error) return jsonError(error.message, 500);
  await logJobBoardEvent(service, {
    userId: auth.user.id,
    eventType: 'job_saved',
    entityType: 'job',
    entityId: body.jobId,
  });
  return NextResponse.json({ savedJob: data });
}

export async function DELETE(request) {
  const auth = await requireJobBoardUser(request);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  if (!body.jobId) return jsonError('jobId is required.');

  const service = getJobBoardServiceClient();
  const { error } = await service
    .from('job_board_saved_jobs')
    .delete()
    .eq('user_id', auth.user.id)
    .eq('job_id', body.jobId);

  if (error) return jsonError(error.message, 500);
  await logJobBoardEvent(service, {
    userId: auth.user.id,
    eventType: 'job_unsaved',
    entityType: 'job',
    entityId: body.jobId,
  });
  return NextResponse.json({ ok: true });
}
