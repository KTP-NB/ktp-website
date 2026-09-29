import { NextResponse } from 'next/server';
import { requireJobBoardUser } from '@/lib/job-board/auth';
import { jsonError, readJson } from '@/lib/job-board/apiResponses';
import { ensureNotificationPreferences } from '@/lib/job-board/notifications';
import { getJobBoardServiceClient } from '@/lib/job-board/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request) {
  const auth = await requireJobBoardUser(request);
  if (auth.error) return auth.error;

  const service = getJobBoardServiceClient();
  const preferences = await ensureNotificationPreferences(service, auth.user.id);
  return NextResponse.json({ preferences });
}

export async function PUT(request) {
  const auth = await requireJobBoardUser(request);
  if (auth.error) return auth.error;

  const body = await readJson(request);
  const allowedDigest = ['none', 'daily', 'weekly'];
  if (body.digest_frequency && !allowedDigest.includes(body.digest_frequency)) {
    return jsonError('Digest frequency is invalid.');
  }

  const service = getJobBoardServiceClient();
  const { data, error } = await service
    .from('job_board_notification_preferences')
    .upsert({
      user_id: auth.user.id,
      in_app_enabled: body.in_app_enabled !== false,
      email_enabled: Boolean(body.email_enabled),
      immediate_notifications_enabled: body.immediate_notifications_enabled !== false,
      recommendation_notifications_enabled: false,
      posted_today_notifications_enabled: body.posted_today_notifications_enabled !== false,
      digest_frequency: body.digest_frequency || 'weekly',
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
      locations: Array.isArray(body.locations) ? body.locations : [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ preferences: data });
}
