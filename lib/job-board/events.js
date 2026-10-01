export async function logJobBoardEvent(service, { userId, eventType, entityType, entityId, metadata }) {
  const { error } = await service
    .from('job_board_events')
    .insert({
      user_id: userId || null,
      event_type: eventType,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: metadata || {},
    });

  if (error) {
    console.error('[job-board] event log failed', error);
  }
}

export async function analyticsSummary(service) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await service
    .from('job_board_events')
    .select('event_type, created_at')
    .gte('created_at', since);
  if (error) throw error;

  const counts = {};
  for (const row of data || []) {
    counts[row.event_type] = (counts[row.event_type] || 0) + 1;
  }

  return { since, counts, total: (data || []).length };
}
