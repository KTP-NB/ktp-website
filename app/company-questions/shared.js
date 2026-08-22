export const PAGE_SIZE = 50;

export const DIFFICULTIES = [
  ['EASY', 'Easy', 'text-emerald-300 border-emerald-300/30 bg-emerald-400/10'],
  ['MEDIUM', 'Medium', 'text-amber-300 border-amber-300/30 bg-amber-400/10'],
  ['HARD', 'Hard', 'text-rose-300 border-rose-300/30 bg-rose-400/10'],
];

export const SORTS = [
  ['frequency', 'Most frequent', { column: 'frequency', ascending: false }],
  ['ac_rate_asc', 'Lowest acceptance', { column: 'ac_rate', ascending: true }],
  ['ac_rate_desc', 'Highest acceptance', { column: 'ac_rate', ascending: false }],
  ['title', 'Title (A-Z)', { column: 'title', ascending: true }],
  ['difficulty', 'Difficulty (Easy first)', { column: 'difficulty', ascending: true }],
];

const TIMEFRAME_LABELS = {
  'thirty-days': 'Last 30 days',
  'three-months': 'Last 3 months',
  'six-months': 'Last 6 months',
  'more-than-six-months': 'Over 6 months',
  all: 'All time',
};

const TIMEFRAME_SHORT_LABELS = {
  'thirty-days': '30d',
  'three-months': '3mo',
  'six-months': '6mo',
  'more-than-six-months': '6mo+',
  all: 'All',
};

const TIMEFRAME_ORDER = ['thirty-days', 'three-months', 'six-months', 'more-than-six-months', 'all'];

const COMPANY_NAMES = {
  'capital-one': 'Capital One',
  facebook: 'Meta (Facebook)',
  nvidia: 'NVIDIA',
};

export function titleize(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function companyName(slug) {
  return COMPANY_NAMES[slug] || titleize(slug);
}

export function timeframeLabel(slug) {
  return TIMEFRAME_LABELS[slug] || titleize(slug);
}

export function timeframeShortLabel(slug) {
  return TIMEFRAME_SHORT_LABELS[slug] || titleize(slug);
}

export function sortTimeframes(slugs) {
  return [...slugs].sort((a, b) => {
    const ai = TIMEFRAME_ORDER.indexOf(a);
    const bi = TIMEFRAME_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
  });
}

const TIMEFRAME_PREFERENCE = ['thirty-days', 'three-months', 'six-months', 'more-than-six-months', 'all'];

export function defaultTimeframe(options) {
  if (!options.length) return '';
  return TIMEFRAME_PREFERENCE.find((slug) => options.includes(slug)) || options[0];
}

/**
 * PostgREST caps a response at 1000 rows, so page through anything that can
 * outgrow that (the company list keeps growing as the scraper runs).
 */
export async function fetchAllRows(buildQuery, pageSize = 1000) {
  const rows = [];
  for (let page = 0; ; page += 1) {
    const { data, error } = await buildQuery().range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

export function difficultyStyle(value) {
  return DIFFICULTIES.find(([key]) => key === value)?.[2] || 'text-white/70 border-white/15 bg-white/5';
}

export function difficultyLabel(value) {
  return DIFFICULTIES.find(([key]) => key === value)?.[1] || titleize(value);
}

export function questionUrl(row) {
  return row.url || `https://leetcode.com/problems/${row.title_slug}/`;
}
