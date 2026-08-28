import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { withNoStore } from '@/lib/coderank/noStore';
import { processApplicationRequirementFines } from '@/lib/applicationFines.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const auth = await requirePermission(request, 'applications.manage');
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  try {
    const result = await processApplicationRequirementFines(getServiceClient(), body.month, auth.user.id);
    return withNoStore(NextResponse.json({ result }));
  } catch (error) {
    const invalid = error?.message === 'A valid month is required.' || error?.message?.startsWith('Fines can only');
    return withNoStore(NextResponse.json({ error: error?.message || 'Fine processing failed.' }, { status: invalid ? 400 : 500 }));
  }
}
