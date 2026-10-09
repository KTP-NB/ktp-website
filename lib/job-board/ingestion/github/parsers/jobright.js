import { normalizeSourceDate } from '../../dateNormalization.js';
import { refineEmploymentType, refineJobCategory } from '../../categoryRefinement.js';
import { extractMarkdownLink, parseMarkdownTables, stripMarkdown } from './markdownTable.js';

export function parseJobrightRepository(content, source, { cycleStartedAt } = {}) {
  return parseMarkdownTables(content).flatMap((table) => (
    table.rows.map((row, rowIndex) => toJobrightRecord(row, source, {
      cycleStartedAt: cycleStartedAt || new Date().toISOString(),
      rowIndex,
    }))
  ));
}

function toJobrightRecord(row, source, { cycleStartedAt, rowIndex }) {
  const repository = `${source.repositoryOwner}/${source.repositoryName}`;
  const companyLink = extractMarkdownLink(row.company || '');
  const company = companyLink.label || row.company;
  const titleCell = row.job_title || row.title || row.role;
  const titleLink = extractMarkdownLink(titleCell);
  const title = titleLink.label || titleCell;
  const date = normalizeSourceDate(row.date_posted || row.date || row.age, { cycleStartedAt });
  const applicationUrl = titleLink.url || extractMarkdownLink(row.application || '').url || companyLink.url || '';
  const closed = isClosed(row) || !applicationUrl;
  const categoryRefinement = refineJobCategory({ title, sourceCategory: source.careerCategory });
  const rejectionReasons = [];

  if (!company) rejectionReasons.push('company_missing');
  if (!title) rejectionReasons.push('title_missing');
  if (!applicationUrl) rejectionReasons.push('application_url_missing');

  return {
    provider: 'jobright',
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
    workplaceType: normalizeWorkModel(row.work_model),
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
    notes: row.notes || '',
    rawSourceRecord: row,
    raw: row,
    rejected: rejectionReasons.length > 0,
    rejectionReasons,
  };
}

function normalizeWorkModel(value) {
  const lower = String(value || '').toLowerCase();
  if (lower.includes('remote')) return 'remote';
  if (lower.includes('hybrid')) return 'hybrid';
  if (lower.includes('site') || lower.includes('office')) return 'onsite';
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
    row.work_model,
    row.notes,
  ].map((tag) => stripMarkdown(tag)).filter(Boolean);
}
