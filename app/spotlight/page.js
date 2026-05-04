'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Send } from 'lucide-react';
import FadeIn from '@/components/FadeIn';
import { useAuth } from '@/components/authprovider';
import { supabase } from '@/lib/supabase';
import { readCachedData, writeCachedData } from '@/lib/publicDataCache';

const SPOTLIGHT_CACHE_KEY = 'ktp:spotlight_posts:v2';
const SPOTLIGHT_CACHE_TTL_MS = 5 * 60 * 1000;

function normalizeLinkedInEmbedUrl(value) {
  const trimmed = value.trim();

  if (!trimmed) return '';
  if (!trimmed.startsWith('https://www.linkedin.com/embed/')) return '';

  return trimmed;
}

function parseLinkedInEmbedInput(value) {
  const trimmed = value.trim();
  const result = {
    embedUrl: '',
    embedHeight: 520,
    title: '',
  };

  if (!trimmed) return result;

  if (trimmed.startsWith('<iframe')) {
    const srcMatch = trimmed.match(/\ssrc=["']([^"']+)["']/i);
    const heightMatch = trimmed.match(/\sheight=["']?(\d+)["']?/i);
    const titleMatch = trimmed.match(/\stitle=["']([^"']+)["']/i);

    result.embedUrl = srcMatch?.[1] || '';

    if (heightMatch?.[1]) {
      const height = Number.parseInt(heightMatch[1], 10);
      if (Number.isFinite(height)) {
        result.embedHeight = Math.min(Math.max(height, 300), 1200);
      }
    }

    result.title = titleMatch?.[1] || '';
    return result;
  }

  return result;
}

function getLinkedInPostUrlFromEmbedUrl(value) {
  const embedUrl = normalizeLinkedInEmbedUrl(value);

  if (!embedUrl) return null;

  try {
    const url = new URL(embedUrl);
    const updatePath = url.pathname.replace(/^\/embed\/feed\/update\//, '');

    if (!updatePath || updatePath === url.pathname) return null;

    return `https://www.linkedin.com/feed/update/${updatePath}`;
  } catch {
    return null;
  }
}

function SpotlightCard({ post }) {
  const card = (
    <article className="relative overflow-hidden rounded-xl border border-white/12 bg-white shadow-[0_14px_34px_rgba(12,28,62,0.26)] transition duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_22px_48px_rgba(12,28,62,0.36)]">
      <iframe
        src={post.embed_url}
        title={post.title}
        height={post.embed_height || 520}
        frameBorder="0"
        allowFullScreen
        className="block w-full bg-white"
      />
      {post.post_url && (
        <a
          href={post.post_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${post.title} on LinkedIn`}
          title={`Open ${post.title} on LinkedIn`}
          className="absolute right-2 top-2 z-10 h-11 w-20 rounded-md"
        />
      )}
    </article>
  );

  return card;
}

function SpotlightSubmitForm({ onPostCreated }) {
  const { user, displayName } = useAuth();
  const [open, setOpen] = useState(false);
  const [iframeCode, setIframeCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function onSubmit(event) {
    event.preventDefault();
    if (!user) return;

    const parsedEmbed = parseLinkedInEmbedInput(iframeCode);
    const normalizedEmbedUrl = normalizeLinkedInEmbedUrl(parsedEmbed.embedUrl);
    const normalizedPostUrl = getLinkedInPostUrlFromEmbedUrl(normalizedEmbedUrl);

    if (!normalizedEmbedUrl) {
      setMessage({ type: 'error', text: 'Paste the full LinkedIn iframe embed code.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from('spotlight_posts')
        .insert({
          user_id: user.id,
          author_name: displayName || user.email?.split('@')[0] || 'KTP Member',
          title: parsedEmbed.title || 'KTP Success',
          embed_url: normalizedEmbedUrl,
          embed_height: parsedEmbed.embedHeight,
          post_url: normalizedPostUrl,
        })
        .select('*')
        .single();

      if (error) throw error;

      onPostCreated(data);
      setIframeCode('');
      setOpen(false);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not add spotlight post.' });
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <section className="flex justify-end">
      <div className="flex w-full max-w-4xl flex-col items-end gap-3 sm:flex-row sm:items-start sm:justify-end">
        {open && (
          <form onSubmit={onSubmit} className="w-full sm:max-w-3xl">
            <div className="flex overflow-hidden rounded-full border border-white/15 bg-white/8 shadow-xl backdrop-blur-xl focus-within:border-blue-300">
              <input
                value={iframeCode}
                onChange={(event) => setIframeCode(event.target.value)}
                placeholder="Paste LinkedIn iframe embed code"
                required
                className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/40"
              />
              <button
                disabled={saving}
                aria-label={saving ? 'Adding spotlight' : 'Post spotlight'}
                title={saving ? 'Adding spotlight' : 'Post spotlight'}
                className="inline-flex h-11 w-12 shrink-0 items-center justify-center border-l border-white/15 bg-white/10 text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
            {message && (
              <p className="mt-3 rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {message.text}
              </p>
            )}
          </form>
        )}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? 'Close spotlight form' : 'Add spotlight'}
          title={open ? 'Close spotlight form' : 'Add spotlight'}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-blue-600 text-white shadow-lg transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <Plus size={22} className={`transition ${open ? 'rotate-45' : ''}`} />
        </button>
      </div>
    </section>
  );
}

export default function SpotlightPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const sortedPosts = useMemo(
    () =>
      [...posts].sort((a, b) => {
        const orderDiff = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
        const createdDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return orderDiff || createdDiff;
      }),
    [posts]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      const cachedPosts = readCachedData(SPOTLIGHT_CACHE_KEY, SPOTLIGHT_CACHE_TTL_MS);

      if (cachedPosts) {
        setPosts(cachedPosts);
        setLoadError(null);
        setLoading(false);
      }

      const { data, error } = await supabase
        .from('spotlight_posts')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error('Failed to load spotlight posts:', error);
        setLoadError(error.message || 'Failed to load spotlight posts.');
        setPosts([]);
      } else {
        const rows = data || [];
        setLoadError(null);
        writeCachedData(SPOTLIGHT_CACHE_KEY, rows);
        setPosts(rows);
      }

      setLoading(false);
    }

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  function addPost(post) {
    setPosts((current) => {
      const nextPosts = [post, ...current];
      writeCachedData(SPOTLIGHT_CACHE_KEY, nextPosts);
      return nextPosts;
    });
  }

  return (
    <main className="min-h-screen px-6 pb-20 pt-24 text-white lg:px-8">
      <FadeIn className="mx-auto max-w-7xl">
        <section className="mb-8 text-center">
          <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] drop-shadow-2xl text-center text-white">
            Success Wall
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-white/70">
            Wins, internships, projects, hackathons, programs, and post-grad moves from the KTP community.
          </p>
        </section>

        <SpotlightSubmitForm onPostCreated={addPost} />

        {loading && <p className="mt-8 text-white/70">Loading spotlight posts...</p>}
        {!loading && loadError && (
          <p className="mt-8 rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {loadError}
          </p>
        )}
        {!loading && !loadError && sortedPosts.length === 0 && (
          <p className="mt-8 rounded-xl border border-white/12 bg-white/6 px-5 py-4 text-center text-white/70">
            No spotlight posts yet.
          </p>
        )}

        {sortedPosts.length > 0 && (
          <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sortedPosts.map((post) => (
              <SpotlightCard key={post.id} post={post} />
            ))}
          </section>
        )}
      </FadeIn>
    </main>
  );
}
