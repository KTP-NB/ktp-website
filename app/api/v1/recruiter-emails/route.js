import { apiError } from '@/lib/applications/apiAuth';
import { emailResponse, requireRecruiterEmailUser } from '@/lib/recruiter-emails/server';
import { cleanRecruiterEmail, EMAIL_FIELDS, MAX_BATCH, parseEmailFilters } from '@/lib/recruiter-emails/validation.mjs';

export async function GET(request) {
  const auth = await requireRecruiterEmailUser(request);
  if (auth.error) return auth.error;
  const { value: filters, errors } = parseEmailFilters(new URL(request.url).searchParams);
  if (errors.length) return apiError('Invalid filters.', 400, errors);
  const { page, limit, from, to, search } = filters;
  const pattern = search ? `%${search.replace(/[\\%_]/g, '\\$&')}%` : null;
  const before = to ? new Date(new Date(`${to}T00:00:00Z`).getTime() + 86400000).toISOString() : null;
  let query = auth.service.from('recruiter_emails').select(EMAIL_FIELDS)
    .eq('user_id', auth.user.id).is('deleted_at', null)
    .order('sent_at', { ascending: false }).order('id', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (from) query = query.gte('sent_at', `${from}T00:00:00Z`);
  if (before) query = query.lt('sent_at', before);
  if (pattern) query = query.ilike('search_text', pattern);
  const [{ data, error }, summary] = await Promise.all([
    query,
    auth.service.rpc('recruiter_email_summary', { owner_id: auth.user.id, search_pattern: pattern, from_date: from ? `${from}T00:00:00Z` : null, before_date: before }),
  ]);
  if (error || summary.error) return apiError('Unable to load recruiter emails.', 500);
  return emailResponse({ data: data || [], summary: summary.data, pagination: { page, limit, total: summary.data.emails } });
}

export async function POST(request) {
  const auth = await requireRecruiterEmailUser(request);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return apiError('Request body must be an email or an emails array.');
  if (Object.hasOwn(body, 'emails') && Object.keys(body).some((key) => key !== 'emails')) return apiError('A batch accepts only the emails field.');
  const items = Object.hasOwn(body, 'emails') ? body.emails : [body];
  if (!Array.isArray(items) || !items.length || items.length > MAX_BATCH) return apiError(`Submit between 1 and ${MAX_BATCH} emails per request.`);
  const results = [];
  for (let index = 0; index < items.length; index += 1) {
    const parsed = cleanRecruiterEmail(items[index], { requireSource: Boolean(auth.apiKey) });
    if (parsed.errors.length) { results.push({ index, status: 'invalid', errors: parsed.errors }); continue; }
    const payload = { ...parsed.value, user_id: auth.user.id, entry_source: parsed.value.message_id ? 'email' : 'manual' };
    const { data, error } = await auth.service.from('recruiter_emails').insert(payload).select(EMAIL_FIELDS).single();
    if (error?.code === '23505' && payload.message_id) {
      const existing = await auth.service.from('recruiter_emails').select(`deleted_at,${EMAIL_FIELDS}`)
        .eq('user_id', auth.user.id).eq('provider', payload.provider).eq('mailbox_id', payload.mailbox_id).eq('message_id', payload.message_id).maybeSingle();
      if (existing.error || !existing.data) results.push({ index, status: 'failed', errors: ['Unable to check duplicate. Retry this row.'] });
      else if (existing.data.deleted_at) results.push({ index, status: 'ignored' });
      else {
        const { deleted_at, ...email } = existing.data;
        results.push({ index, status: 'duplicate', email });
      }
    } else if (error) results.push({ index, status: 'failed', errors: ['Unable to save email. Retry this row.'] });
    else results.push({ index, status: 'created', email: data });
  }
  const count = (status) => results.filter((result) => result.status === status).length;
  return emailResponse({ created: count('created'), duplicates: count('duplicate'), ignored: count('ignored'), failed: count('failed') + count('invalid'), results }, count('created') ? 201 : 200);
}
