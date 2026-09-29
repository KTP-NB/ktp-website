const DEFAULT_STALE_AFTER_DAYS = 7;

export async function finalizeSourceInventory(service, sourceId, records, options = {}) {
  const cycleStartedAt = options.cycleStartedAt || new Date().toISOString();
  const inventoryUnchanged = options.inventoryUnchanged === true;
  const seenExternalIds = inventoryUnchanged ? [] : inventoryIds(records);
  const { data, error } = await service.rpc('job_board_finalize_source_inventory', {
    p_source_id: sourceId,
    p_seen_external_ids: seenExternalIds,
    p_cycle_started_at: cycleStartedAt,
    p_stale_after_days: options.staleAfterDays || DEFAULT_STALE_AFTER_DAYS,
    p_inventory_unchanged: inventoryUnchanged,
  });

  if (error) throw error;
  return {
    refreshed: Number(data?.refreshed_count || 0),
    archived: Number(data?.archived_count || 0),
  };
}

export function inventoryIds(records = []) {
  return [...new Set(records
    .filter((record) => !record.rejected && record.status !== 'closed')
    .map((record) => record.sourceExternalId)
    .filter(Boolean))];
}
