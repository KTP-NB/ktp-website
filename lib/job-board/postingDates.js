const TIME_ZONE = 'America/New_York';
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
});
const offsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  timeZoneName: 'shortOffset',
});

export function newYorkDate(now = new Date()) {
  const parts = Object.fromEntries(dateFormatter.formatToParts(new Date(now)).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function newYorkMidnightIso(dateOnly) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly || '')) return null;
  const [year, month, day] = dateOnly.split('-').map(Number);
  const utcMidnight = Date.UTC(year, month - 1, day);
  if (new Date(utcMidnight).toISOString().slice(0, 10) !== dateOnly) return null;
  const offset = offsetFormatter.formatToParts(new Date(utcMidnight))
    .find((part) => part.type === 'timeZoneName')?.value;
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(offset || '');
  if (!match) throw new Error('Unable to determine New York UTC offset.');
  const minutes = (Number(match[2]) * 60 + Number(match[3] || 0)) * (match[1] === '+' ? 1 : -1);
  return new Date(utcMidnight - minutes * 60_000).toISOString();
}

export function newYorkDayBounds(now = new Date()) {
  const date = newYorkDate(now);
  const next = new Date(Date.parse(`${date}T00:00:00.000Z`) + 86_400_000).toISOString().slice(0, 10);
  return { start: newYorkMidnightIso(date), end: newYorkMidnightIso(next) };
}
