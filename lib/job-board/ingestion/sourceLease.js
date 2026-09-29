const DEFAULT_LEASE_SECONDS = 15 * 60;

export async function acquireSourceLease(service, sourceId, options = {}) {
  const token = options.token || globalThis.crypto.randomUUID();
  const now = options.now || new Date().toISOString();
  const leaseSeconds = options.leaseSeconds || DEFAULT_LEASE_SECONDS;
  const { data, error } = await service.rpc('job_board_acquire_ingestion_lock', {
    p_source_id: sourceId,
    p_lock_token: token,
    p_now: now,
    p_lease_seconds: leaseSeconds,
  });

  if (error) throw error;
  return { acquired: data === true, token };
}

export async function releaseSourceLease(service, sourceId, token) {
  const { data, error } = await service.rpc('job_board_release_ingestion_lock', {
    p_source_id: sourceId,
    p_lock_token: token,
  });

  if (error) throw error;
  return data === true;
}
