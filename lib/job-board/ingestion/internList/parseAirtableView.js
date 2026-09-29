import { refineJobCategory } from '../categoryRefinement.js';
import { newYorkMidnightIso } from '../../postingDates.js';

const FIELD_NAMES = {
  title: 'Position Title',
  date: 'Date',
  apply: 'Apply',
  workModel: 'Work Model',
  location: 'Location',
  company: 'Company',
  salary: 'Salary',
  hireTime: 'Hire Time',
  graduateTime: 'Graduate Time',
  companyIndustry: 'Company Industry',
  companySize: 'Company Size',
  qualifications: 'Qualifications',
};

export function parseInternListAirtablePayload(payload, source, { cycleStartedAt } = {}) {
  const table = payload?.data?.table;
  const columns = table?.columns || [];
  const rows = table?.rows || [];
  const columnById = new Map(columns.map((column) => [column.id, column]));
  const fieldIds = Object.fromEntries(
    Object.entries(FIELD_NAMES).map(([key, fieldName]) => [
      key,
      columns.find((column) => column.name === fieldName)?.id || null,
    ])
  );

  return rows.map((row, rowIndex) => toInternListRecord(row, rowIndex, source, fieldIds, columnById, cycleStartedAt));
}

function toInternListRecord(row, rowIndex, source, fieldIds, columnById, cycleStartedAt) {
  const get = (key) => readCell(row, fieldIds[key], columnById);
  const title = cleanText(get('title'));
  const company = cleanText(get('company'));
  const application = get('apply');
  const applicationUrl = typeof application === 'object' ? application.url : cleanText(application);
  const dateRaw = cleanText(get('date'));
  const sourcePostedDate = parseDateOnly(dateRaw);
  const location = cleanText(get('location'));
  const workModel = normalizeWorkModel(get('workModel'));
  const salary = cleanText(get('salary'));
  const qualifications = cleanText(get('qualifications'));
  const industries = asArray(get('companyIndustry')).map(cleanText).filter(Boolean);
  const careerCategory = source.careerCategory || source.career_category;
  const sourceName = source.sourceName || source.source_name;
  const sourceUrl = source.sourceUrl || source.source_url;
  const repositoryOwner = source.repositoryOwner || source.repository_owner || 'intern-list';
  const repositoryName = source.repositoryName || source.repository_name || 'intern-list';
  const categoryRefinement = refineJobCategory({ title, sourceCategory: careerCategory });
  const rejectionReasons = [];

  if (!title) rejectionReasons.push('Missing title');
  if (!company) rejectionReasons.push('Missing company');
  if (!applicationUrl) rejectionReasons.push('Missing apply URL');

  return {
    provider: 'intern_list',
    sourceId: source.id,
    sourceName,
    sourceRepository: `${repositoryOwner}/${repositoryName}`,
    repository: `${repositoryOwner}/${repositoryName}`,
    sourceRowIndex: rowIndex,
    sourceExternalId: extractJobrightId(applicationUrl) || row.id || `${company}:${title}:${dateRaw}`,
    company,
    title,
    location,
    locations: splitLocations(location),
    applicationUrl,
    sourceUrl,
    careerCategory,
    careerSubcategory: source.metadata?.careerSubcategory || categoryRefinement.careerSubcategory,
    employmentType: 'internship',
    workplaceType: workModel,
    description: qualifications || buildDescription({ title, company, salary, industries }),
    sourcePostedDate,
    sourceDateRaw: dateRaw,
    firstSeenAt: cycleStartedAt,
    status: 'open',
    tags: [
      ...industries,
      cleanText(get('hireTime')),
      cleanText(get('graduateTime')),
      salary && salary !== 'N/A' ? salary : '',
      source.metadata?.internListCategory,
    ].filter(Boolean),
    rawSourceRecord: {
      id: row.id,
      title,
      company,
      date: dateRaw,
      apply: application,
      workModel: cleanText(get('workModel')),
      location,
      salary,
      hireTime: cleanText(get('hireTime')),
      graduateTime: cleanText(get('graduateTime')),
      companyIndustry: industries,
      companySize: cleanText(get('companySize')),
      qualifications,
      airtableEmbedUrl: source.metadata?.airtableEmbedUrl,
      jobrightJobId: extractJobrightId(applicationUrl),
    },
    rejected: rejectionReasons.length > 0,
    rejectionReasons,
  };
}

export function readCell(row, fieldId, columnById) {
  if (!fieldId) return null;
  const value = row?.cellValuesByColumnId?.[fieldId];
  const column = columnById.get(fieldId);
  const choices = column?.typeOptions?.choices || {};
  if (Array.isArray(value)) return value.map((item) => choices[item]?.name || item);
  if (typeof value === 'string' && choices[value]) return choices[value].name;
  return value;
}

function parseDateOnly(value) {
  const raw = cleanText(value);
  return newYorkMidnightIso(raw);
}

function normalizeWorkModel(value) {
  const lower = cleanText(value).toLowerCase();
  if (lower.includes('remote')) return 'remote';
  if (lower.includes('hybrid')) return 'hybrid';
  return 'onsite';
}

function splitLocations(value) {
  return cleanText(value)
    .split(/\n|;/)
    .map((location) => cleanText(location))
    .filter((location) => location && location.toLowerCase() !== 'multi location');
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function cleanText(value) {
  if (value == null) return '';
  if (typeof value === 'object') return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function buildDescription({ title, company, salary, industries }) {
  const parts = [`${company} is hiring for ${title}.`];
  if (salary && salary !== 'N/A') parts.push(`Compensation listed: ${salary}.`);
  if (industries.length) parts.push(`Industry tags: ${industries.join(', ')}.`);
  return parts.join(' ');
}

function extractJobrightId(url) {
  const match = String(url || '').match(/jobright\.ai\/jobs\/info\/([^/?#]+)/);
  return match?.[1] || null;
}
