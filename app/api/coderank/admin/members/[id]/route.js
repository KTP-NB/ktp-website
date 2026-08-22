import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/coderank/auth';
import { profileHasPermission } from '@/lib/adminAccess';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { withNoStore } from '@/lib/coderank/noStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

const MEMBER_FIELDS =
  'id, user_id, name, email, position, pledge_class, member_status, graduation_year, major, photo_url';

/** GET — member detail + their current resume notes. `[id]` = member_profiles.id. */
export async function GET(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = params;
  const service = getServiceClient();

  const { data: member, error: memberErr } = await service
    .from('member_profiles')
    .select(MEMBER_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (memberErr) return withNoStore(NextResponse.json({ error: memberErr.message }, { status: 500 }));
  if (!member) return withNoStore(NextResponse.json({ error: 'Member not found' }, { status: 404 }));

  const { data: notesRow, error: notesErr } = await service
    .from('member_resume_notes')
    .select('notes, updated_at')
    .eq('profile_id', id)
    .maybeSingle();

  if (notesErr) return withNoStore(NextResponse.json({ error: notesErr.message }, { status: 500 }));

  // The resume itself is only for people who hold the Resumes tab.
  if (profileHasPermission(auth.profile, 'resumes.manage')) {
    const { data: resume } = await service
      .from('member_resumes')
      .select('url, storage_path')
      .eq('member_id', id)
      .maybeSingle();
    member.resume_url = resume?.url || null;
    member.resume_storage_path = resume?.storage_path || null;
  }

  return withNoStore(NextResponse.json({ member, notes: notesRow || null }));
}

/** PUT — upsert the resume notes for this member. Body: { notes }. */
export async function PUT(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const notes = typeof body.notes === 'string' ? body.notes : '';

  const service = getServiceClient();

  // Look up the member's auth user_id so the SELECT-own RLS policy lets them read it.
  const { data: member, error: memberErr } = await service
    .from('member_profiles')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();

  if (memberErr) return withNoStore(NextResponse.json({ error: memberErr.message }, { status: 500 }));
  if (!member) return withNoStore(NextResponse.json({ error: 'Member not found' }, { status: 404 }));

  const { data: saved, error: upsertErr } = await service
    .from('member_resume_notes')
    .upsert(
      {
        profile_id: member.id,
        user_id: member.user_id,
        notes,
        updated_by: auth.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' },
    )
    .select('notes, updated_at')
    .single();

  if (upsertErr) return withNoStore(NextResponse.json({ error: upsertErr.message }, { status: 500 }));

  return withNoStore(NextResponse.json({ notes: saved }));
}
