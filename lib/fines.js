/**
 * Fine tracker helpers shared by the admin panel, the member view, and the
 * API routes. The per-member rollups mirror the spreadsheet this replaced:
 * COUNTIF -> fine_count, SUMIF -> total_assessed, SUMIFS(paid) -> total_paid,
 * MAX(assessed - paid, 0) -> outstanding, MAXIFS -> last_fine_date, and the
 * Clear / Paid / Balance Due account status.
 */

export const ACCOUNT_STATUSES = {
  CLEAR: 'Clear',
  PAID: 'Paid',
  BALANCE_DUE: 'Balance Due',
};

export function toAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatCurrency(value) {
  return toAmount(value).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}

export function formatDate(value) {
  if (!value) return '—';
  // Date columns come back as YYYY-MM-DD; parse as local noon so the day never
  // slips a date backwards in negative UTC offsets.
  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Per-fine status: paid, overdue, or still within its due date. */
export function fineStatus(fine, today = todayIso()) {
  if (fine.paid) return 'paid';
  if (fine.due_date && String(fine.due_date).slice(0, 10) < today) return 'overdue';
  return 'unpaid';
}

export const FINE_STATUS_LABELS = {
  paid: 'Paid',
  overdue: 'Overdue',
  unpaid: 'Unpaid',
};

export const FINE_STATUS_STYLES = {
  paid: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200',
  overdue: 'border-rose-300/30 bg-rose-400/10 text-rose-200',
  unpaid: 'border-amber-300/30 bg-amber-400/10 text-amber-200',
};

export const ACCOUNT_STATUS_STYLES = {
  [ACCOUNT_STATUSES.CLEAR]: 'border-white/15 bg-white/5 text-white/60',
  [ACCOUNT_STATUSES.PAID]: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200',
  [ACCOUNT_STATUSES.BALANCE_DUE]: 'border-rose-300/30 bg-rose-400/10 text-rose-200',
};

/** Rolls a member's fines up into the spreadsheet's summary columns. */
export function summarizeFines(fines, today = todayIso()) {
  let totalAssessed = 0;
  let totalPaid = 0;
  let overdueCount = 0;
  let lastFineDate = null;

  for (const fine of fines) {
    const amount = toAmount(fine.amount);
    totalAssessed += amount;
    if (fine.paid) totalPaid += amount;
    if (fineStatus(fine, today) === 'overdue') overdueCount += 1;
    const issued = fine.date_issued ? String(fine.date_issued).slice(0, 10) : null;
    if (issued && (!lastFineDate || issued > lastFineDate)) lastFineDate = issued;
  }

  const outstanding = Math.max(totalAssessed - totalPaid, 0);
  const accountStatus = fines.length === 0
    ? ACCOUNT_STATUSES.CLEAR
    : outstanding === 0
      ? ACCOUNT_STATUSES.PAID
      : ACCOUNT_STATUSES.BALANCE_DUE;

  return {
    fine_count: fines.length,
    total_assessed: Number(totalAssessed.toFixed(2)),
    total_paid: Number(totalPaid.toFixed(2)),
    outstanding: Number(outstanding.toFixed(2)),
    overdue_count: overdueCount,
    last_fine_date: lastFineDate,
    account_status: accountStatus,
  };
}
