export const ashbyAdapter = {
  source: 'ashby',
  async fetchJobs() {
    throw new Error('Ashby live scraping is planned for Phase 5.');
  },
  parseFixture(html) {
    const spans = [...String(html || '').matchAll(/<span>(.*?)<\/span>/g)].map((match) => match[1].trim());
    return {
      title: textBetween(html, '<h1>', '</h1>'),
      company: spans[0] || '',
      location: spans[1] || '',
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
