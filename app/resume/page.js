'use client';

import { useEffect, useState } from 'react';
import { FileText, Upload, Trash2, ExternalLink } from 'lucide-react';
import AuthGate from '@/components/authgate';
import AccountShell from '@/components/AccountShell';
import { useAuth } from '@/components/authprovider';
import { useConfirmToast } from '@/components/ConfirmToast';
import { supabase } from '@/lib/supabase';

const RESUME_BUCKET = 'member-resumes';

function fileExtension(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension || 'pdf';
}

function fileSafeName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'member';
}

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return null;
  }
}

function MemberResume() {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState(null);
  const [memberName, setMemberName] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumePath, setResumePath] = useState('');
  const [resumeNotes, setResumeNotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null);
  const { confirm, confirmationToast } = useConfirmToast();

  useEffect(() => {
    if (!user?.id) return undefined;

    let isMounted = true;

    async function loadResume() {
      setLoading(true);
      setMessage(null);

      const { data: profile, error } = await supabase
        .from('member_profiles')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setMessage({ type: 'error', text: error.message });
        setLoading(false);
        return;
      }

      if (!profile) {
        setMessage({ type: 'error', text: 'No member profile is linked to this account yet.' });
        setLoading(false);
        return;
      }

      setProfileId(profile.id);
      setMemberName(profile.name || '');

      // Resumes live in member_resumes; RLS limits this to the member's own row.
      const { data: resumeRow } = await supabase
        .from('member_resumes')
        .select('url, storage_path')
        .eq('member_id', profile.id)
        .maybeSingle();

      if (isMounted && resumeRow) {
        setResumeUrl(resumeRow.url || '');
        setResumePath(resumeRow.storage_path || '');
      }

      // Resume feedback written by admins (RLS limits this to the member's own row).
      const { data: notesRow } = await supabase
        .from('member_resume_notes')
        .select('notes, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (isMounted && notesRow?.notes) {
        setResumeNotes(notesRow);
      }

      if (isMounted) setLoading(false);
    }

    loadResume();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  async function handleUpload(file) {
    if (!file || !user || !profileId) return;

    setUploading(true);
    setMessage(null);

    try {
      const extension = fileExtension(file);
      const version = Date.now();
      const path = `resumes/${user.id}/${fileSafeName(memberName)}-resume.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(RESUME_BUCKET)
        .upload(path, file, {
          contentType: file.type || 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from(RESUME_BUCKET).getPublicUrl(path).data.publicUrl;
      const versionedUrl = `${publicUrl}?v=${version}`;

      const { error: updateError } = await supabase
        .from('member_resumes')
        .upsert({
          member_id: profileId,
          url: versionedUrl,
          storage_path: path,
          bucket: RESUME_BUCKET,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'member_id' });

      if (updateError) throw updateError;

      // Remove old resume if path changed
      if (resumePath && resumePath !== path) {
        await supabase.storage.from(RESUME_BUCKET).remove([resumePath]);
      }

      setResumeUrl(versionedUrl);
      setResumePath(path);
      setMessage({ type: 'success', text: 'Resume uploaded successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload resume.' });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!resumePath || !profileId) return;
    const ok = await confirm({
      title: 'Remove resume?',
      message: 'This cannot be undone.',
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;

    setDeleting(true);
    setMessage(null);

    try {
      const { error: removeError } = await supabase.storage
        .from(RESUME_BUCKET)
        .remove([resumePath]);

      if (removeError) throw removeError;

      const { error: updateError } = await supabase
        .from('member_resumes')
        .delete()
        .eq('member_id', profileId);

      if (updateError) throw updateError;

      setResumeUrl('');
      setResumePath('');
      setMessage({ type: 'success', text: 'Resume removed.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to remove resume.' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AccountShell>
      {confirmationToast}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl md:p-8">
        <h2 className="mb-1 text-xl font-bold">Resume</h2>
        <p className="mb-6 text-sm text-white/60">
          Upload your resume as a PDF so leadership can review it.
        </p>

        {loading ? (
          <p className="text-white/60">Loading resume...</p>
        ) : resumeUrl ? (
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-600/20">
                <FileText size={22} className="text-blue-300" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">Your Resume</p>
                <p className="text-xs text-white/50">PDF uploaded</p>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
              >
                <ExternalLink size={16} />
                View
              </a>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/25 px-5 py-3 font-semibold transition hover:border-white/40 hover:bg-white/10 ${
                uploading || !profileId ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <Upload size={18} />
              {uploading ? 'Uploading...' : 'Choose PDF to Upload'}
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                disabled={uploading || !profileId}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        )}

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

        {/* Resume feedback from leadership (read-only) */}
        {resumeNotes?.notes && (
          <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-400/[0.06] p-5">
            <h3 className="mb-2 text-sm font-bold text-amber-200">Resume Feedback</h3>
            <p className="whitespace-pre-wrap text-sm text-white/80">{resumeNotes.notes}</p>
            {formatDate(resumeNotes.updated_at) && (
              <p className="mt-3 text-xs text-white/40">
                Last updated {formatDate(resumeNotes.updated_at)}
              </p>
            )}
          </div>
        )}
      </div>
    </AccountShell>
  );
}

export default function MemberResumePage() {
  return (
    <AuthGate>
      <MemberResume />
    </AuthGate>
  );
}
