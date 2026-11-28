// ══════════════════════════════════════════════
// Boot asset preloading
// ══════════════════════════════════════════════
//
// Warms the browser cache with every shell asset (icons, the boot splash image
// and the embedded application documents) while the splash screen is visible so
// the desktop is fully painted the moment boot finishes. The splash stays up
// until every asset has settled, so the real load, not a timer, ends boot.
//
// The manifest is produced from the filesystem by the `boot-assets` Vite plugin
// (see vite.config.js), so it stays in sync with whatever lives in `public/`.

import { imageAssets, appAssets } from 'virtual:boot-assets';

// Prefix manifest entries (relative to the public root) with the app's base URL
// so the preloaded URLs match the ones the shell actually requests.
const base = import.meta.env.BASE_URL;
const toUrl = (assetPath) => `${base}${assetPath}`;

export const imageUrls = imageAssets.map(toUrl);
export const appUrls = appAssets.map(toUrl);

/** Total number of assets the boot sequence will preload. */
export const totalBootAssets = imageUrls.length + appUrls.length;

/**
 * Preload a single image. Resolves once the image settles (load *or* error) so
 * a missing asset never stalls boot.
 *
 * @param {string} url
 * @returns {Promise<void>}
 */
function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/**
 * Warm an embedded application's document. Resolves once the request settles so
 * a slow or failed app never blocks boot.
 *
 * @param {string} url
 * @returns {Promise<void>}
 */
function preloadApp(url) {
  return fetch(url, { cache: 'force-cache' }).then(
    () => undefined,
    () => undefined
  );
}

/**
 * Preload every shell asset. Resolves once each one has settled.
 *
 * @returns {Promise<void>}
 */
export function preloadBootAssets() {
  return Promise.all([...imageUrls.map(preloadImage), ...appUrls.map(preloadApp)]).then(
    () => undefined
  );
}
