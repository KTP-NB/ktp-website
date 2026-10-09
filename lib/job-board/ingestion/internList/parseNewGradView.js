import { parseInternListAirtablePayload, readCell } from './parseAirtableView.js';

export function parseNewGradAirtablePayload(payload, source, options = {}) {
  const columns = payload?.data?.table?.columns || [];
  const rows = payload?.data?.table?.rows || [];
  const newGradColumn = columns.find((column) => column.name === 'Is New Grad');
  if (!newGradColumn) throw new Error(`NewGrad source ${source.sourceName} is missing the Is New Grad field.`);
  const columnById = new Map(columns.map((column) => [column.id, column]));
  const records = parseInternListAirtablePayload(payload, source, options);

  return records.flatMap((record, index) => {
    const isNewGrad = readCell(rows[index], newGradColumn.id, columnById);
    if (String(isNewGrad || '').toLowerCase() !== 'yes') return [];
    if (!isUsLocation(record.location)) return [];
    if (/\bintern(ship)?\b|\bco-?ops?\b|\bapprentice(ship)?\b/i.test(record.title)) return [];
    return [{
      ...record,
      provider: 'new_grad_jobs',
      employmentType: 'new_grad',
      tags: [...record.tags, 'New Grad'],
      rawSourceRecord: { ...record.rawSourceRecord, isNewGrad: true },
    }];
  });
}

function isUsLocation(value) {
  return /\bUnited States\b|\bU\.S\.A?\.\b|\bUSA?[-, ]/i.test(String(value || ''));
}
