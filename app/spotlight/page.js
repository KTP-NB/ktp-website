'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Plus, Send } from 'lucide-react';
import FadeIn from '@/components/FadeIn';
import Tabs from '@/components/Tabs';
import { useAuth } from '@/components/authprovider';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';
import { readCachedData, writeCachedData } from '@/lib/publicDataCache';

const SPOTLIGHT_CACHE_KEY = 'ktp:spotlight_posts:v4';
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

function SpotlightCard({ post }) {
  const categoryLabel = getSpotlightCategoryLabel(post.category);

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
      {post.post_url && (
        <a
          href={post.post_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${categoryLabel || 'spotlight'} on LinkedIn`}
          title={`Open ${categoryLabel || 'spotlight'} on LinkedIn`}
          className="absolute right-2 top-6 z-10 h-11 w-20 rounded-md"
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

  if (!user) return null;

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
              <SpotlightCard key={post.id} post={post} />
            ))}
          </section>
        )}
      </FadeIn>
    </main>
  );
}
