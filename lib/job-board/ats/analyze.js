import { getJobBoardServiceClient } from '../supabaseServer.js';
import { getOrCreateResumeParse, resumeParseToModel } from './cache.js';
import { parseJob, profileForRole } from './jobParser.js';
import { generateDeterministicSuggestions } from './recommendations.js';
import { getLatestResumeForUser } from './resumeRetrieval.js';
import { scoreResumeAgainstJob } from './scoring.js';

export async function analyzeForJob({ userId, jobId }) {
  const service = getJobBoardServiceClient();
  const { data: job, error } = await service
    .from('job_board_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('status', 'open')
    .maybeSingle();

  if (error) throw error;
  if (!job) {
    const err = new Error('Job not found.');
    err.status = 404;
    throw err;
  }

  return createAnalysis({
    userId,
    mode: 'job',
    job,
    parsedJob: parseJob(job),
  });
}

export async function analyzeForRole({ userId, targetRole }) {
  return createAnalysis({
    userId,
    mode: 'general',
    targetRole,
    job: null,
    parsedJob: profileForRole(targetRole),
  });
}

async function createAnalysis({ userId, mode, job, parsedJob, targetRole = null }) {
  const service = getJobBoardServiceClient();
  const resume = await getLatestResumeForUser(userId);
  const resumeParse = await getOrCreateResumeParse({ userId, resume });
  const parsedResume = resumeParseToModel(resumeParse);
  const result = scoreResumeAgainstJob(parsedResume, parsedJob);
  const suggestions = generateDeterministicSuggestions({ result, mode });

  const { data, error } = await service
    .from('job_board_ats_analyses')
    .insert({
      user_id: userId,
      job_id: job?.id || null,
      resume_parse_id: resumeParse.id,
      analysis_mode: mode,
      target_role: targetRole,
      status: 'completed',
      resume_storage_path: resume.path,
      job_description_snapshot: parsedJob.plainText,
      score: result.score,
      score_breakdown: result.scoreBreakdown,
      matched_skills: result.matchedSkills,
      missing_skills: result.missingSkills,
      matched_keywords: result.matchedKeywords,
      missing_keywords: result.missingKeywords,
      experience_alignment: result.experienceAlignment,
      education_alignment: result.educationAlignment,
      project_relevance: result.projectRelevance,
      recommendations: suggestions,
      parsed_resume_snapshot: {
        skills: parsedResume.skills,
        education: parsedResume.education,
        experience: parsedResume.experience,
        projects: parsedResume.projects,
        certifications: parsedResume.certifications,
      },
      parsed_job_snapshot: parsedJob,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
