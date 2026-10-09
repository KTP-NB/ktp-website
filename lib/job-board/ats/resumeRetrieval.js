import crypto from 'node:crypto';
import { getJobBoardServiceClient } from '../supabaseServer.js';

export async function getLatestResumeForUser(userId) {
  const service = getJobBoardServiceClient();
  const { data: profile, error } = await service
    .from('member_profiles')
    .select('id, user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  const { data: resumeRow, error: resumeError } = profile
    ? await service.from('member_resumes').select('bucket, storage_path, updated_at').eq('member_id', profile.id).maybeSingle()
    : { data: null, error: null };
  if (resumeError) throw resumeError;
  const pointer = resolveResumePointer(resumeRow);
  if (!profile || !pointer) {
    const err = new Error('Upload a PDF resume in Member Account before running ATS analysis.');
    err.status = 400;
    throw err;
  }

  const { data, error: downloadError } = await service.storage
    .from(pointer.bucket)
    .download(pointer.path);

  if (downloadError) throw downloadError;

  const buffer = Buffer.from(await data.arrayBuffer());
  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    profile,
    bucket: pointer.bucket,
    path: pointer.path,
    version: pointer.version || contentHash,
    buffer,
    contentHash,
  };
}

export function resolveResumePointer(row) {
  if (!row?.storage_path) return null;
  return {
    bucket: row.bucket || 'member-resumes',
    path: row.storage_path,
    version: row.updated_at || null,
  };
}
