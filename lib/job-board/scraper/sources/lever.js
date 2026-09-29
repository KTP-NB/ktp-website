export const leverAdapter = {
  source: 'lever',
  async fetchJobs() {
    throw new Error('Lever live scraping is planned for Phase 5.');
  },
  parseFixture(html) {
    return {
      title: textBetween(html, '<h1>', '</h1>'),
      company: textBetween(html, '<p data-qa="company-name">', '</p>'),
      location: textBetween(html, '<p data-qa="location">', '</p>'),
      description: textBetween(html, '<div class="posting-requirements">', '</div>').replace(/<\/?p>/g, '').trim(),
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
