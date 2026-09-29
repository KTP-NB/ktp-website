export const customAdapter = {
  source: 'custom',
  async fetchJobs() {
    throw new Error('Custom live scraping is planned for Phase 5.');
  },
  parseFixture(html) {
    return {
      title: textBetween(html, '<h1>', '</h1>'),
      company: textBetween(html, '<p class="employer">', '</p>'),
      location: textBetween(html, '<p class="job-location">', '</p>'),
      description: lastParagraph(html),
    };
  },
};

function textBetween(html, start, end) {
  const value = String(html || '');
  const startIndex = value.indexOf(start);
  if (startIndex < 0) return '';
  const endIndex = value.indexOf(end, startIndex + start.length);
  if (endIndex < 0) return '';
  return value.slice(startIndex + start.length, endIndex).trim();
}

function lastParagraph(html) {
  const matches = [...String(html || '').matchAll(/<p[^>]*>(.*?)<\/p>/g)];
  return matches.at(-1)?.[1]?.trim() || '';
}
