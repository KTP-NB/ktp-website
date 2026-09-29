import { createClient } from '@supabase/supabase-js';
import { legacyApplicationDraft } from '../lib/job-board/trackerBridge.js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Supabase URL or service key is missing');

const apply = process.argv.includes('--apply');
const service = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: rows, error } = await service
  .from('job_board_applications')
  .select('id,user_id,status,notes,application_url,applied_at,created_at,job_board_jobs(company,title,apply_url,source)');
if (error) throw error;

const result = { legacy: rows.length, eligible: 0, alreadyPresent: 0, inserted: 0, skipped: 0 };
for (const row of rows) {
  const draft = legacyApplicationDraft(row);
  if (!draft) { result.skipped += 1; continue; }
  result.eligible += 1;

  const { data: byExternalId, error: externalError } = await service
    .from('internship_applications').select('id')
    .eq('user_id', draft.user_id).eq('external_id', draft.external_id).maybeSingle();
  if (externalError) throw externalError;
  const { data: byFields, error: fieldsError } = await service
    .from('internship_applications').select('id')
    .eq('user_id', draft.user_id).eq('company', draft.company)
    .eq('position', draft.position).eq('date_applied', draft.date_applied).limit(1);
  if (fieldsError) throw fieldsError;
  if (byExternalId || byFields?.length) { result.alreadyPresent += 1; continue; }

  if (apply) {
    const { error: insertError } = await service.from('internship_applications').insert(draft);
    if (insertError) throw insertError;
    result.inserted += 1;
  }
}
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...result }));
