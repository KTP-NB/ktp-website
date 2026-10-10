/**
 * Company-name matching for the referral finder. Ported from the `match`
 * Supabase function the browser extension calls, so a lookup made through the
 * API resolves to the same company the extension would show.
 */

const LEGAL_SUFFIXES = [
  'incorporated', 'corporation', 'technologies', 'technology', 'solutions', 'services',
  'holdings', 'ventures', 'limited', 'company', 'group', 'corp', 'llc', 'ltd', 'inc', 'co',
];
const DOMAIN_TLDS = ['com', 'org', 'net', 'io', 'co', 'ai', 'dev', 'app', 'jobs', 'careers'];
const NOISE_WORDS = ['careers', 'jobs', 'recruiting', 'job board', 'homepage'];

export const MIN_FUZZY_SCORE = 85;

const SUFFIX_PATTERN = new RegExp(`\\b(${LEGAL_SUFFIXES.join('|')})\\b`, 'gi');
const TLD_PATTERN = new RegExp(`\\.(${DOMAIN_TLDS.join('|')})\\b`, 'gi');
const NOISE_PATTERN = new RegExp(`\\b(${NOISE_WORDS.join('|')})\\b`, 'gi');

export function normalizeCompany(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(TLD_PATTERN, ' ')
    .replace(NOISE_PATTERN, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(SUFFIX_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

function ratio(left, right) {
  if (!left || !right) return 0;
  if (left === right) return 100;
  return (100 * (left.length + right.length - levenshtein(left, right))) / (left.length + right.length);
}

function tokenSortRatio(left, right) {
  const sortTokens = (value) => value.split(/\s+/).filter(Boolean).sort().join(' ');
  return ratio(sortTokens(left), sortTokens(right));
}

function partialRatio(left, right) {
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  if (!shorter) return 0;
  if (longer.includes(shorter)) return 100;
  let best = 0;
  for (let i = 0; i <= longer.length - shorter.length; i += 1) {
    best = Math.max(best, ratio(shorter, longer.slice(i, i + shorter.length)));
    if (best >= 99) return best;
  }
  return best;
}

export function similarityScore(left, right) {
  if (!left || !right) return 0;
  if (left === right) return 100;
  return Math.max(tokenSortRatio(left, right), partialRatio(left, right));
}

export function findBestMatch(queryNormalized, candidates) {
  let company = null;
  let score = 0;
  for (const candidate of candidates || []) {
    const candidateScore = similarityScore(
      queryNormalized,
      normalizeCompany(String(candidate.normalized || candidate.name || '')),
    );
    if (candidateScore > score) {
      company = candidate;
      score = candidateScore;
    }
  }
  return company && score > MIN_FUZZY_SCORE ? { company, score } : { company: null, score };
}

export async function matchCompany(service, companyRaw) {
  const normalized = normalizeCompany(companyRaw);
  if (!normalized) return null;

  const exact = await service.from('companies').select('id,name,normalized').eq('normalized', normalized).limit(1);
  if (exact.error) throw exact.error;
  if (exact.data?.length) return { ...exact.data[0], match_score: 100 };

  const candidates = await service.from('companies').select('id,name,normalized').limit(500);
  if (candidates.error) throw candidates.error;
  const { company, score } = findBestMatch(normalized, candidates.data || []);
  return company ? { ...company, match_score: score } : null;
}
