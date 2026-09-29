export const greenhouseAdapter = {
  source: 'greenhouse',
  async fetchJobs() {
    throw new Error('Greenhouse live scraping is planned for Phase 5.');
  },
  parseFixture(html) {
    return {
      title: textBetween(html, '<h1>', '</h1>'),
      company: textBetween(html, '<div class="company">', '</div>'),
      location: textBetween(html, '<div class="location">', '</div>'),
      description: textBetween(html, '<p>', '</p>'),
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
