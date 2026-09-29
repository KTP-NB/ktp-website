import { NextResponse } from 'next/server';
import { requireJobBoardUser } from '@/lib/job-board/auth';
import { jsonError, readJson } from '@/lib/job-board/apiResponses';
import { logJobBoardEvent } from '@/lib/job-board/events';
import { getJobBoardServiceClient } from '@/lib/job-board/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const ALLOWED_EVENTS = [
  'job_viewed',
  'job_saved',
  'job_unsaved',
  'application_status_updated',
  'application_result_updated',
  'ats_analysis_run',
  'recommendation_clicked',
  'notification_read',
];

export async function POST(request) {
  const auth = await requireJobBoardUser(request);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  if (!ALLOWED_EVENTS.includes(body.eventType)) {
    return jsonError('Event type is invalid.');
  }

  const service = getJobBoardServiceClient();
  await logJobBoardEvent(service, {
    userId: auth.user.id,
    eventType: body.eventType,
    entityType: body.entityType,
    entityId: body.entityId,
    metadata: body.metadata || {},
  });

  return NextResponse.json({ ok: true });
}
