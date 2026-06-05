import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PUBLIC_DIR = fileURLToPath(new URL('./windoes/public', import.meta.url));

/**
 * Scans the public directory for the assets shown by the shell (icons, the
 * boot splash image and the embedded applications) and exposes them as a
 * virtual module so the boot sequence can preload everything and drive the
 * progress bar from the real download progress.
 *
 * Generating the manifest from the filesystem keeps it in sync automatically:
 * dropping a new icon into `public/icons` makes it part of the preload set with
 * no code changes.
 */
function bootAssetsPlugin() {
  const VIRTUAL_ID = 'virtual:boot-assets';
  const RESOLVED_ID = '\0' + VIRTUAL_ID;

  const listPngs = (dir) => {
    try {
      return readdirSync(dir)
        .filter((name) => name.toLowerCase().endsWith('.png'))
        .sort();
    } catch {
      return [];
    }
  };

  const listAppEntries = () => {
    const appsDir = `${PUBLIC_DIR}/applications`;
    try {
      return readdirSync(appsDir)
        .filter((name) => {
          try {
            return statSync(`${appsDir}/${name}/index.html`).isFile();
          } catch {
            return false;
          }
        })
        .sort()
        .map((name) => `applications/${name}/index.html`);
    } catch {
      return [];
    }
  };

  const buildModule = () => {
    const imageAssets = [
      ...listPngs(`${PUBLIC_DIR}/img`).map((name) => `img/${name}`),
      ...listPngs(`${PUBLIC_DIR}/icons`).map((name) => `icons/${name}`),
    ];
    const appAssets = listAppEntries();
    return [
      `export const imageAssets = ${JSON.stringify(imageAssets)};`,
      `export const appAssets = ${JSON.stringify(appAssets)};`,
    ].join('\n');
  };

  return {
    name: 'boot-assets',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },
    load(id) {
      if (id === RESOLVED_ID) return buildModule();
      return null;
    },
  };
}

export default defineConfig({
  root: 'windoes',
  base: '/windoes/',
  plugins: [react(), bootAssetsPlugin()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
