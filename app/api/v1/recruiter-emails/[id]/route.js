import { apiError } from '@/lib/applications/apiAuth';
import { emailResponse, requireRecruiterEmailUser } from '@/lib/recruiter-emails/server';
import { cleanRecruiterEmail, EMAIL_FIELDS, isEmailId } from '@/lib/recruiter-emails/validation.mjs';

export async function GET(request, { params }) {
  const auth = await requireRecruiterEmailUser(request);
  if (auth.error) return auth.error;
  if (!isEmailId(params.id)) return apiError('Invalid email ID.');
  const { data, error } = await auth.service.from('recruiter_emails').select(EMAIL_FIELDS)
    .eq('user_id', auth.user.id).eq('id', params.id).is('deleted_at', null).maybeSingle();
  if (error) return apiError('Unable to load email.', 500);
  return data ? emailResponse({ data }) : apiError('Email not found.', 404);
}

export async function PATCH(request, { params }) {
  const auth = await requireRecruiterEmailUser(request);
  if (auth.error) return auth.error;
  if (!isEmailId(params.id)) return apiError('Invalid email ID.');
  const body = await request.json().catch(() => null);
  const { value, errors } = cleanRecruiterEmail(body, { partial: true });
  if (errors.length) return apiError('Validation failed.', 400, errors);
  const { data, error } = await auth.service.from('recruiter_emails').update(value)
    .eq('user_id', auth.user.id).eq('id', params.id).is('deleted_at', null).select(EMAIL_FIELDS).maybeSingle();
  if (error) return apiError('Unable to update email.', 500);
  return data ? emailResponse({ data }) : apiError('Email not found.', 404);
}

export async function DELETE(request, { params }) {
  const auth = await requireRecruiterEmailUser(request, { websiteOnly: true });
  if (auth.error) return auth.error;
  if (!isEmailId(params.id)) return apiError('Invalid email ID.');
  // Keep source identity for retry protection, while removing the email's personal content.
  const { data, error } = await auth.service.from('recruiter_emails').update({
    deleted_at: new Date().toISOString(), recipients: [],
    company: null, position: null, subject: null, notes: null, thread_id: null, source_url: null,
    sent_at: '1970-01-01T00:00:00.000Z',
  }).eq('user_id', auth.user.id).eq('id', params.id).is('deleted_at', null).select('id').maybeSingle();
  if (error) return apiError('Unable to delete email.', 500);
  return data ? emailResponse({ deleted: true }) : apiError('Email not found.', 404);
}
