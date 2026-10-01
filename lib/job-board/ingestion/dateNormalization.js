const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export function normalizeSourceDate(value, { cycleStartedAt } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return { sourceDateRaw: raw, sourcePostedDate: null };

  const cycle = cycleStartedAt ? new Date(cycleStartedAt) : new Date();
  const lower = raw.toLowerCase();

  if (lower === 'today' || lower === '0d') {
    return { sourceDateRaw: raw, sourcePostedDate: startOfDay(cycle).toISOString() };
  }

  const relative = lower.match(/^(\d+)\s*d$/);
  if (relative) {
    const date = startOfDay(cycle);
    date.setDate(date.getDate() - Number(relative[1]));
    return { sourceDateRaw: raw, sourcePostedDate: date.toISOString() };
  }

  const monthDay = lower.match(/^([a-z]{3,4})\s+(\d{1,2})$/);
  if (monthDay && MONTHS[monthDay[1]] !== undefined) {
    const month = MONTHS[monthDay[1]];
    const day = Number(monthDay[2]);
    let year = cycle.getFullYear();
    const candidate = startOfDay(new Date(year, month, day));
    const futureAllowanceMs = 24 * 60 * 60 * 1000;
    if (candidate.getTime() - startOfDay(cycle).getTime() > futureAllowanceMs) {
      year -= 1;
    }
    return { sourceDateRaw: raw, sourcePostedDate: startOfDay(new Date(year, month, day)).toISOString() };
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return { sourceDateRaw: raw, sourcePostedDate: startOfDay(parsed).toISOString() };
  }

  return { sourceDateRaw: raw, sourcePostedDate: null };
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
