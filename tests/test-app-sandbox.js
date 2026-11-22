/**
 * Playwright tests for the app sandbox.
 *
 * Every embedded app runs in an opaque-origin sandbox (no allow-same-origin).
 * These tests check that app script cannot reach the shell, that the shell
 * still serves the apps over the validated message channel (saved state,
 * Winamp remote tracks), and that Chromium never warns that a frame can escape
 * its sandbox.
 */

const path = require('path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { createAssertTracker, waitForBoot } = require('./helpers/test-harness');

const WINDOES_DIR = path.resolve(__dirname, '..', 'windoes');

const tracker = createAssertTracker();
const { assert } = tracker;

const ESCAPE_WARNING = /escape its sandboxing/;
const TRACKS_ORIGIN = 'https://windoes-tracks.tauzen.workers.dev';
const IE_REMOTE_URL = 'https://ie-remote.test/page.html';
const SECRET_PATH = '/C:/My Documents/f003-secret.png';

// Each app the shell embeds: how to open it, its iframe, and its document.
const APPS = [
  {
    name: 'ASCII Runner',
    open: () =>
      window.WindoesApp.open.app('ASCII Runner', './applications/ascii-runner/index.html'),
    frameId: 'appFrame',
    url: /applications\/ascii-runner\/index\.html/,
  },
  {
    name: 'Winamp',
    open: () => window.WindoesApp.open.winamp(),
    frameId: 'winampFrame',
    url: /winamp-player/,
  },
  {
    name: 'Minesweeper',
    open: () => window.WindoesApp.open.minesweeper(),
    frameId: 'minesweeperFrame',
    url: /minesweeper/,
  },
  {
    name: 'Solitaire',
    open: () => window.WindoesApp.open.solitaire(),
    frameId: 'solitaireFrame',
    url: /solitaire/,
  },
  {
    name: 'Minecraft',
    open: () => window.WindoesApp.open.minecraft(),
    frameId: 'minecraftFrame',
    url: /minecraft/,
  },
  {
    name: 'VirtualBoks',
    open: () => window.WindoesApp.open.virtualboks(),
    frameId: 'virtualboksFrame',
    url: /virtualboks/,
  },
  {
    name: 'Paint',
    open: () => window.WindoesApp.open.paint(),
    frameId: 'paintFrame',
    url: /applications\/paint/,
  },
];

function appByName(name) {
  return APPS.find((app) => app.name === name);
}

// The document loaded in one iframe of the shell, once its URL matches.
async function waitForFrame(page, iframeSelector, urlPattern) {
  for (let i = 0; i < 100; i++) {
    const frame = await (await page.$(iframeSelector))?.contentFrame();
    if (frame && urlPattern.test(frame.url())) {
      await frame.waitForLoadState('load');
      return frame;
    }
    await page.waitForTimeout(50);
  }
  throw new Error(`${iframeSelector} did not load ${urlPattern}`);
}

async function openApp(page, app) {
  await page.evaluate(`(${app.open})()`);
  return waitForFrame(page, `#${app.frameId}`, app.url);
}

function waitForIeFrame(page, urlPattern) {
  return waitForFrame(page, '#browserFrame', urlPattern);
}

// What script inside a frame can reach of the shell.
function probeShellAccess() {
  const result = { origin: self.origin, frameElementHidden: window.frameElement === null };
  try {
    result.parentTitle = window.parent.document.title;
  } catch (error) {
    result.parentDocumentError = error.name;
  }
  try {
    result.storageKeys = window.localStorage.length;
  } catch (error) {
    result.storageError = error.name;
  }
  return result;
}

// Send one request to the shell from inside a frame, as any script there
// could, and return the reply (or null when the shell does not answer).
async function frameRequest(frame, type, payload, timeoutMs = 2000) {
  return frame.evaluate(
    ({ type, payload, timeoutMs }) =>
      new Promise((resolve) => {
        const requestId = `f003-${Math.random()}`;
        const timer = setTimeout(() => resolve(null), timeoutMs);
        window.addEventListener('message', function onMessage(event) {
          if (event.data?.type !== `${type}-result` || event.data.requestId !== requestId) return;
          clearTimeout(timer);
          window.removeEventListener('message', onMessage);
          resolve(event.data);
        });
        window.parent.postMessage({ type, requestId, ...payload }, '*');
      }),
    { type, payload, timeoutMs }
  );
}

function shellStorage(page, key) {
  return page.evaluate((k) => window.localStorage.getItem(k), key);
}

// A short silent 16-bit mono WAV, so the Winamp test has a real track to play.
function silentWav(seconds, rate = 8000) {
  const samples = seconds * rate;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + samples * 2, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples * 2, 40);
  return wav;
}

// Stand-in for the remote-track Worker. Like the real one, it serves only the
// shell's origin, so a request made from an opaque-origin frame gets 403.
async function routeTrackWorker(ctx, shellOrigin, requests) {
  const track = silentWav(5);
  await ctx.route(`${TRACKS_ORIGIN}/**`, (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const origin = request.headers().origin;
    requests.push({ path: url.pathname, key: url.searchParams.get('key'), origin });
    if (origin !== shellOrigin) {
      return route.fulfill({ status: 403, body: 'forbidden' });
    }
    const cors = { 'Access-Control-Allow-Origin': shellOrigin };
    if (url.pathname === '/sign') {
      return route.fulfill({
        status: 200,
        headers: cors,
        contentType: 'application/json',
        body: JSON.stringify({
          url: `${TRACKS_ORIGIN}/stream?key=${encodeURIComponent(url.searchParams.get('key'))}`,
          expiresAt: Date.now() + 600_000,
        }),
      });
    }
    return route.fulfill({ status: 200, headers: cors, contentType: 'audio/wav', body: track });
  });
}

async function seedSecretFile(page) {
  await page.evaluate(async (secretPath) => {
    const { VirtualFS } = await import('./virtual-fs.ts');
    const fs = new VirtualFS();
    await fs.init();
    for (const dir of ['/C:', '/C:/My Documents']) {
      if (!(await fs.exists(dir))) await fs.mkdir(dir);
    }
    await fs.writeFile(secretPath, new Blob([new Uint8Array([137, 80, 78, 71])]));
  }, SECRET_PATH);
}

async function runTests() {
  const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
  const shellOrigin = new URL(baseUrl).origin;
  const browser = await launchBrowser();
  const ctx = await browser.newContext();
  const trackRequests = [];
  await routeTrackWorker(ctx, shellOrigin, trackRequests);
  await ctx.route(`${IE_REMOTE_URL}*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body:
        '<!doctype html><title>Remote</title><script>' +
        "parent.postMessage({ type: 'app-storage-save', requestId: 'ie', key: 'ms_best', value: '{}' }, '*');" +
        '</script>',
    })
  );

  const page = await ctx.newPage();
  const consoleMessages = [];
  page.on('console', (message) => consoleMessages.push(message.text()));
  page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));

  try {
    await waitForBoot(page, baseUrl);
    // Saved state from before the sandbox lives under these shell keys.
    await page.evaluate(() => {
      localStorage.setItem('asciiRunnerHighScore', '4321');
      localStorage.setItem('ms_best', JSON.stringify({ beginner: { time: 99, name: 'Old' } }));
      localStorage.removeItem('virtualboks.machines.v1');
    });

    // ── Test 1: No app frame has both allow-scripts and allow-same-origin ──
    console.log('\nTest 1: Every app frame runs without allow-same-origin');
    const frames = {};
    for (const app of APPS) {
      frames[app.name] = await openApp(page, app);
    }
    const sandboxes = await page.evaluate(() =>
      [...document.querySelectorAll('iframe')].map((iframe) => ({
        id: iframe.id,
        flags: (iframe.getAttribute('sandbox') || '').split(/\s+/),
      }))
    );
    for (const { id, flags } of sandboxes) {
      assert(
        flags.includes('allow-scripts') && !flags.includes('allow-same-origin'),
        `#${id} sandbox is "${flags.join(' ')}"`
      );
    }

    // ── Test 2: App script cannot reach the shell ──────────────────────────
    console.log('\nTest 2: App script cannot read the shell document or storage');
    for (const app of APPS) {
      const access = await frames[app.name].evaluate(probeShellAccess);
      assert(
        access.parentDocumentError === 'SecurityError' && access.parentTitle === undefined,
        `${app.name}: window.parent.document throws SecurityError (${JSON.stringify(access)})`
      );
      assert(
        access.origin === 'null' && access.frameElementHidden,
        `${app.name}: runs in an opaque origin with no frameElement`
      );
      assert(access.storageError === 'SecurityError', `${app.name}: has no storage of its own`);
    }

    // ── Test 3: Paint cannot grant itself a file path ──────────────────────
    console.log('\nTest 3: Paint frame cannot grant itself a path via WindoesApp.open.paint');
    await seedSecretFile(page);
    const paintFrame = frames.Paint;
    const selfGrant = await paintFrame.evaluate((secretPath) => {
      try {
        window.parent.WindoesApp.open.paint({ filePath: secretPath });
        return 'called';
      } catch (error) {
        return error.name;
      }
    }, SECRET_PATH);
    assert(selfGrant === 'SecurityError', `parent.WindoesApp.open.paint throws (${selfGrant})`);
    const secretLoad = await frameRequest(paintFrame, 'paint-vfs-load', { path: SECRET_PATH });
    assert(
      secretLoad?.ok === false && !secretLoad.dataUrl,
      `The shell still refuses the unchosen file (${JSON.stringify(secretLoad)})`
    );

    // ── Test 4: The storage bridge is scoped to the sending app ────────────
    console.log('\nTest 4: Each app reaches only its own saved state');
    const msOwn = await frameRequest(frames.Minesweeper, 'app-storage-load', { key: 'ms_best' });
    assert(
      msOwn?.ok === true && JSON.parse(msOwn.value).beginner.time === 99,
      'Minesweeper loads its saved best times from before the sandbox'
    );
    const msOther = await frameRequest(frames.Minesweeper, 'app-storage-save', {
      key: 'asciiRunnerHighScore',
      value: '1',
    });
    assert(msOther?.ok === false, 'Minesweeper cannot write ASCII Runner state');
    const solitaireSave = await frameRequest(frames.Solitaire, 'app-storage-save', {
      key: 'ms_best',
      value: '{}',
    });
    assert(solitaireSave?.ok === false, 'Solitaire (no saved state) cannot write ms_best');
    assert(
      (await shellStorage(page, 'asciiRunnerHighScore')) === '4321' &&
        JSON.parse(await shellStorage(page, 'ms_best')).beginner.time === 99,
      'Refused writes left the shell storage unchanged'
    );

    // ── Test 5: Saved state written by the apps ────────────────────────────
    console.log('\nTest 5: Apps save state through the shell');
    const runner = frames['ASCII Runner'];
    await runner.waitForFunction(() => highScore === 4321, null, { timeout: 5000 });
    assert(true, 'ASCII Runner shows the high score saved before the sandbox');
    await runner.evaluate(() => {
      score = 5000;
      triggerDeath();
    });
    await page.waitForFunction(() => localStorage.getItem('asciiRunnerHighScore') === '5000');
    assert(true, 'A new ASCII Runner high score is saved in the shell');

    const mines = frames.Minesweeper;
    await page.evaluate(() => window.WindoesApp.WindowManager.bringToFront('minesweeper'));
    await mines.waitForFunction(() => loadBestTimes().beginner?.time === 99, null, {
      timeout: 5000,
    });
    await mines.evaluate(() => {
      state.diff = 'beginner';
      state.timerVal = 7;
      checkBestTime();
    });
    await mines.fill('#winName', 'Ada');
    await mines.click('#winOk');
    const winDialogOpen = await mines.evaluate(() =>
      document.getElementById('winDialog').classList.contains('visible')
    );
    assert(!winDialogOpen, 'The Minesweeper record dialog closes after OK');
    await page.waitForFunction(
      () => JSON.parse(localStorage.getItem('ms_best')).beginner.time === 7
    );
    assert(true, 'The Minesweeper record is saved in the shell');

    const boks = frames.VirtualBoks;
    await page.evaluate(() => window.WindoesApp.WindowManager.bringToFront('virtualboks'));
    await boks.click('#btnNew');
    await boks.waitForSelector('#dialogBackdrop:not([hidden])');
    await boks.fill('#fName', 'Sandboxed Machine');
    await boks.fill('#fUrl', 'https://example.invalid/guest.iso');
    await boks.click('#formOk');
    await page.waitForFunction(() =>
      (localStorage.getItem('virtualboks.machines.v1') || '').includes('Sandboxed Machine')
    );
    assert(true, 'A new VirtualBoks machine is saved in the shell');

    // ── Test 6: Saved state survives a reload ──────────────────────────────
    console.log('\nTest 6: Saved state survives a reload');
    await waitForBoot(page, baseUrl);
    const runnerAgain = await openApp(page, appByName('ASCII Runner'));
    await runnerAgain.waitForFunction(() => highScore === 5000, null, { timeout: 5000 });
    assert(true, 'ASCII Runner high score is 5000 after reload');

    const minesAgain = await openApp(page, appByName('Minesweeper'));
    await minesAgain.waitForFunction(() => loadBestTimes().beginner?.time === 7, null, {
      timeout: 5000,
    });
    await minesAgain.evaluate(() => showBestTimes());
    const bestRow = await minesAgain.evaluate(() => [
      document.getElementById('bestBegTime').textContent,
      document.getElementById('bestBegName').textContent,
    ]);
    assert(
      bestRow[0] === '7' && bestRow[1] === 'Ada',
      `Best Times shows the saved record after reload (${bestRow})`
    );

    const boksAgain = await openApp(page, appByName('VirtualBoks'));
    await boksAgain.waitForFunction(
      () =>
        [...document.querySelectorAll('.vm-item .vm-name')].some(
          (el) => el.textContent === 'Sandboxed Machine'
        ),
      null,
      { timeout: 5000 }
    );
    assert(true, 'VirtualBoks lists the saved machine after reload');

    // ── Test 7: Winamp remote tracks come through the shell ────────────────
    console.log('\nTest 7: The shell fetches Winamp remote tracks');
    const winamp = await openApp(page, appByName('Winamp'));
    await winamp.waitForFunction(
      () => document.querySelectorAll('#playlist-tracks > *').length > 1,
      null,
      { timeout: 5000 }
    );
    assert(true, 'Winamp loads tracks.json from its opaque origin (dev CORS)');
    const startTime = await winamp.evaluate(
      () => document.getElementById('time-display').textContent
    );
    await page.evaluate(() => window.WindoesApp.WindowManager.bringToFront('winamp'));
    await winamp.click('#btn-play');
    // The time display moves only while the audio element plays the track.
    await winamp.waitForFunction(
      (initial) =>
        document.getElementById('btn-play').classList.contains('active') &&
        document.getElementById('time-display').textContent !== initial,
      startTime,
      { timeout: 10000 }
    );
    assert(true, 'Winamp plays the first remote track');
    const streamed = trackRequests.filter((r) => r.path === '/stream');
    assert(
      streamed.length === 1 && trackRequests.every((r) => r.origin === shellOrigin),
      `Every Worker request came from the shell origin (${JSON.stringify(trackRequests)})`
    );
    const before = trackRequests.length;
    const unlisted = await frameRequest(winamp, 'winamp-track-fetch', { key: 'tracks/x.mp3' });
    assert(
      unlisted?.ok === false && trackRequests.length === before,
      'The shell refuses a track key that is not in its manifest'
    );
    const fromOtherApp = await frameRequest(
      await openApp(page, appByName('Solitaire')),
      'winamp-track-fetch',
      { key: 'tracks/Osmoza - Oczy.mp3' },
      1000
    );
    assert(
      fromOtherApp === null && trackRequests.length === before,
      'The shell ignores a track request from another app'
    );

    // ── Test 8: Internet Explorer ──────────────────────────────────────────
    console.log('\nTest 8: Internet Explorer sandboxes shell-origin pages');
    await page.evaluate(() => window.WindoesApp.open.internetExplorer());
    await page.evaluate(
      (url) => window.WindoesApp.browser.navigate(url),
      `${baseUrl}/applications/solitaire/index.html`
    );
    const ieShellFrame = await waitForIeFrame(page, /applications\/solitaire\/index\.html/);
    const ieShellSandbox = await page.getAttribute('#browserFrame', 'sandbox');
    assert(ieShellSandbox === 'allow-scripts', `Shell-origin page gets "${ieShellSandbox}"`);
    const ieAccess = await ieShellFrame.evaluate(probeShellAccess);
    assert(
      ieAccess.parentDocumentError === 'SecurityError',
      'A shell-origin page in IE cannot read window.parent.document'
    );

    await page.evaluate((url) => window.WindoesApp.browser.navigate(url), IE_REMOTE_URL);
    await waitForIeFrame(page, /ie-remote\.test/);
    const ieRemoteSandbox = await page.getAttribute('#browserFrame', 'sandbox');
    assert(
      ieRemoteSandbox === 'allow-scripts allow-same-origin',
      `A page on another origin keeps its own storage ("${ieRemoteSandbox}")`
    );
    await page.waitForTimeout(300);
    assert(
      JSON.parse(await shellStorage(page, 'ms_best')).beginner.time === 7,
      'A message from a non-app frame does not reach the storage bridge'
    );

    // ── Test 9: Dev server CORS covers app files only ──────────────────────
    console.log('\nTest 9: Dev server allows cross-origin reads of app files only');
    const appFile = await ctx.request.get(`${baseUrl}/applications/winamp-player/tracks.json`, {
      headers: { Origin: 'null' },
    });
    const sourceFile = await ctx.request.get(`${baseUrl}/app-windows.jsx`, {
      headers: { Origin: 'null' },
    });
    assert(
      appFile.headers()['access-control-allow-origin'] === '*',
      'App files answer with Access-Control-Allow-Origin: *'
    );
    assert(
      !sourceFile.headers()['access-control-allow-origin'],
      'Shell source modules stay closed to other origins'
    );

    // ── Test 10: No sandbox-escape warning ─────────────────────────────────
    console.log('\nTest 10: Chromium never warns that a frame can escape its sandbox');
    const warnings = consoleMessages.filter((text) => ESCAPE_WARNING.test(text));
    assert(warnings.length === 0, `No "can escape its sandboxing" warning (${warnings.length})`);
  } finally {
    await ctx.close();
    await browser.close();
    server.close();
  }
}

runTests()
  .then(() => tracker.exitWithSummary())
  .catch((error) => {
    console.error('Test run failed:', error);
    process.exit(1);
  });
