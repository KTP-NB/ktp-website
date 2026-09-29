import { normalizeSourceDate } from '../../dateNormalization.js';
import { refineEmploymentType, refineJobCategory } from '../../categoryRefinement.js';
import { extractMarkdownLink, parseMarkdownTables, stripMarkdown } from './markdownTable.js';

export function parseSimplifyRepository(content, source, { cycleStartedAt } = {}) {
  return parseMarkdownTables(content).flatMap((table) => (
    table.rows.map((row, rowIndex) => toSimplifyRecord(row, source, {
      cycleStartedAt: cycleStartedAt || new Date().toISOString(),
      rowIndex,
    }))
  ));
}

function toSimplifyRecord(row, source, { cycleStartedAt, rowIndex }) {
  const repository = `${source.repositoryOwner}/${source.repositoryName}`;
  const application = extractMarkdownLink(row.application || '');
  const date = normalizeSourceDate(row.age || row.date_posted || row.date, { cycleStartedAt });
  const title = row.role || row.job_title || row.title;
  const company = stripMarkdown(row.company || '').replace(/^🔥\s*/, '');
  const applicationUrl = application.url;
  const closed = isClosed(row) || !applicationUrl;
  const categoryRefinement = refineJobCategory({ title, sourceCategory: source.careerCategory });
  const rejectionReasons = [];

  if (!company || company === '↳') rejectionReasons.push('company_missing');
  if (!title) rejectionReasons.push('title_missing');
  if (!applicationUrl) rejectionReasons.push('application_url_missing');

  return {
    provider: 'simplify',
    sourceId: source.id,
    sourceName: source.sourceName,
    sourceRepository: repository,
    repository,
    sourceRowIndex: rowIndex,
    sourceExternalId: applicationUrl || `${company}:${title}:${date.sourceDateRaw}`,
    company,
    title: stripMarkdown(title),
    location: row.location || '',
    locations: splitLocations(row.location),
    workplaceType: inferWorkplace(row.location),
    applicationUrl,
    applyUrl: applicationUrl,
    sourceUrl: source.sourceUrl || `https://github.com/${repository}`,
    sourcePostedDate: date.sourcePostedDate,
    sourceDateRaw: date.sourceDateRaw,
    firstSeenAt: cycleStartedAt,
    isClosed: closed,
    careerCategory: source.careerCategory,
    careerSubcategory: source.metadata?.careerSubcategory || source.metadata?.subcategory || categoryRefinement.careerSubcategory,
    employmentType: refineEmploymentType({ title, sourceEmploymentType: source.employmentType }),
    tags: [...new Set([...buildTags(row), ...categoryRefinement.tags])],
    status: closed ? 'closed' : 'open',
    notes: '',
    rawSourceRecord: row,
    raw: row,
    rejected: rejectionReasons.length > 0,
    rejectionReasons,
  };
}

function inferWorkplace(location) {
  const lower = String(location || '').toLowerCase();
  if (lower.includes('remote')) return 'remote';
  if (lower.includes('hybrid')) return 'hybrid';
  return null;
}

function isClosed(row) {
  return Object.values(row || {}).some((value) => String(value || '').includes('🔒'));
}

function splitLocations(value) {
  return String(value || '')
    .split(/\s*(?:;|<br\s*\/?>|\s\/\s|•)\s*/i)
    .map((location) => stripMarkdown(location))
    .filter(Boolean);
}

function buildTags(row) {
  return [
    row.location,
    row.application,
  ].map((tag) => stripMarkdown(tag)).filter(Boolean);
}
