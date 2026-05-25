/**
 * Thin client for a self-hosted Piston code execution engine.
 * https://github.com/engineer-man/piston
 *
 * Configure PISTON_URL to the base URL of your deployment, e.g.
 *   https://piston.your-domain.fly.dev
 * (do NOT include /api/v2 — we append it).
 *
 * We hit `/api/v2/runtimes` once at boot to discover available languages
 * and pick a sensible default version for each.
 */

const PISTON_URL = (process.env.PISTON_URL || '').replace(/\/+$/, '');
const PISTON_API = PISTON_URL ? `${PISTON_URL}/api/v2` : '';

// Per-language run limits (Piston respects these; defaults are sane).
export const DEFAULT_LIMITS = {
  run_timeout: 5000,          // ms per test case
  compile_timeout: 10000,
  run_memory_limit: 256 * 1024 * 1024, // 256 MiB
  compile_memory_limit: 512 * 1024 * 1024,
};

// Common Piston language aliases.
const LANGUAGE_ALIASES = {
  py: 'python',
  python3: 'python',
  js: 'javascript',
  ts: 'typescript',
  'c++': 'cpp',
  golang: 'go',
};

export function normalizeLanguage(lang) {
  if (!lang) return 'python';
  const lower = lang.toLowerCase();
  return LANGUAGE_ALIASES[lower] || lower;
}

let runtimesCache = null;
let runtimesCacheAt = 0;
const RUNTIMES_TTL_MS = 5 * 60 * 1000;

export async function fetchRuntimes() {
  if (!PISTON_API) throw new Error('PISTON_URL is not configured');
  if (runtimesCache && Date.now() - runtimesCacheAt < RUNTIMES_TTL_MS) return runtimesCache;

  const res = await fetch(`${PISTON_API}/runtimes`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Piston /runtimes failed: ${res.status}`);
  const list = await res.json();
  runtimesCache = list;
  runtimesCacheAt = Date.now();
  return list;
}

/**
 * Pick a Piston version for the requested language. Falls back to the latest
 * available version Piston reports.
 */
export async function resolveLanguageVersion(language) {
  const runtimes = await fetchRuntimes();
  const lang = normalizeLanguage(language);
  const matches = runtimes.filter(
    (r) => r.language === lang || (r.aliases || []).includes(lang),
  );
  if (matches.length === 0) {
    throw new Error(`Language "${language}" is not available on this Piston instance`);
  }
  // Prefer the highest version string (lexicographic is usually fine for x.y.z).
  matches.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  return { language: matches[0].language, version: matches[0].version };
}

/**
 * Execute one program against one stdin payload.
 * Returns the Piston response shape:
 *   { language, version, run: { stdout, stderr, output, code, signal }, compile?: {...} }
 */
export async function runOnce({ language, code, stdin, limits = {} }) {
  if (!PISTON_API) throw new Error('PISTON_URL is not configured');
  const { language: lang, version } = await resolveLanguageVersion(language);

  const body = {
    language: lang,
    version,
    files: [{ name: filenameFor(lang), content: code }],
    stdin: stdin ?? '',
    args: [],
    ...DEFAULT_LIMITS,
    ...limits,
  };

  const res = await fetch(`${PISTON_API}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Piston /execute failed: ${res.status} ${text}`);
  }
  return res.json();
}

function filenameFor(language) {
  const map = {
    python: 'main.py',
    javascript: 'main.js',
    typescript: 'main.ts',
    java: 'Main.java',
    cpp: 'main.cpp',
    c: 'main.c',
    go: 'main.go',
    rust: 'main.rs',
    ruby: 'main.rb',
    csharp: 'Main.cs',
    kotlin: 'Main.kt',
    swift: 'main.swift',
    php: 'main.php',
  };
  return map[language] || `main.${language}`;
}

export { PISTON_URL };
