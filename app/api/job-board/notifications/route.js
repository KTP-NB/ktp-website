import { NextResponse } from 'next/server';
import { requireJobBoardUser } from '@/lib/job-board/auth';
import { jsonError, readJson } from '@/lib/job-board/apiResponses';
import { getJobBoardServiceClient } from '@/lib/job-board/supabaseServer';
import { logJobBoardEvent } from '@/lib/job-board/events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request) {
  const auth = await requireJobBoardUser(request);
  if (auth.error) return auth.error;

  const service = getJobBoardServiceClient();
  const { data, error } = await service
    .from('job_board_notifications')
    .select('*, job_board_jobs ( id, title, company )')
    .eq('user_id', auth.user.id)
    .neq('type', 'recommendation')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({
    notifications: data || [],
    unreadCount: (data || []).filter((item) => !item.read_at).length,
  });
}

export async function PATCH(request) {
  const auth = await requireJobBoardUser(request);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  const service = getJobBoardServiceClient();
  let query = service
    .from('job_board_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', auth.user.id);

  if (body.notificationId) {
    query = query.eq('id', body.notificationId);
  } else if (!body.markAllRead) {
    return jsonError('notificationId or markAllRead is required.');
  }

  const { error } = await query;
  if (error) return jsonError(error.message, 500);

  await logJobBoardEvent(service, {
    userId: auth.user.id,
    eventType: 'notification_read',
    entityType: 'notification',
    entityId: body.notificationId || null,
    metadata: { mark_all_read: Boolean(body.markAllRead) },
  });

  return NextResponse.json({ ok: true });
}
