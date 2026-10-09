import { ROLE_PROFILES } from './taxonomy.js';
import { includesTerm, normalizeText, splitKeywords, unique } from './textUtils.js';

export function parseJob(job) {
  const text = normalizeText([
    job?.title,
    job?.company,
    job?.department,
    job?.description,
    ...(job?.responsibilities || []),
    ...(job?.qualifications || []),
    ...(job?.benefits || []),
  ].join('\n'));

  const roleProfile = ROLE_PROFILES[job?.career_category || job?.careerCategory] || null;
  const profileSkills = [
    ...(roleProfile?.requiredSkills || []),
    ...(roleProfile?.preferredSkills || []),
  ];
  const explicitKeywords = splitKeywords(job?.normalized_keywords?.join?.(',') || job?.normalizedKeywords?.join?.(','));
  const requiredSkills = unique([
    ...profileSkills.filter((skill) => includesTerm(text, skill)),
    ...explicitKeywords,
  ]).sort();
  const preferredSkills = unique((roleProfile?.preferredSkills || []).filter((skill) => includesTerm(text, skill))).sort();
  const technologies = unique([...requiredSkills, ...preferredSkills]).sort();

  return {
    plainText: text,
    requiredSkills,
    preferredSkills,
    technologies,
    experienceRequirements: extractExperienceRequirements(text),
    degreeRequirements: extractDegreeRequirements(text, roleProfile),
    responsibilities: job?.responsibilities || [],
    keywords: unique([
      ...(roleProfile?.keywords || []).filter((keyword) => includesTerm(text, keyword)),
      ...requiredSkills,
      ...preferredSkills,
    ]).sort(),
  };
}

export function profileForRole(targetRole) {
  const profile = ROLE_PROFILES[targetRole] || ROLE_PROFILES.software_engineering;
  return {
    plainText: [
      profile.label,
      ...profile.requiredSkills,
      ...profile.preferredSkills,
      ...profile.keywords,
      ...profile.degrees,
    ].join('\n'),
    requiredSkills: profile.requiredSkills,
    preferredSkills: profile.preferredSkills,
    technologies: unique([...profile.requiredSkills, ...profile.preferredSkills]).sort(),
    experienceRequirements: [],
    degreeRequirements: profile.degrees,
    responsibilities: [],
    keywords: profile.keywords,
  };
}

function extractExperienceRequirements(text) {
  const matches = [...text.matchAll(/(\d+)\+?\s+years?[^.\n]*/gi)];
  return matches.map((match) => match[0].trim()).slice(0, 5);
}

function extractDegreeRequirements(text, roleProfile) {
  const degreeTerms = ['bachelor', 'master', ...(roleProfile?.degrees || [])];
  return unique(degreeTerms.filter((term) => includesTerm(text, term))).sort();
}
