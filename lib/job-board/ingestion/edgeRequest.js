export function readBearerToken(value) {
  const match = String(value || '').match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

export function internalSecretMatches(provided, expected) {
  const left = String(provided || '');
  const right = String(expected || '');
  if (!left || !right || left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export function summarizeIngestionForResponse(summary = {}) {
  return {
    cycleStartedAt: summary.cycleStartedAt || null,
    sources: Number(summary.sources || 0),
    fetched: Number(summary.fetched || 0),
    eligible: Number(summary.eligible || 0),
    accepted: Number(summary.accepted || 0),
    inserted: Number(summary.inserted || 0),
    updated: Number(summary.updated || 0),
    duplicate: Number(summary.duplicate || 0),
    rejected: Number(summary.rejected || 0),
    unchanged: Number(summary.unchanged || 0),
    inventoryRefreshed: Number(summary.inventoryRefreshed || 0),
    staleArchived: Number(summary.staleArchived || 0),
    skippedLocked: Number(summary.skippedLocked || 0),
    failed: Number(summary.failed || 0),
  };
}
