// ══════════════════════════════════════════════
// Boot asset preloading
// ══════════════════════════════════════════════
//
// Warms the browser cache with every shell asset (icons, the boot splash image
// and the embedded application documents) while the splash screen is visible so
// the desktop is fully painted the moment boot finishes. The boot progress bar
// is driven from the real completion count, not a timer.
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
 * a missing asset never stalls the progress bar.
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
 * Preload every shell asset, reporting progress as each one settles.
 *
 * @param {{ onProgress?: (loaded: number, total: number) => void }} [options]
 * @returns {Promise<{ loaded: number, total: number }>}
 */
export function preloadBootAssets({ onProgress } = {}) {
  const tasks = [...imageUrls.map(preloadImage), ...appUrls.map(preloadApp)];
  const total = tasks.length;

  let loaded = 0;
  const tick = () => {
    loaded += 1;
    if (onProgress) onProgress(loaded, total);
  };

  if (total === 0) {
    if (onProgress) onProgress(0, 0);
    return Promise.resolve({ loaded: 0, total: 0 });
  }

  return Promise.all(tasks.map((task) => task.then(tick))).then(() => ({ loaded, total }));
}
