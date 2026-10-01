export function generateDeterministicSuggestions({ result, mode }) {
  const suggestions = [];

  for (const skill of (result.missingSkills || []).slice(0, 5)) {
    suggestions.push({
      type: 'missing_skill',
      title: `Add evidence for ${format(skill)}`,
      message: `If you have experience with ${format(skill)}, include it in a skills section or a project bullet.`,
    });
  }

  for (const keyword of (result.missingKeywords || []).slice(0, 5)) {
    suggestions.push({
      type: 'missing_keyword',
      title: `Mention ${format(keyword)} where truthful`,
      message: `The ${mode === 'general' ? 'target role' : 'job description'} emphasizes ${format(keyword)}.`,
    });
  }

  if ((result.projectRelevance?.score || 0) < 0.5) {
    suggestions.push({
      type: 'project_relevance',
      title: 'Strengthen project alignment',
      message: 'Add one project bullet that names the relevant tools and the measurable outcome.',
    });
  }

  if ((result.experienceAlignment?.score || 0) < 0.5) {
    suggestions.push({
      type: 'experience_alignment',
      title: 'Make experience easier to scan',
      message: 'Use action verbs, technologies, and impact metrics in recent experience bullets.',
    });
  }

  return suggestions.slice(0, 8);
}

function format(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
