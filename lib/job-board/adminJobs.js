export async function archiveJobPostings(service, { now = new Date().toISOString() } = {}) {
  const { count, error: countError } = await service
    .from('job_board_jobs')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'archived');

  if (countError) throw countError;

  const { error } = await service
    .from('job_board_jobs')
    .update({
      status: 'archived',
      inactive_at: now,
      updated_at: now,
    })
    .neq('status', 'archived');

  if (error) throw error;

  return {
    archivedJobs: count || 0,
    archivedAt: now,
  };
}

export function formatAdminJobBoardSummary(summary = {}) {
  if (typeof summary.inserted === 'number') {
    const counts = `${summary.inserted} inserted, ${summary.updated || 0} updated, ${summary.failed || 0} failed`;
    const failure = summary.runs?.find((run) => run.status === 'failed')?.error;
    if (failure) return `${counts}. ${failure}`;
    if (summary.partialInventories > 0) return `${counts}. Incomplete source snapshot; older jobs were kept open.`;
    return counts;
  }
  if (typeof summary.archivedJobs === 'number') return `${summary.archivedJobs} jobs archived`;
  return 'complete';
}
