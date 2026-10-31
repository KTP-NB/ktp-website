import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { apiError, isApiKeyRequest } from '@/lib/applications/apiAuth';

export async function requireRecruiterEmailUser(request, { websiteOnly = false } = {}) {
  if (websiteOnly && isApiKeyRequest(request)) return { error: apiError('Delete recruiter emails through the website.', 403) };
  const auth = await requirePermission(request, 'recruiter_emails.use');
  if (auth.error) return auth;
  if (auth.profile?.member_status?.toLowerCase() !== 'active') return { error: apiError('Only active members can use recruiter outreach.', 403) };
  return { ...auth, service: getServiceClient() };
}

export function emailResponse(data, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
