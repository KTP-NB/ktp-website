'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Plus, Send, Trash2 } from 'lucide-react';
import FadeIn from '@/components/FadeIn';
import Tabs from '@/components/Tabs';
import { useAuth } from '@/components/authprovider';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';
import { readCachedData, writeCachedData } from '@/lib/publicDataCache';
import { canRemoveSpotlightPost, loadSpotlightPosts, removeSpotlightPost } from '@/lib/spotlight/client.mjs';

const SPOTLIGHT_CACHE_KEY = 'ktp:spotlight_posts:v5';
const SPOTLIGHT_CACHE_TTL_MS = 5 * 60 * 1000;
const SPOTLIGHT_CATEGORIES = [
  { value: 'company', label: 'Company', aliases: ['company', 'internship'] },
  { value: 'program', label: 'Program', aliases: ['program'] },
  { value: 'event', label: 'Event', aliases: ['event', 'chapter'] },
  { value: 'hackathon', label: 'Hackathon', aliases: ['hackathon'] },
  { value: 'postgrad', label: 'Postgrad', aliases: ['postgrad', 'post-grad'] },
];

function getSpotlightCategory(value) {
  const normalizedValue = String(value || '').toLowerCase();

  return SPOTLIGHT_CATEGORIES.find(
    (category) =>
      category.value === normalizedValue ||
      category.aliases.some((alias) => normalizedValue.includes(alias))
  );
}

function getSpotlightCategoryLabel(value) {
  return getSpotlightCategory(value)?.label || '';
}

function isSpotlightCategory(value) {
  return Boolean(getSpotlightCategory(value));
}

function getSpotlightCategoryValueFromLabel(label) {
  if (label === 'All') return 'all';
  return SPOTLIGHT_CATEGORIES.find((category) => category.label === label)?.value || 'all';
}

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

function SpotlightCard({ post, canRemove, onRemove }) {
  const categoryLabel = getSpotlightCategoryLabel(post.category);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const removeButton = useRef(null);
  const confirmButton = useRef(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (confirming) confirmButton.current?.focus();
    else if (wasConfirming.current) removeButton.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  async function confirmRemoval() {
    setRemoving(true);
    setError('');
    try {
      await onRemove(post.id);
    } catch (error) {
      setError(error.message || 'Could not remove spotlight post. Please try again.');
      setRemoving(false);
    }
  }

  const card = (
    <article className="relative pt-4 transition duration-300 hover:-translate-y-1 hover:scale-[1.015]">
      {categoryLabel && (
        <span className="absolute right-4 top-5 z-20 rounded-full border border-blue-200/70 bg-blue-950 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-50 shadow-lg shadow-black/20">
          {categoryLabel}
        </span>
      )}
      <div className="overflow-hidden rounded-xl border border-white/12 bg-white shadow-[0_14px_34px_rgba(12,28,62,0.26)] transition duration-300 hover:shadow-[0_22px_48px_rgba(12,28,62,0.36)]">
        <iframe
          src={post.embed_url}
          title={categoryLabel || 'KTP Spotlight'}
          height={post.embed_height || 520}
          frameBorder="0"
          allowFullScreen
          className="block w-full bg-white"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        {post.post_url && (
          <a
            href={post.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-1 py-2 font-semibold text-blue-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-200"
          >
            View on LinkedIn <span aria-hidden="true">↗</span>
          </a>
        )}
        {canRemove && !confirming && (
          <button
            ref={removeButton}
            type="button"
            onClick={() => { setConfirming(true); setError(''); }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-3 py-2 font-semibold text-white/75 transition hover:border-red-300/40 hover:bg-red-500/10 hover:text-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-200"
          >
            <Trash2 size={15} aria-hidden="true" /> Remove from wall
          </button>
        )}
      </div>
      {canRemove && confirming && (
        <div className="mt-2 rounded-xl border border-red-300/25 bg-red-400/10 p-4">
          <p className="text-sm font-semibold text-white">Remove this spotlight from the wall?</p>
          <p className="mt-1 text-sm text-white/70">The original LinkedIn post will stay on LinkedIn.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              ref={confirmButton}
              type="button"
              disabled={removing}
              onClick={confirmRemoval}
              className="min-h-11 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-60"
            >
              {removing ? 'Removing…' : 'Confirm removal'}
            </button>
            <button
              type="button"
              disabled={removing}
              onClick={() => { setConfirming(false); setError(''); }}
              className="min-h-11 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-200 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-red-100">{error}</p>}
        </div>
      )}
    </article>
  );

  return card;
}

function SpotlightSubmitForm({ onPostCreated }) {
  const { user, displayName } = useAuth();
  const [open, setOpen] = useState(false);
  const [iframeCode, setIframeCode] = useState('');
  const [category, setCategory] = useState('');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const showCategoryError = message?.text === 'Choose what this spotlight is for.';

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

    if (!isSpotlightCategory(category)) {
      setMessage({ type: 'error', text: 'Choose what this spotlight is for.' });
      setCategoryMenuOpen(true);
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      if (!hasSupabaseConfig) {
        throw new Error('Spotlight posting is not configured.');
      }

      const { data, error } = await supabase
        .from('spotlight_posts')
        .insert({
          user_id: user.id,
          author_name: displayName || user.email?.split('@')[0] || 'KTP Member',
          embed_url: normalizedEmbedUrl,
          embed_height: parsedEmbed.embedHeight,
          post_url: normalizedPostUrl,
          category: getSpotlightCategoryLabel(category),
        })
        .select('*')
        .single();

      if (error) throw error;

      onPostCreated(data);
      setIframeCode('');
      setCategory('');
      setCategoryMenuOpen(false);
      setOpen(false);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not add spotlight post.' });
    } finally {
      setSaving(false);
    }
  }

  if (!user) return (
    <p className="text-center text-sm text-white/70">
      Have a win to share? <Link href="/login" className="font-semibold text-blue-200 underline underline-offset-4">Sign in</Link> to add your LinkedIn post.
    </p>
  );

  return (
    <section className="relative z-50 flex justify-end">
      <div className="relative z-50 flex w-full max-w-4xl flex-col items-end gap-3 sm:flex-row sm:items-start sm:justify-end">
        {open && (
          <form onSubmit={onSubmit} className="w-full sm:max-w-3xl">
            <div className="flex flex-col overflow-visible rounded-2xl border border-white/15 bg-white/8 shadow-xl backdrop-blur-xl focus-within:border-blue-300 sm:flex-row sm:rounded-full">
              <div className="relative z-50 min-w-44 border-b border-white/15 sm:border-b-0 sm:border-r">
                <button
                  type="button"
                  onClick={() => setCategoryMenuOpen((current) => !current)}
                  aria-expanded={categoryMenuOpen}
                  aria-label="Spotlight category"
                  className={`flex h-11 w-full items-center justify-between gap-3 rounded-t-2xl bg-blue-950/35 px-4 text-left text-sm font-semibold text-white outline-none transition hover:bg-white/10 focus:bg-white/10 sm:rounded-l-full sm:rounded-tr-none ${
                    showCategoryError ? 'ring-2 ring-red-300/70' : ''
                  }`}
                >
                  <span className={category ? 'text-white' : 'text-white/80'}>
                    {getSpotlightCategoryLabel(category) || 'Looking for...'}
                  </span>
                  <ChevronDown size={16} className={`shrink-0 transition ${categoryMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {categoryMenuOpen && (
                  <div className="absolute left-0 top-full z-[100] mt-2 w-56 overflow-hidden rounded-xl border border-white/15 bg-slate-950/95 p-1 shadow-2xl shadow-black/45 backdrop-blur-xl">
                    {SPOTLIGHT_CATEGORIES.map((option) => {
                      const isSelected = category === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setCategory(option.value);
                            setCategoryMenuOpen(false);
                            setMessage(null);
                          }}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-white/80 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span>{option.label}</span>
                          {isSelected && <Check size={16} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <input
                value={iframeCode}
                onChange={(event) => setIframeCode(event.target.value)}
                aria-label="LinkedIn embed code"
                aria-describedby="linkedin-embed-help"
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
            <p id="linkedin-embed-help" className="mt-3 text-sm leading-6 text-white/70">
              On LinkedIn desktop, open your public post and choose More → Embed this post → Copy code. Paste the code above and choose a category. You can remove your spotlight later.
            </p>
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
  const auth = useAuth();
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('');
  const postsRevision = useRef(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const filterTabs = useMemo(() => ['All', ...SPOTLIGHT_CATEGORIES.map((category) => category.label)], []);
  const activeFilterTab =
    selectedCategory === 'all' ? 'All' : getSpotlightCategoryLabel(selectedCategory);

  const sortedPosts = useMemo(
    () =>
      [...posts].sort((a, b) => {
        const orderDiff = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
        const createdDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return orderDiff || createdDiff;
      }),
    [posts]
  );

  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'all') return sortedPosts;
    return sortedPosts.filter((post) => getSpotlightCategory(post.category)?.value === selectedCategory);
  }, [selectedCategory, sortedPosts]);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      const cachedPosts = readCachedData(SPOTLIGHT_CACHE_KEY, SPOTLIGHT_CACHE_TTL_MS);

      if (cachedPosts) {
        setPosts(cachedPosts);
        setLoadError(null);
        setLoading(false);
      }

      if (!hasSupabaseConfig) {
        setLoading(false);
        return;
      }

      const { data, error } = await loadSpotlightPosts(supabase, () => postsRevision.current);

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
    postsRevision.current += 1;
    setStatus('Spotlight added to the wall.');
    setPosts((current) => {
      const nextPosts = [post, ...current];
      writeCachedData(SPOTLIGHT_CACHE_KEY, nextPosts);
      return nextPosts;
    });
  }

  async function removePost(postId) {
    if (!hasSupabaseConfig) throw new Error('Spotlight removal is not configured.');
    await removeSpotlightPost(supabase, postId);
    postsRevision.current += 1;
    setPosts((current) => {
      const nextPosts = current.filter((post) => post.id !== postId);
      writeCachedData(SPOTLIGHT_CACHE_KEY, nextPosts);
      return nextPosts;
    });
    setStatus('Spotlight removed from the wall.');
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
        <p role="status" className="mt-3 text-center text-sm text-blue-100">{status}</p>

        <div className="relative z-10 mt-8">
          <Tabs
            tabs={filterTabs}
            active={activeFilterTab}
            setActive={(tab) => setSelectedCategory(getSpotlightCategoryValueFromLabel(tab))}
          />
        </div>

        {loading && <p className="mt-8 text-white/70">Loading spotlight posts...</p>}
        {!loading && loadError && (
          <p className="mt-8 rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {loadError}
          </p>
        )}
        {!loading && !loadError && filteredPosts.length === 0 && (
          <p className="mt-8 rounded-xl border border-white/12 bg-white/6 px-5 py-4 text-center text-white/70">
            {selectedCategory === 'all'
              ? 'No spotlight posts yet.'
              : `No ${getSpotlightCategoryLabel(selectedCategory).toLowerCase()} spotlights yet.`}
          </p>
        )}

        {filteredPosts.length > 0 && (
          <section className="relative z-0 mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredPosts.map((post) => (
              <SpotlightCard key={post.id} post={post} canRemove={canRemoveSpotlightPost(auth, post)} onRemove={removePost} />
            ))}
          </section>
        )}
      </FadeIn>
    </main>
  );
}
