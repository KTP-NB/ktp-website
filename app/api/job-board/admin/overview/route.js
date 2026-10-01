import { NextResponse } from 'next/server';
import { requireJobBoardAdmin } from '@/lib/job-board/auth';
import { analyticsSummary } from '@/lib/job-board/events';
import { jsonError } from '@/lib/job-board/apiResponses';
import { getJobBoardServiceClient } from '@/lib/job-board/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request) {
  const auth = await requireJobBoardAdmin(request);
  if (auth.error) return auth.error;

  try {
    const service = getJobBoardServiceClient();
    const [jobs, saved, apps, notifications, scraperRuns, ingestionRuns, logs, analytics] = await Promise.all([
      service.from('job_board_jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      service.from('job_board_saved_jobs').select('id', { count: 'exact', head: true }),
      service.from('internship_applications').select('id', { count: 'exact', head: true }),
      service.from('job_board_notifications').select('id', { count: 'exact', head: true }),
      service.from('job_board_scraper_runs').select('*').order('created_at', { ascending: false }).limit(5),
      service.from('job_board_ingestion_runs').select('*').order('created_at', { ascending: false }).limit(5),
      service.from('job_board_notification_logs').select('*').order('created_at', { ascending: false }).limit(5),
      analyticsSummary(service),
    ]);

    for (const result of [jobs, saved, apps, notifications, scraperRuns, ingestionRuns, logs]) {
      if (result.error) throw result.error;
    }

    return NextResponse.json({
      counts: {
        openJobs: jobs.count || 0,
        savedJobs: saved.count || 0,
        applications: apps.count || 0,
        notifications: notifications.count || 0,
      },
      scraperRuns: scraperRuns.data || [],
      ingestionRuns: ingestionRuns.data || [],
      notificationLogs: logs.data || [],
      analytics,
    });
  } catch (error) {
    return jsonError(error.message || 'Unable to load admin overview.', 500);
  }
}
