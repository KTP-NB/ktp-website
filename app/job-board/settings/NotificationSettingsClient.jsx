'use client';

import { useEffect, useState } from 'react';
import { jobBoardApi } from '@/lib/job-board/clientFetch';

const booleanFields = [
  ['in_app_enabled', 'In-app notifications'],
  ['immediate_notifications_enabled', 'Immediate notifications'],
  ['posted_today_notifications_enabled', 'Posted-today notifications'],
  ['email_enabled', 'Email digest (opt in)'],
];

export default function NotificationSettingsClient() {
  const [preferences, setPreferences] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    jobBoardApi('/api/job-board/notification-preferences')
      .then((data) => {
        if (!isMounted) return;
        setPreferences(data.preferences);
      })
      .catch((err) => { if (isMounted) setError(err.message || 'Unable to load settings.'); });
    return () => { isMounted = false; };
  }, []);

  async function save() {
    setMessage('');
    setError('');
    try {
      const data = await jobBoardApi('/api/job-board/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences),
      });
      setPreferences(data.preferences);
      setMessage('Notification preferences saved.');
    } catch (err) {
      setError(err.message || 'Unable to save preferences.');
    }
  }

  if (!preferences) {
    return <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(280px,0.25fr)]">
      <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-xl backdrop-blur">
        <h2 className="text-2xl font-black">Notification Preferences</h2>
        <div className="mt-5 space-y-4">
          {booleanFields.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-4 rounded-xl bg-slate-950/25 px-4 py-3 text-sm font-bold">
              {label}
              <input
                type="checkbox"
                checked={Boolean(preferences[key])}
                onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))}
              />
            </label>
          ))}
          <label className="block text-sm font-bold text-blue-100">
            Digest frequency
            <select
              value={preferences.digest_frequency || 'weekly'}
              onChange={(event) => setPreferences((current) => ({ ...current, digest_frequency: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
        </div>
        <button type="button" onClick={save} className="mt-6 rounded-full bg-blue-500 px-5 py-3 text-sm font-bold text-white hover:bg-blue-400">
          Save preferences
        </button>
        {message ? <p className="mt-4 text-sm font-bold text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-4 text-sm font-bold text-red-100">{error}</p> : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/25 p-6 text-white shadow-xl backdrop-blur">
        <h2 className="text-xl font-black">Email delivery</h2>
        <p className="mt-3 text-sm leading-6 text-blue-50/70">
          Email sends are enabled only after the mail service is configured and tested. You can opt in now; turn this off at any time to stop future messages.
        </p>
      </section>
    </div>
  );
}
