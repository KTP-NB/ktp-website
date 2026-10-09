export function parseMarkdownTables(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const tables = [];

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!isTableLine(lines[index]) || !isSeparatorLine(lines[index + 1])) continue;

    const headers = splitRow(lines[index]);
    const rows = [];
    index += 2;

    while (index < lines.length && isTableLine(lines[index])) {
      const values = splitRow(lines[index]);
      const row = {};
      headers.forEach((header, headerIndex) => {
        row[normalizeHeader(header)] = cleanCell(values[headerIndex]);
      });
      rows.push(row);
      index += 1;
    }

    tables.push({ headers: headers.map(normalizeHeader), rows });
  }

  return tables;
}

export function extractMarkdownLink(value) {
  const text = unescapeMarkdown(String(value || '').trim());
  const match = text.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (!match) return { label: stripMarkdown(text), url: '' };
  return { label: stripMarkdown(match[1]), url: match[2].trim() };
}

export function stripMarkdown(value) {
  return unescapeMarkdown(value)
    .replace(/\*\*/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^\[+|\]+$/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function unescapeMarkdown(value) {
  return String(value || '').replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, '$1');
}

function splitRow(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableLine(line) {
  return String(line || '').includes('|');
}

function isSeparatorLine(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(String(line || ''));
}

function normalizeHeader(value) {
  return stripMarkdown(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function cleanCell(value) {
  return unescapeMarkdown(value)
    .replace(/\*\*/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
