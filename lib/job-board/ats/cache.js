import { getJobBoardServiceClient } from '../supabaseServer.js';
import { extractPdfText, parseResumeText } from './resumeParser.js';

export async function getOrCreateResumeParse({ userId, resume }) {
  const service = getJobBoardServiceClient();
  const { data: cached, error } = await service
    .from('job_board_resume_parses')
    .select('*')
    .eq('user_id', userId)
    .eq('resume_storage_path', resume.path)
    .eq('content_hash', resume.contentHash)
    .eq('parser_version', 'deterministic-v1')
    .maybeSingle();

  if (error) throw error;
  if (cached) return cached;

  const plainText = await extractPdfText(resume.buffer);
  if (!plainText || plainText.length < 40) {
    const err = new Error('Unable to extract usable text from this PDF resume.');
    err.status = 422;
    throw err;
  }

  const parsed = parseResumeText(plainText);
  const { data, error: insertError } = await service
    .from('job_board_resume_parses')
    .insert({
      user_id: userId,
      resume_bucket: resume.bucket,
      resume_storage_path: resume.path,
      resume_version: resume.version,
      content_hash: resume.contentHash,
      plain_text: parsed.plainText,
      skills: parsed.skills,
      education: parsed.education,
      experience: parsed.experience,
      projects: parsed.projects,
      certifications: parsed.certifications,
    })
    .select('*')
    .single();

  if (insertError) throw insertError;
  return data;
}

export function resumeParseToModel(row) {
  return {
    plainText: row.plain_text,
    skills: row.skills || [],
    education: row.education || [],
    experience: row.experience || [],
    projects: row.projects || [],
    certifications: row.certifications || [],
  };
}
