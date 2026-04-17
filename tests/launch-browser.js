const path = require('path');
const fs = require('fs');
const { chromium, firefox, webkit } = require('playwright');

/**
 * Start a Vite dev server rooted at the simulator directory.
 * Returns { server, baseUrl } where baseUrl is like 'http://127.0.0.1:PORT'.
 */
async function startStaticServer(rootDir) {
  const { createServer } = await import('vite');

  const projectRoot = path.resolve(rootDir, '..');
  const viteServer = await createServer({
    configFile: path.join(projectRoot, 'vite.config.js'),
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
    },
    clearScreen: false,
    logLevel: 'error',
  });

  await viteServer.listen();

  const resolved = viteServer.resolvedUrls?.local?.[0] || viteServer.resolvedUrls?.network?.[0];
  if (!resolved) {
    await viteServer.close();
    throw new Error('Failed to resolve Vite test server URL');
  }

  return {
    server: {
      close: () => {
        viteServer.close().catch(() => {});
      },
    },
    baseUrl: resolved.replace(/\/$/, ''),
  };
}

async function launchBrowser() {
  // Try to find an existing chromium installation that may not match the exact Playwright version
  const searchDirs = [
    path.join(process.env.HOME || '', '.cache', 'ms-playwright'),
    '/opt/pw-browsers',
  ];
  let existingChromiumPath = null;
  for (const msPlaywrightDir of searchDirs) {
    try {
      const dirs = fs.readdirSync(msPlaywrightDir).filter((d) => d.startsWith('chromium-'));
      if (dirs.length > 0) {
        const candidate = path.join(
          msPlaywrightDir,
          dirs[dirs.length - 1],
          'chrome-linux',
          'chrome'
        );
        if (fs.existsSync(candidate)) {
          existingChromiumPath = candidate;
          break;
        }
      }
    } catch {}
  }

  const attempts = [
    { label: 'bundled chromium', launcher: chromium, options: { headless: true } },
    ...(existingChromiumPath
      ? [
          {
            label: 'existing chromium install',
            launcher: chromium,
            options: {
              headless: true,
              executablePath: existingChromiumPath,
              args: ['--no-sandbox'],
            },
          },
        ]
      : []),
    {
      label: 'system chrome channel',
      launcher: chromium,
      options: { headless: true, channel: 'chrome' },
    },
    {
      label: 'system msedge channel',
      launcher: chromium,
      options: { headless: true, channel: 'msedge' },
    },
    { label: 'bundled firefox', launcher: firefox, options: { headless: true } },
    { label: 'bundled webkit', launcher: webkit, options: { headless: true } },
  ];

  const errors = [];
  for (const attempt of attempts) {
    try {
      const browser = await attempt.launcher.launch(attempt.options);
      console.log(`Using browser: ${attempt.label}`);
      return browser;
    } catch (err) {
      errors.push(`${attempt.label}: ${err.message}`);
    }
  }

  throw new Error(
    `Could not launch any Playwright browser target. Attempts:\n- ${errors.join('\n- ')}`
  );
}

module.exports = { launchBrowser, startStaticServer };
