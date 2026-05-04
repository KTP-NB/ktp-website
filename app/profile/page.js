'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, Save } from 'lucide-react';
import AuthGate from '@/components/authgate';
import FadeIn from '@/components/FadeIn';
import { useAuth } from '@/components/authprovider';
import { supabase } from '@/lib/supabase';
import { clearCachedData } from '@/lib/publicDataCache';
import { MEMBERS_CACHE_KEY } from '@/lib/cacheKeys';

const MEMBER_POSITION_ADMIN_EMAIL = 'kharbandakrish23@gmail.com';

const editableFields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'position', label: 'Position', type: 'text' },
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

function ProfileEditor() {
  const { user, setProfileName } = useAuth();
  const [profileId, setProfileId] = useState(null);
  const [form, setForm] = useState(emptyProfile);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const canEditPosition = user?.email?.toLowerCase() === MEMBER_POSITION_ADMIN_EMAIL;
  const visibleFields = useMemo(
    () => editableFields.filter((field) => canEditPosition || field.name !== 'position'),
    [canEditPosition]
  );

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
        });
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

      if (canEditPosition) {
        updates.position = form.position.trim() || null;
      }

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
      <FadeIn className="mx-auto w-full max-w-5xl">
        <div className="mb-10">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Profile</h1>
          <p className="mt-2 text-white/70">{user.email}</p>
        </div>

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
