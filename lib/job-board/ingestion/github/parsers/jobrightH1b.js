import { stripMarkdown, extractMarkdownLink, unescapeMarkdown } from './markdownTable.js';

const EXPECTED_COLUMNS = 7;

export function parseJobrightH1bRepository(content, source, { cycleStartedAt } = {}) {
  const sectionName = source.metadata?.githubDetailsSection || 'Software Engineer';
  const section = extractDetailsSection(content, sectionName);
  if (!section) return [];

  const rows = parseH1bRows(section);
  let lastCompany = { name: '', url: '' };

  return rows.map((row, rowIndex) => {
    const record = toH1bRecord(row, source, {
      cycleStartedAt: cycleStartedAt || new Date().toISOString(),
      rowIndex,
      lastCompany,
    });
    if (record.company && row.company !== '↳') {
      lastCompany = { name: record.company, url: record.companyUrl || '' };
    }
    return record;
  });
}

function toH1bRecord(row, source, { cycleStartedAt, rowIndex, lastCompany }) {
  const repository = `${source.repositoryOwner}/${source.repositoryName}`;
  const companyLink = extractMarkdownLink(row.company || '');
  const company = row.company === '↳'
    ? lastCompany.name
    : (companyLink.label || stripMarkdown(row.company));
  const companyUrl = row.company === '↳' ? lastCompany.url : companyLink.url;
  const title = stripMarkdown(row.title);
  const applicationUrl = extractMarkdownLink(row.link).url;
  const sourcePostedDate = normalizeIsoDate(row.datePosted);
  const visa = parseH1bStatus(row.h1bStatus);
  const employmentType = inferEmploymentType(`${row.title} ${row.level}`);
  const rejectionReasons = [];

  if (!company) rejectionReasons.push('company_missing');
  if (!title) rejectionReasons.push('title_missing');
  if (!applicationUrl) rejectionReasons.push('application_url_missing');

  return {
    provider: 'jobright_h1b',
    sourceId: source.id,
    sourceName: source.sourceName,
    sourceRepository: repository,
    repository,
    sourceRowIndex: rowIndex,
    sourceExternalId: extractJobrightId(applicationUrl) || applicationUrl || `${company}:${title}:${row.datePosted}`,
    company,
    companyUrl,
    title,
    location: stripMarkdown(row.location),
    locations: splitLocations(row.location),
    workplaceType: inferWorkplaceType(row.location),
    applicationUrl,
    applyUrl: applicationUrl,
    sourceUrl: source.sourceUrl || `https://github.com/${repository}`,
    sourcePostedDate,
    sourceDateRaw: row.datePosted,
    firstSeenAt: cycleStartedAt,
    isClosed: !applicationUrl,
    careerCategory: source.careerCategory || 'software_engineering',
    careerSubcategory: null,
    employmentType,
    visaSponsorshipStatus: visa.status,
    visaSponsorshipConfidence: visa.confidence,
    visaSponsorshipNotes: visa.notes,
    description: buildDescription({ company, title, level: row.level, visa }),
    tags: buildTags(row, visa, employmentType),
    status: applicationUrl ? 'open' : 'closed',
    rawSourceRecord: row,
    raw: row,
    rejected: rejectionReasons.length > 0,
    rejectionReasons,
  };
}

function extractDetailsSection(content, sectionName) {
  const escaped = escapeRegExp(sectionName);
  const pattern = new RegExp(`<details>\\s*<summary>\\s*${escaped}\\s*<\\/summary>([\\s\\S]*?)<\\/details>`, 'i');
  return String(content || '').match(pattern)?.[1] || '';
}

function parseH1bRows(section) {
  const lines = String(section || '').split(/\r?\n/);
  const rows = [];
  let inTable = false;

  for (const line of lines) {
    if (!line.trim().startsWith('|')) continue;
    if (/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)) {
      inTable = true;
      continue;
    }
    if (!inTable || /Company\s*\|\s*Job Title/i.test(line)) continue;

    const cells = reconcileH1bCells(splitTableRow(line));
    if (!cells) continue;
    rows.push({
      company: normalizeCell(cells[0]),
      title: normalizeCell(cells[1]),
      level: normalizeCell(cells[2]),
      location: normalizeCell(cells[3]),
      h1bStatus: normalizeCell(cells[4]),
      link: normalizeCell(cells[5]),
      datePosted: normalizeCell(cells[6]),
    });
  }

  return rows;
}

function splitTableRow(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function reconcileH1bCells(cells) {
  if (cells.length < EXPECTED_COLUMNS) return null;
  if (cells.length === EXPECTED_COLUMNS) return cells;

  const statusIndex = cells.findIndex((cell) => /🏅|🥈/.test(cell));
  const linkIndex = cells.findIndex((cell) => /\[[^\]]+\]\([^)]+\)/.test(cell) && /apply/i.test(cell));
  const dateIndex = cells.findIndex((cell) => /^\d{4}-\d{2}-\d{2}$/.test(stripMarkdown(cell)));
  if (statusIndex < 4 || linkIndex < 0 || dateIndex < 0) return cells.slice(0, EXPECTED_COLUMNS);

  return [
    cells[0],
    cells[1],
    cells[2],
    cells.slice(3, statusIndex).join(' | '),
    cells[statusIndex],
    cells[linkIndex],
    cells[dateIndex],
  ];
}

function normalizeCell(value) {
  return unescapeMarkdown(String(value || '').replace(/\*\*/g, '').trim());
}

function parseH1bStatus(value) {
  const raw = String(value || '');
  if (raw.includes('🏅')) {
    return {
      status: 'explicit_h1b_sponsor',
      confidence: 'explicit',
      notes: 'H1B sponsorship is explicitly mentioned in the job description.',
    };
  }
  if (raw.includes('🥈')) {
    return {
      status: 'likely_h1b_sponsor',
      confidence: 'historical',
      notes: 'Company has sponsored similar roles in recent H1B history.',
    };
  }
  return {
    status: 'unknown',
    confidence: 'unknown',
    notes: '',
  };
}

function inferEmploymentType(value) {
  return /\bintern(ship)?\b/i.test(String(value || '')) ? 'internship' : 'full_time';
}

function inferWorkplaceType(value) {
  const lower = String(value || '').toLowerCase();
  if (lower.includes('remote')) return 'remote';
  if (lower.includes('hybrid')) return 'hybrid';
  return 'onsite';
}

function splitLocations(value) {
  return String(value || '')
    .split(/\s*(?:;|<br\s*\/?>|\s\/\s|•|\s\|\s)\s*/i)
    .map((location) => stripMarkdown(location))
    .filter(Boolean);
}

function normalizeIsoDate(value) {
  const raw = stripMarkdown(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return `${raw}T04:00:00.000Z`;
}

function extractJobrightId(value) {
  try {
    const url = new URL(value);
    return url.pathname.match(/\/jobs\/info\/([^/]+)/)?.[1] || '';
  } catch {
    return '';
  }
}

function buildDescription({ company, title, level, visa }) {
  return [
    `${title || 'Software engineering role'} at ${company || 'a hiring company'}.`,
    level ? `Level: ${stripMarkdown(level)}.` : '',
    visa.notes || '',
  ].filter(Boolean).join(' ');
}

function buildTags(row, visa, employmentType) {
  return [...new Set([
    'h1b',
    employmentType,
    stripMarkdown(row.level),
    visa.status === 'explicit_h1b_sponsor' ? 'explicit_h1b_sponsor' : null,
    visa.status === 'likely_h1b_sponsor' ? 'likely_h1b_sponsor' : null,
  ].filter(Boolean))];
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
