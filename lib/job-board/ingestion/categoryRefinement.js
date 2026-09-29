export function refineJobCategory({ title, sourceCategory }) {
  const lower = String(title || '').toLowerCase();
  const refinements = [];

  if (/\b(machine learning|ml engineer|ai engineer|artificial intelligence|computer vision|nlp)\b/.test(lower)) {
    refinements.push('machine_learning_ai');
  }
  if (/\b(data scientist|applied scientist|statistical modeling|statistical modelling)\b/.test(lower)) {
    refinements.push('data_science');
  }
  if (/\b(data analyst|business intelligence|analytics analyst|bi analyst)\b/.test(lower)) {
    refinements.push('data_analytics');
  }
  if (/\b(co-?op)\b/.test(lower)) {
    refinements.push('co_op');
  }
  if (/\b(apprentice|apprenticeship)\b/.test(lower)) {
    refinements.push('apprenticeship');
  }

  const unique = [...new Set(refinements.filter((value) => value && value !== sourceCategory))];
  return {
    careerSubcategory: unique[0] || null,
    tags: unique,
  };
}

export function refineEmploymentType({ title, sourceEmploymentType }) {
  const lower = String(title || '').toLowerCase();
  if (/\b(co-?op)\b/.test(lower)) return 'co_op';
  if (/\b(apprentice|apprenticeship)\b/.test(lower)) return 'apprenticeship';
  return sourceEmploymentType || 'internship';
}
