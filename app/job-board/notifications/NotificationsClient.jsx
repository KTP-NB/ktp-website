'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { jobBoardApi } from '@/lib/job-board/clientFetch';

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    jobBoardApi('/api/job-board/notifications')
      .then((data) => {
        if (!isMounted) return;
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch((err) => { if (isMounted) setError(err.message || 'Unable to load notifications.'); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  async function markAllRead() {
    await jobBoardApi('/api/job-board/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ markAllRead: true }),
    });
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || readAt })));
    setUnreadCount(0);
  }

  async function markOneRead(notificationId) {
    await jobBoardApi('/api/job-board/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ notificationId }),
    });
    setNotifications((current) => current.map((item) => (
      item.id === notificationId ? { ...item, read_at: item.read_at || new Date().toISOString() } : item
    )));
    setUnreadCount((current) => Math.max(0, current - 1));
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-xl backdrop-blur">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-black">Notifications</h2>
          <p className="mt-1 text-sm text-blue-50/70">
            {unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/job-board/settings" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-blue-50 hover:bg-white/10">
            Preferences
          </Link>
          <button type="button" onClick={markAllRead} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950">
            Mark all read
          </button>
        </div>
      </div>

      {error ? <p className="mt-5 rounded-xl border border-red-300/20 bg-red-500/10 p-4 text-sm font-bold text-red-100">{error}</p> : null}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-950/30" />
        ) : notifications.length ? notifications.map((item) => (
          <article key={item.id} className={`rounded-xl border border-white/10 p-4 ${item.read_at ? 'bg-slate-950/20' : 'bg-blue-500/15'}`}>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-blue-50/75">{item.message}</p>
                {item.job_board_jobs ? (
                  <Link href={`/job-board/jobs/${item.job_board_jobs.id}`} className="mt-3 inline-flex text-sm font-bold text-blue-200 hover:text-white">
                    View job
                  </Link>
                ) : null}
                {item.type === 'digest' ? (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-blue-200">
                    {item.metadata?.new_job_ids?.length ? <Link href="/job-board" className="hover:text-white">New jobs</Link> : null}
                    {item.metadata?.saved_job_ids?.length ? <Link href="/job-board/saved" className="hover:text-white">Saved jobs</Link> : null}
                  </div>
                ) : null}
              </div>
              {!item.read_at ? (
                <button type="button" onClick={() => markOneRead(item.id)} className="shrink-0 rounded-full border border-white/15 px-3 py-2 text-xs font-bold text-blue-50 hover:bg-white/10">
                  Mark read
                </button>
              ) : null}
            </div>
          </article>
        )) : (
          <div className="rounded-xl border border-white/10 bg-slate-950/25 p-6 text-sm text-blue-50/70">
            No notifications yet.
          </div>
        )}
      </div>
    </section>
  );
}
