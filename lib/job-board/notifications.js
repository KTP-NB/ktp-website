import { digestPeriod, digestSummary, hasDigestContent, selectDigestContent } from './digestContent.js';
import { matchTrackedApplicationsToJobs } from './recommendations.js';

export async function ensureNotificationPreferences(service, userId) {
  const { data, error } = await service
    .from('job_board_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const { data: created, error: createError } = await service
    .from('job_board_notification_preferences')
    .insert({ user_id: userId })
    .select('*')
    .single();
  if (createError) throw createError;
  return created;
}

export async function createInAppNotification(service, { userId, jobId, recommendationId, type, title, message, metadata }) {
  const prefs = await ensureNotificationPreferences(service, userId);
  if (!prefs.in_app_enabled) {
    return null;
  }

  const { data, error } = await service
    .from('job_board_notifications')
    .insert({
      user_id: userId,
      job_id: jobId || null,
      recommendation_id: recommendationId || null,
      type,
      title,
      message,
      status: 'in_app_delivered',
      metadata: metadata || {},
    })
    .select('*')
    .single();
  if (error) throw error;

  return data;
}

export async function generateDigestNotifications(service, { now = new Date(), shard = null } = {}) {
  const { data: users, error: usersError } = await service
    .from('member_profiles')
    .select('user_id')
    .not('user_id', 'is', null)
    .order('user_id');
  if (usersError) throw usersError;

  const cycleDate = new Date(now);
  const recentSince = new Date(cycleDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentJobs, error: jobsError } = await service
    .from('job_board_jobs')
    .select('id, title, company, created_at, status, apply_url')
    .eq('status', 'open')
    .gte('created_at', recentSince)
    .order('created_at', { ascending: false })
    .limit(100);
  if (jobsError) throw jobsError;

  let generated = 0;
  let queued = 0;
  const recipients = (users || []).filter((user, index) => !shard || index % shard.count === shard.index);
  for (const user of recipients) {
    const prefs = await ensureNotificationPreferences(service, user.user_id);
    const datePeriod = digestPeriod(cycleDate, prefs.digest_frequency);
    const period = datePeriod ? `${prefs.digest_frequency}:${datePeriod}` : null;
    if (!period || (!prefs.in_app_enabled && !prefs.email_enabled)) continue;

    const { data: existing, error: existingError } = await service
      .from('job_board_notifications')
      .select('id')
      .eq('user_id', user.user_id)
      .eq('type', 'digest')
      .contains('metadata', { digest_period: period })
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing && !prefs.email_enabled) continue;

    const [savedResult, applicationsResult, legacyApplicationsResult] = await Promise.all([
      service.from('job_board_saved_jobs')
        .select('job_id, job_board_jobs ( id, title, company, created_at, status, apply_url )')
        .eq('user_id', user.user_id),
      service.from('internship_applications')
        .select('company, position, application_url')
        .eq('user_id', user.user_id),
      service.from('job_board_applications')
        .select('job_id, status')
        .eq('user_id', user.user_id),
    ]);
    for (const result of [savedResult, applicationsResult, legacyApplicationsResult]) {
      if (result.error) throw result.error;
    }

    const savedJobs = savedResult.data || [];
    const jobs = [...new Map([
      ...(recentJobs || []),
      ...savedJobs.map((row) => row.job_board_jobs).filter(Boolean),
    ].map((job) => [job.id, job])).values()];
    const appliedJobIds = [
      ...matchTrackedApplicationsToJobs(jobs, applicationsResult.data || []).map((job) => job.id),
      ...(legacyApplicationsResult.data || [])
        .filter((row) => row.status !== 'tracking')
        .map((row) => row.job_id),
    ];
    const content = selectDigestContent({
      jobs,
      savedJobs,
      appliedJobIds,
      now: cycleDate,
      lookbackDays: prefs.digest_frequency === 'weekly' ? 7 : 1,
    });
    if (!hasDigestContent(content)) continue;

    const notification = existing || await createInAppNotification(service, {
      userId: user.user_id, type: 'digest', title: 'Your Job Board update',
      message: digestSummary(content),
      metadata: {
        digest_period: period,
        new_job_ids: content.newJobs.map((job) => job.id),
        saved_job_ids: content.savedToApply.map((job) => job.id),
      },
    });
    if (notification && !existing) generated += 1;

    if (prefs.email_enabled) {
      const { data: queuedRows, error: queueError } = await service.from('job_board_notification_queue').upsert({
        user_id: user.user_id,
        notification_id: notification?.id || null,
        period_key: period,
        subject: 'Your KTP Job Board update',
        payload: {
          summary: digestSummary(content),
          newJobs: content.newJobs.map(({ id, title, company }) => ({ id, title, company })),
          savedToApply: content.savedToApply.map(({ id, title, company }) => ({ id, title, company })),
        },
      }, { onConflict: 'user_id,period_key', ignoreDuplicates: true }).select('id');
      if (queueError) throw queueError;
      queued += queuedRows?.length || 0;
    }
  }

  return { users: recipients.length, generated, queued };
}

export async function notifyRecommendations(service, userId) {
  const { data, error } = await service
    .from('job_board_recommendations')
    .select('id, job_id, score, explanation, job_board_jobs ( title, company )')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('score', { ascending: false })
    .limit(3);
  if (error) throw error;

  const recommendationIds = (data || []).map((rec) => rec.id);
  if (!recommendationIds.length) return { generated: 0 };
  const { data: existing, error: existingError } = await service
    .from('job_board_notifications')
    .select('recommendation_id')
    .eq('user_id', userId)
    .eq('type', 'recommendation')
    .in('recommendation_id', recommendationIds);
  if (existingError) throw existingError;
  const notified = new Set((existing || []).map((row) => row.recommendation_id));

  let generated = 0;
  for (const rec of data || []) {
    if (notified.has(rec.id)) continue;
    const notification = await createInAppNotification(service, {
      userId,
      jobId: rec.job_id,
      recommendationId: rec.id,
      type: 'recommendation',
      title: `Recommended: ${rec.job_board_jobs?.title || 'Job'}`,
      message: rec.explanation || `${rec.job_board_jobs?.company || 'A company'} may match your profile.`,
      metadata: { score: rec.score },
    });
    if (notification) generated += 1;
  }

  return { generated };
}
