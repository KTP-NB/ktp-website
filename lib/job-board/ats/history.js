import { getJobBoardServiceClient } from '../supabaseServer.js';

export async function listAnalyses({ userId }) {
  const service = getJobBoardServiceClient();
  const { data, error } = await service
    .from('job_board_ats_analyses')
    .select('id, job_id, analysis_mode, target_role, score, matched_skills, missing_skills, missing_keywords, recommendations, experience_alignment, education_alignment, project_relevance, created_at, job_board_jobs ( id, title, company )')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) throw error;
  return data || [];
}
