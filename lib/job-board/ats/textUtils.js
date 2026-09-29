export function normalizeText(value) {
  return String(value || '').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function normalizeToken(value) {
  return String(value || '').toLowerCase().replace(/[^\w+#. -]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function includesTerm(text, term) {
  const normalizedText = ` ${normalizeToken(text)} `;
  const normalizedTerm = normalizeToken(term);
  if (!normalizedTerm) return false;
  if (/^[a-z0-9+#.]+$/i.test(normalizedTerm)) {
    return normalizedText.includes(` ${normalizedTerm} `);
  }
  return normalizedText.includes(normalizedTerm);
}

export function splitKeywords(value) {
  return unique(
    String(value || '')
      .split(/[,;|/\n]/)
      .map(normalizeToken)
      .filter((item) => item.length > 1)
  );
}

export function sectionText(text, headings) {
  const normalized = normalizeText(text);
  const headingPattern = headings.map(escapeRegExp).join('|');
  const regex = new RegExp(`(?:^|\\n)\\s*(${headingPattern})\\s*:?\\s*\\n`, 'i');
  const match = normalized.match(regex);
  if (!match || match.index == null) return '';

  const start = match.index + match[0].length;
  const rest = normalized.slice(start);
  const nextHeading = rest.search(/\n\s*[A-Z][A-Z &/+-]{2,}\s*:?\s*\n/);
  return normalizeText(nextHeading >= 0 ? rest.slice(0, nextHeading) : rest);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
