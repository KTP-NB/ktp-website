export const EMAIL_FIELDS = 'id,recipients,company,position,subject,sent_at,notes,provider,mailbox_id,message_id,thread_id,source_url,entry_source,created_at,updated_at';
export const MAX_BATCH = 50;
const SOURCE_FIELDS = ['provider', 'mailbox_id', 'message_id', 'thread_id'];
const TEXT_LIMITS = { company: 160, position: 200, subject: 500, notes: 5000, provider: 40, mailbox_id: 320, message_id: 500, thread_id: 500, source_url: 2000 };
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function cleanRecruiterEmail(input, { partial = false, requireSource = false } = {}) {
  const value = {};
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { value, errors: ['Each email must be an object.'] };
  const allowed = new Set([...Object.keys(TEXT_LIMITS), 'recipients', 'sent_at']);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) errors.push(`Unknown field: ${key}.`);
    if (partial && SOURCE_FIELDS.includes(key)) errors.push(`${key} cannot be changed after import.`);
  }
  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    if (!(key in input)) continue;
    if (input[key] !== null && typeof input[key] !== 'string') { errors.push(`${key} must be text.`); continue; }
    const text = input[key]?.trim() || null;
    if (text && (text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))) errors.push(`${key} is too long or contains invalid characters.`);
    value[key] = text;
  }
  if (value.provider) {
    value.provider = value.provider.toLowerCase();
    if (!/^[a-z][a-z0-9_-]*$/.test(value.provider)) errors.push('provider must be a short identifier such as gmail or outlook.');
  }
  if ('recipients' in input || !partial) {
    if (!Array.isArray(input.recipients) || !input.recipients.length || input.recipients.length > 20) {
      errors.push('Provide between 1 and 20 recruiter recipients.');
    } else {
      value.recipients = [];
      const seen = new Set();
      for (const recipient of input.recipients) {
        const email = typeof recipient?.email === 'string' ? recipient.email.trim().toLowerCase() : '';
        const name = typeof recipient?.name === 'string' ? recipient.name.trim() : null;
        if (!EMAIL_PATTERN.test(email) || email.length > 320 || (name?.length || 0) > 200 || /[\u0000-\u001f\u007f]/.test(email + (name || '')) || (recipient?.name != null && typeof recipient.name !== 'string')) {
          errors.push('Each recipient needs a valid email and an optional name of up to 200 characters.');
          continue;
        }
        if (!seen.has(email)) value.recipients.push({ email, name: name || null });
        seen.add(email);
      }
    }
  }
  if ('sent_at' in input || !partial) {
    const timestamp = input.sent_at;
    const parsed = typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) ? new Date(timestamp) : null;
    const day = typeof timestamp === 'string' ? timestamp.slice(0, 10) : '';
    const calendarDate = new Date(`${day}T00:00:00Z`);
    if (!parsed || Number.isNaN(parsed.getTime()) || Number.isNaN(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== day) errors.push('sent_at must be a real ISO timestamp with a timezone.');
    else value.sent_at = parsed.toISOString();
  }
  if (value.source_url) {
    try {
      const url = new URL(value.source_url);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error();
    } catch { errors.push('source_url must be an http or https URL without credentials.'); }
  }
  if (!partial) {
    const identity = [value.provider, value.mailbox_id, value.message_id];
    if ((requireSource || identity.some(Boolean)) && !identity.every(Boolean)) errors.push('Imports require provider, mailbox_id, and message_id.');
    if (value.thread_id && !identity.every(Boolean)) errors.push('thread_id requires a complete source identity.');
  }
  if (partial && !Object.keys(value).length) errors.push('Provide at least one editable field.');
  return { value, errors };
}

export function parseEmailFilters(params) {
  const errors = [];
  const value = { page: 1, limit: 50 };
  for (const [key, max] of [['page', 1000000], ['limit', 100]]) {
    if (!params.has(key)) continue;
    const number = Number(params.get(key));
    if (!Number.isInteger(number) || number < 1 || number > max) errors.push(`${key} must be between 1 and ${max}.`);
    else value[key] = number;
  }
  for (const key of ['from', 'to']) {
    const date = params.get(key);
    if (!date) continue;
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
    if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) errors.push(`${key} must be a real date in YYYY-MM-DD format.`);
    else value[key] = date;
  }
  if (value.from && value.to && value.from > value.to) errors.push('from must be on or before to.');
  if (params.get('search')) {
    value.search = params.get('search').trim();
    if (value.search.length > 200) errors.push('search must be 200 characters or fewer.');
  }
  return { value, errors };
}

export function isEmailId(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
