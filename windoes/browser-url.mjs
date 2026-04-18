const UNSAFE_SCHEME_RE = /^(?:javascript|data):/i;
const HTTP_SCHEME_RE = /^https?:\/\//i;
const ANY_SCHEME_RE = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

/**
 * Normalize browser input into a safe navigable URL.
 * - allows: about:blank, http://, https://
 * - upgrades bare hostnames to https://
 * - rejects javascript:, data:, and unsupported schemes
 *
 * @param {string} raw
 * @param {string} [homePage='https://example.com']
 */
export function normalizeBrowserUrl(raw, homePage = 'https://example.com') {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return homePage;
  if (trimmed === 'about:blank') return trimmed;
  if (UNSAFE_SCHEME_RE.test(trimmed)) return homePage;
  if (ANY_SCHEME_RE.test(trimmed) && !HTTP_SCHEME_RE.test(trimmed)) return homePage;

  const candidate = HTTP_SCHEME_RE.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return homePage;
  } catch {
    return homePage;
  }
}
