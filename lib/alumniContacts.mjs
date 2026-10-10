/**
 * Validation for alumni contact details edited through the admin API. LinkedIn
 * links are stored in one canonical form so the referral finder never shows a
 * tracking link, a company page, or a search result as someone's profile.
 */

/** Returns { value } with a canonical profile URL (or null to clear), or { error }. */
export function cleanLinkedinUrl(input) {
  const text = String(input ?? '').trim();
  if (!text) return { value: null };
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { error: 'linkedin_url is not a valid URL.' };
  }
  if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) return { error: 'linkedin_url must be a linkedin.com link.' };
  const slug = url.pathname.match(/^\/in\/([^/]+)\/?$/)?.[1];
  if (!slug) return { error: 'linkedin_url must be a personal profile link (linkedin.com/in/...).' };
  return { value: `https://www.linkedin.com/in/${slug}` };
}

export function cleanEmail(input) {
  const text = String(input ?? '').trim().toLowerCase();
  if (!text) return { value: null };
  if (text.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return { error: 'email is not valid.' };
  return { value: text };
}

/** Validates one `{ alumni_id, linkedin_url?, email? }` entry into `{ id, values }` or `{ error }`. */
export function parseAlumniContactUpdate(entry) {
  const id = String(entry?.alumni_id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: 'alumni_id is invalid.' };
  const values = {};
  if (entry.linkedin_url !== undefined) {
    const linkedin = cleanLinkedinUrl(entry.linkedin_url);
    if (linkedin.error) return { id, error: linkedin.error };
    values.linkedin_url = linkedin.value;
  }
  if (entry.email !== undefined) {
    const email = cleanEmail(entry.email);
    if (email.error) return { id, error: email.error };
    values.email = email.value;
  }
  if (!Object.keys(values).length) return { id, error: 'Provide linkedin_url or email.' };
  return { id, values };
}
