import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { withNoStore } from '@/lib/coderank/noStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const service = getServiceClient();
  const { data, error } = await service
    .from('cr_questions')
    .select('id, slug, title, difficulty, category, pattern, default_language')
    .order('category', { ascending: true })
    .order('title', { ascending: true });

  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));
  return withNoStore(NextResponse.json({ questions: data }));
}
