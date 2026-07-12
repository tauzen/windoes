const UNSAFE_SCHEME_RE = /^(?:javascript|data):/i;
const HTTP_SCHEME_RE = /^https?:\/\//i;
const ANY_SCHEME_RE = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

// Windows-style local path: an optional leading slash, a single drive letter,
// a colon, then an optional path. `C:\My Documents\page.html`,
// `C:/My Documents/page.html`, and `/C:/My Documents/page.html` all match;
// multi-letter schemes like `http:` do not.
const LOCAL_PATH_RE = /^\/?([A-Za-z]):(?:[\\/](.*))?$/;

/**
 * Interpret browser input as a local (VirtualFS) file path.
 * Returns the normalized VFS path (e.g. '/C:/My Documents/page.html'),
 * or null when the input is not a drive-letter path.
 *
 * @param {string} raw
 */
export function vfsPathFromBrowserInput(raw) {
  const match = LOCAL_PATH_RE.exec(String(raw || '').trim());
  if (!match) return null;

  const drive = match[1].toUpperCase();
  const rest = (match[2] || '').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/+$/, '');
  return rest ? `/${drive}:/${rest}` : `/${drive}:`;
}

/**
 * Render a VFS path (e.g. '/C:/My Documents/page.html') in the
 * Windows-style form shown in the address bar ('C:\My Documents\page.html').
 *
 * @param {string} vfsPath
 */
export function windowsPathFromVfsPath(vfsPath) {
  return String(vfsPath || '')
    .replace(/^\//, '')
    .replace(/\//g, '\\');
}

/**
 * Whether a path points at an HTML document (.html / .htm).
 *
 * @param {string} path
 */
export function isHtmlFilePath(path) {
  return /\.html?$/i.test(String(path || '').trim());
}

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
