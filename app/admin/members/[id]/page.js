'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FileText, ExternalLink, Loader2, ShieldAlert, Save, StickyNote } from 'lucide-react';
import AuthGate from '@/components/authgate';
import FadeIn from '@/components/FadeIn';
import { useAuth } from '@/components/authprovider';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';
import { api } from '@/lib/coderank/clientFetch';

/* ─── Positions that grant Admin Portal access (mirrors AdminPortalClient) ─── */
const ADMIN_POSITIONS = ['vp of tech development', 'vp of prof development'];

function hasAdminAccess(position) {
  if (!position) return false;
  const pos = position.toLowerCase();
  return ADMIN_POSITIONS.some((admin) => pos.includes(admin));
}

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return null;
  }
}

export default function AdminMemberPage() {
  return (
    <AuthGate>
      <AdminMemberReview />
    </AuthGate>
  );
}

function AdminMemberReview() {
  const { user } = useAuth();
  const params = useParams();
  const memberId = params?.id;

  const [userPosition, setUserPosition] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    if (!hasSupabaseConfig) {
      setCheckingAccess(false);
      return;
    }

    let isMounted = true;

    async function checkPosition() {
      let { data } = await supabase
        .from('member_profiles')
        .select('position')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data && user.email) {
        const { data: emailData } = await supabase
          .from('member_profiles')
          .select('position')
          .eq('email', user.email)
          .maybeSingle();
        data = emailData;
      }

      if (!isMounted) return;
      setUserPosition(data?.position || null);
      setCheckingAccess(false);
    }

    checkPosition();
    return () => { isMounted = false; };
  }, [user?.id, user?.email]);

  const isAuthorized = useMemo(() => hasAdminAccess(userPosition), [userPosition]);

  if (checkingAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-white">
        <FadeIn className="text-center max-w-md">
          <ShieldAlert size={48} className="mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
          <p className="text-white/60">
            This page is only accessible to executive board members with VP positions.
          </p>
        </FadeIn>
      </main>
    );
  }

  return <MemberDetail memberId={memberId} />;
}

function MemberDetail({ memberId }) {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!memberId) return;
    let isMounted = true;

    setLoading(true);
    setError(null);

    api(`/api/coderank/admin/members/${memberId}`)
      .then((res) => {
        if (!isMounted) return;
        setMember(res.member);
        setNotes(res.notes?.notes || '');
        setSavedNotes(res.notes?.notes || '');
        setUpdatedAt(res.notes?.updated_at || null);
      })
      .catch((e) => { if (isMounted) setError(e.message); })
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, [memberId]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api(`/api/coderank/admin/members/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify({ notes }),
      });
      setSavedNotes(res.notes?.notes || '');
      setUpdatedAt(res.notes?.updated_at || null);
      setMessage({ type: 'success', text: 'Notes saved.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to save notes.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </main>
    );
  }

  if (error || !member) {
    return (
      <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
        <FadeIn className="mx-auto w-full max-w-3xl">
          <Link href="/admin" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition mb-6">
            <ArrowLeft size={16} /> Back to Admin Portal
          </Link>
          <div className="rounded-xl border border-red-300/25 bg-red-400/10 px-5 py-4 text-sm text-red-100">
            {error || 'Member not found.'}
          </div>
        </FadeIn>
      </main>
    );
  }

  const meta = [member.member_status, member.pledge_class, member.major, member.graduation_year]
    .filter(Boolean)
    .join(' · ');
  const dirty = notes !== savedNotes;
  const formattedUpdatedAt = formatDate(updatedAt);

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
      <FadeIn className="mx-auto w-full max-w-3xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition mb-6">
          <ArrowLeft size={16} /> Back to Admin Portal
        </Link>

        {/* Member header */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/5">
              <img
                src={member.photo_url || '/ktp-icon.png'}
                alt={member.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight truncate">{member.name}</h1>
              {meta && <p className="mt-1 text-sm text-white/60">{meta}</p>}
              {member.email && <p className="mt-0.5 text-sm text-white/40 truncate">{member.email}</p>}
            </div>

            {/* Resume button */}
            {member.resume_url ? (
              <a
                href={member.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition shrink-0"
              >
                <ExternalLink size={16} /> View Resume
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/40 shrink-0">
                <FileText size={16} /> No resume uploaded
              </span>
            )}
          </div>
        </div>

        {/* Resume notes */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl md:p-8">
          <div className="flex items-center gap-2 mb-1">
            <StickyNote size={20} className="text-amber-300" />
            <h2 className="text-xl font-bold">Resume Notes</h2>
          </div>
          <p className="text-sm text-white/60 mb-5">
            Feedback you write here is visible to {member.name?.split(' ')[0] || 'the member'} on their profile page.
          </p>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={10}
            placeholder="Write your resume review and notes for this member..."
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-blue-300 resize-y"
          />

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Notes'}
            </button>
            {formattedUpdatedAt && (
              <span className="text-xs text-white/40">Last updated {formattedUpdatedAt}</span>
            )}
          </div>

          {message && (
            <p
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'border border-emerald-300/25 bg-emerald-400/10 text-emerald-100'
                  : 'border border-red-300/25 bg-red-400/10 text-red-100'
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      </FadeIn>
    </main>
  );
}
