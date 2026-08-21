'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, Save, FileText, Upload, Trash2, ExternalLink } from 'lucide-react';
import AuthGate from '@/components/authgate';
import FadeIn from '@/components/FadeIn';
import { useAuth } from '@/components/authprovider';
import { useConfirmToast } from '@/components/ConfirmToast';
import ProfileSectionNav from '@/components/ProfileSectionNav';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { clearCachedData } from '@/lib/publicDataCache';
import { MEMBERS_CACHE_KEY } from '@/lib/cacheKeys';

const editableFields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'graduation_year', label: 'Year', type: 'text' },
  { name: 'major', label: 'Major', type: 'text' },
  { name: 'minors', label: 'Minor(s)', type: 'text' },
  { name: 'linkedin_url', label: 'LinkedIn URL', type: 'url' },
];

const emptyProfile = {
  name: '',
  position: '',
  graduation_year: '',
  major: '',
  minors: '',
  linkedin_url: '',
  photo_url: '',
  photo_storage_path: '',
  resume_url: '',
  resume_storage_path: '',
};

function fileExtension(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension || 'jpg';
}

function fileSafeName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'member';
}

function publicUrlFor(path, version) {
  const url = supabase.storage.from('member-photos').getPublicUrl(path).data.publicUrl;
  return version ? `${url}?v=${version}` : url;
}

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return null;
  }
}

function ProfileEditor() {
  const searchParams = useSearchParams();
  const showResume = searchParams.get('tab') === 'resume';
  const { user, setProfileName } = useAuth();
  const [profileId, setProfileId] = useState(null);
  const [form, setForm] = useState(emptyProfile);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [deletingResume, setDeletingResume] = useState(false);
  const [resumeMessage, setResumeMessage] = useState(null);
  const [resumeNotes, setResumeNotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const { confirm, confirmationToast } = useConfirmToast();

  const visibleFields = editableFields;

  const displayPhoto = useMemo(
    () => photoPreview || form.photo_url || '/ktp-icon.png',
    [form.photo_url, photoPreview]
  );

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from('member_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else if (!data) {
        setMessage({
          type: 'error',
          text: 'No member profile is linked to this account yet.',
        });
      } else {
        setProfileId(data.id);
        setForm({
          name: data.name || '',
          position: data.position || '',
          graduation_year: data.graduation_year || '',
          major: data.major || '',
          minors: data.minors || '',
          linkedin_url: data.linkedin_url || '',
          photo_url: data.photo_url || '',
          photo_storage_path: data.photo_storage_path || '',
          resume_url: data.resume_url || '',
          resume_storage_path: data.resume_storage_path || '',
        });

        // Resume feedback written by admins (RLS limits this to the member's own row).
        const { data: notesRow } = await supabase
          .from('member_resume_notes')
          .select('notes, updated_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (isMounted && notesRow?.notes) {
          setResumeNotes(notesRow);
        }
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function uploadPhotoIfNeeded() {
    if (!photoFile || !user) return null;

    const extension = fileExtension(photoFile);
    const version = Date.now();
    const path = `${user.id}/${fileSafeName(form.name)}.${extension}`;
    const { error } = await supabase.storage
      .from('member-photos')
      .upload(path, photoFile, {
        contentType: photoFile.type || 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    return {
      photo_storage_path: path,
      photo_url: publicUrlFor(path, version),
    };
  }

  async function handleResumeUpload(file) {
    if (!file || !user || !profileId) return;

    setUploadingResume(true);
    setResumeMessage(null);

    try {
      const extension = fileExtension(file);
      const version = Date.now();
      const RESUME_BUCKET = 'member-resumes';
      const path = `resumes/${user.id}/${fileSafeName(form.name)}-resume.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(RESUME_BUCKET)
        .upload(path, file, {
          contentType: file.type || 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const resumeUrl = supabase.storage.from(RESUME_BUCKET).getPublicUrl(path).data.publicUrl;
      const versionedUrl = `${resumeUrl}?v=${version}`;

      // Update member_profiles with the resume info
      const { error: updateError } = await supabase
        .from('member_profiles')
        .update({
          resume_url: versionedUrl,
          resume_storage_path: path,
          resume_bucket: RESUME_BUCKET,
        })
        .eq('id', profileId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Remove old resume if path changed
      if (form.resume_storage_path && form.resume_storage_path !== path) {
        await supabase.storage.from(RESUME_BUCKET).remove([form.resume_storage_path]);
      }

      setForm((prev) => ({
        ...prev,
        resume_url: versionedUrl,
        resume_storage_path: path,
      }));
      setResumeMessage({ type: 'success', text: 'Resume uploaded successfully.' });
    } catch (err) {
      setResumeMessage({ type: 'error', text: err.message || 'Failed to upload resume.' });
    } finally {
      setUploadingResume(false);
    }
  }

  async function handleResumeDelete() {
    if (!form.resume_storage_path || !profileId) return;
    const ok = await confirm({
      title: 'Remove resume?',
      message: 'This cannot be undone.',
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;

    setDeletingResume(true);
    setResumeMessage(null);

    try {
      const RESUME_BUCKET = 'member-resumes';
      const { error: removeError } = await supabase.storage
        .from(RESUME_BUCKET)
        .remove([form.resume_storage_path]);

      if (removeError) throw removeError;

      const { error: updateError } = await supabase
        .from('member_profiles')
        .update({ resume_url: null, resume_storage_path: null })
        .eq('id', profileId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setForm((prev) => ({ ...prev, resume_url: '', resume_storage_path: '' }));
      setResumeMessage({ type: 'success', text: 'Resume removed.' });
    } catch (err) {
      setResumeMessage({ type: 'error', text: err.message || 'Failed to remove resume.' });
    } finally {
      setDeletingResume(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!profileId) return;

    setSaving(true);
    setMessage(null);

    let uploadedPhoto = null;

    try {
      uploadedPhoto = await uploadPhotoIfNeeded();
      const updates = {
        name: form.name.trim(),
        graduation_year: form.graduation_year.trim() || null,
        major: form.major.trim() || null,
        minors: form.minors.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        ...(uploadedPhoto || {}),
      };

      const { data, error } = await supabase
        .from('member_profiles')
        .update(updates)
        .eq('id', profileId)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (error) throw error;

      setForm({
        name: data.name || '',
        position: data.position || '',
        graduation_year: data.graduation_year || '',
        major: data.major || '',
        minors: data.minors || '',
        linkedin_url: data.linkedin_url || '',
        photo_url: data.photo_url || '',
        photo_storage_path: data.photo_storage_path || '',
        resume_url: data.resume_url || '',
        resume_storage_path: data.resume_storage_path || '',
      });
      setProfileName(data.name || null);
      setPhotoFile(null);
      clearCachedData(MEMBERS_CACHE_KEY);

      if (
        uploadedPhoto?.photo_storage_path &&
        form.photo_storage_path &&
        form.photo_storage_path !== uploadedPhoto.photo_storage_path
      ) {
        const { error: deleteError } = await supabase.storage
          .from('member-photos')
          .remove([form.photo_storage_path]);

        if (deleteError) {
          console.warn('Failed to remove previous profile photo:', deleteError);
        }
      }

      setMessage({ type: 'success', text: 'Profile saved.' });
    } catch (error) {
      if (uploadedPhoto?.photo_storage_path) {
        await supabase.storage.from('member-photos').remove([uploadedPhoto.photo_storage_path]);
      }

      setMessage({ type: 'error', text: error.message || 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="pt-32 text-center text-white/80">Loading profile...</div>;
  }

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
      {confirmationToast}
      <FadeIn className="mx-auto w-full max-w-5xl">
        <div className="mb-10">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Member Account</h1>
          <p className="mt-2 text-white/70">{user.email}</p>
        </div>

        <ProfileSectionNav />

        {!showResume && (
        <form
          onSubmit={onSubmit}
          className="grid gap-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl md:grid-cols-[280px_1fr] md:p-8"
        >
          <section className="flex flex-col gap-4">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-white/15 bg-white/5">
              <img
                src={displayPhoto}
                alt={form.name || 'Profile photo'}
                className="h-full w-full object-cover"
              />
            </div>

            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 font-semibold transition hover:bg-white/10">
              <Camera size={18} />
              Change Headshot
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
              />
            </label>
          </section>

          <section className="grid gap-5">
            {visibleFields.map((field) => (
              <label key={field.name} className="grid gap-2">
                <span className="text-sm font-semibold text-white/80">{field.label}</span>
                <input
                  type={field.type}
                  required={field.required}
                  value={form[field.name]}
                  onChange={(event) => updateField(field.name, event.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-blue-300"
                />
              </label>
            ))}

            {message && (
              <p
                className={
                  message.type === 'success'
                    ? 'rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100'
                    : 'rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm text-red-100'
                }
              >
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || !profileId}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </section>
        </form>
        )}

        {/* ========== RESUME SECTION ========== */}
        {showResume && profileId && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl md:p-8">
            <h2 className="text-xl font-bold mb-1">Resume</h2>
            <p className="text-sm text-white/60 mb-6">Upload your resume as a PDF so leadership can review it.</p>

            {form.resume_url ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-400/20">
                    <FileText size={22} className="text-blue-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">Your Resume</p>
                    <p className="text-xs text-white/50">PDF uploaded</p>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <a
                    href={form.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
                  >
                    <ExternalLink size={16} />
                    View
                  </a>
                  <button
                    type="button"
                    disabled={deletingResume}
                    onClick={handleResumeDelete}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    {deletingResume ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/25 px-5 py-3 font-semibold transition hover:bg-white/10 hover:border-white/40 ${uploadingResume ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload size={18} />
                  {uploadingResume ? 'Uploading...' : 'Choose PDF to Upload'}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    disabled={uploadingResume}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleResumeUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            )}

            {resumeMessage && (
              <p
                className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                  resumeMessage.type === 'success'
                    ? 'border border-emerald-300/25 bg-emerald-400/10 text-emerald-100'
                    : 'border border-red-300/25 bg-red-400/10 text-red-100'
                }`}
              >
                {resumeMessage.text}
              </p>
            )}

            {/* Resume feedback from leadership (read-only) */}
            {resumeNotes?.notes && (
              <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-400/[0.06] p-5">
                <h3 className="text-sm font-bold text-amber-200 mb-2">Resume Feedback</h3>
                <p className="text-sm text-white/80 whitespace-pre-wrap">{resumeNotes.notes}</p>
                {formatDate(resumeNotes.updated_at) && (
                  <p className="mt-3 text-xs text-white/40">Last updated {formatDate(resumeNotes.updated_at)}</p>
                )}
              </div>
            )}
          </div>
        )}
      </FadeIn>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <AuthGate>
      <ProfileEditor />
    </AuthGate>
  );
}
