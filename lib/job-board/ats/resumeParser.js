import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { KNOWN_SKILLS } from './taxonomy.js';
import { includesTerm, normalizeText, sectionText, unique } from './textUtils.js';

export async function extractPdfText(buffer) {
  const result = await pdfParse(buffer);
  return normalizeText(result.text);
}

export function parseResumeText(text) {
  const plainText = normalizeText(text);
  const skills = extractSkills(plainText);

  return {
    plainText,
    skills,
    education: linesFromSection(plainText, ['education']),
    experience: linesFromSection(plainText, ['experience', 'work experience', 'professional experience']),
    projects: linesFromSection(plainText, ['projects', 'technical projects']),
    certifications: linesFromSection(plainText, ['certifications', 'licenses']),
  };
}

export function extractSkills(text) {
  return unique(KNOWN_SKILLS.filter((skill) => includesTerm(text, skill))).sort();
}

function linesFromSection(text, headings) {
  const section = sectionText(text, headings);
  if (!section) return [];
  return section
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter((line) => line.length > 2)
    .slice(0, 20);
}
