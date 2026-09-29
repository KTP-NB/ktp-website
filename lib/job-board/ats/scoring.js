import { includesTerm, unique } from './textUtils.js';

const WEIGHTS = {
  skillOverlap: 40,
  requiredKeywordCoverage: 20,
  preferredKeywordCoverage: 10,
  experienceAlignment: 15,
  educationAlignment: 10,
  projectRelevance: 5,
};

export function scoreResumeAgainstJob(resume, job) {
  const resumeText = resume.plainText || '';
  const resumeSkills = resume.skills || [];
  const requiredSkills = job.requiredSkills || [];
  const preferredSkills = job.preferredSkills || [];
  const keywords = job.keywords || [];

  const matchedSkills = unique(requiredSkills.filter((skill) => hasSkill(resumeSkills, resumeText, skill))).sort();
  const missingSkills = unique(requiredSkills.filter((skill) => !hasSkill(resumeSkills, resumeText, skill))).sort();
  const matchedKeywords = unique(keywords.filter((keyword) => includesTerm(resumeText, keyword))).sort();
  const missingKeywords = unique(keywords.filter((keyword) => !includesTerm(resumeText, keyword))).sort();
  const matchedPreferred = unique(preferredSkills.filter((skill) => hasSkill(resumeSkills, resumeText, skill))).sort();

  const skillScore = ratioScore(matchedSkills.length, requiredSkills.length || Math.max(resumeSkills.length, 1));
  const requiredKeywordScore = ratioScore(matchedKeywords.length, keywords.length);
  const preferredKeywordScore = ratioScore(matchedPreferred.length, preferredSkills.length);
  const experience = scoreExperience(resume, job);
  const education = scoreEducation(resume, job);
  const projects = scoreProjects(resume, job);

  const score = Math.round(
    skillScore * WEIGHTS.skillOverlap
    + requiredKeywordScore * WEIGHTS.requiredKeywordCoverage
    + preferredKeywordScore * WEIGHTS.preferredKeywordCoverage
    + experience.score * WEIGHTS.experienceAlignment
    + education.score * WEIGHTS.educationAlignment
    + projects.score * WEIGHTS.projectRelevance
  );

  return {
    score,
    matchedSkills,
    missingSkills,
    matchedKeywords,
    missingKeywords,
    experienceAlignment: experience,
    educationAlignment: education,
    projectRelevance: projects,
    scoreBreakdown: {
      skillOverlap: Math.round(skillScore * WEIGHTS.skillOverlap),
      requiredKeywordCoverage: Math.round(requiredKeywordScore * WEIGHTS.requiredKeywordCoverage),
      preferredKeywordCoverage: Math.round(preferredKeywordScore * WEIGHTS.preferredKeywordCoverage),
      experienceAlignment: Math.round(experience.score * WEIGHTS.experienceAlignment),
      educationAlignment: Math.round(education.score * WEIGHTS.educationAlignment),
      projectRelevance: Math.round(projects.score * WEIGHTS.projectRelevance),
    },
  };
}

function hasSkill(skills, text, skill) {
  return skills.includes(skill) || includesTerm(text, skill);
}

function ratioScore(matched, total) {
  if (!total) return 1;
  return Math.min(1, matched / total);
}

function scoreExperience(resume, job) {
  const experienceText = (resume.experience || []).join('\n') || resume.plainText || '';
  const required = job.experienceRequirements || [];
  const matched = required.filter((item) => includesTerm(experienceText, item.replace(/\d+\+?\s+years?/i, '').trim()));
  const score = required.length ? ratioScore(matched.length, required.length) : (resume.experience?.length ? 0.8 : 0.45);
  return { score, matched, required };
}

function scoreEducation(resume, job) {
  const educationText = (resume.education || []).join('\n');
  const required = job.degreeRequirements || [];
  const matched = required.filter((item) => includesTerm(educationText, item));
  const score = required.length ? ratioScore(matched.length, required.length) : (educationText ? 1 : 0.4);
  return { score, matched, required };
}

function scoreProjects(resume, job) {
  const projectText = (resume.projects || []).join('\n');
  const technologies = job.technologies || [];
  const matched = technologies.filter((item) => includesTerm(projectText, item));
  const score = technologies.length ? ratioScore(matched.length, Math.min(technologies.length, 5)) : (projectText ? 1 : 0.4);
  return { score: Math.min(1, score), matched, technologies };
}
