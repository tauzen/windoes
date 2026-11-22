FAIL e265ec771f3d53c483252005a76674d68bbe50c3

I reviewed commit `e265ec771f3d53c483252005a76674d68bbe50c3`. `git rev-parse HEAD` in the review worktree returns that commit, and the tree is clean.

## Blocking

**1. The Internet Explorer Refresh button skips the new sandbox rule. A page from the shell's own origin then loads with both flags and can escape (proven with a throwaway Playwright probe).**

This breaks acceptance bullet 1: no app iframe has both `allow-scripts` and `allow-same-origin` on a same-origin document. The candidate's own notes say this bullet covers the IE frame. The candidate's IE rule says a page on the shell's origin gets `allow-scripts` only.

- **Where:** `windoes/ie-window.jsx:284-294`. `onRefreshClick` runs `frame.src = addressInput.value` directly. It does not call `sandboxForUrl` or `normalizeBrowserUrl`, so the frame keeps the sandbox flags from the previous page.
- **Reproduction against the Vite test server:**
  1. Navigate IE to a remote page. The frame gets `allow-scripts allow-same-origin`.
  2. Type `<baseUrl>/applications/solitaire/index.html` into `#addressInput`. Do not press Enter.
  3. Click `#refreshBtn`.
- **Result:**
  - The frame's sandbox stays `"allow-scripts allow-same-origin"`.
  - Script in the frame has `self.origin === "http://127.0.0.1:5173"`.
  - The script reads `window.parent.document.title` as `"Windoes XD"`.
  - `typeof window.parent.WindoesApp` is `"object"`. So the page can also call `parent.WindoesApp.open.paint`, which is the Paint self-grant gap from bullet 4.
  - Chromium logs "…can escape its sandboxing." once.
- **Why the suite misses it:** `tests/test-app-sandbox.js` Test 8 sets the IE URL only through `WindoesApp.browser.navigate`, which is guarded. No test uses Refresh.
- **Fix direction:** route Refresh through `navigate(addressInput.value, false)`, or apply `sandboxForUrl(normalizeBrowserUrl(...))` before setting `src`. Add a Test 8 case that uses Refresh with a typed shell-origin URL.
- **Scope:** a user must type the shell-origin URL and click Refresh instead of Go. Only shell-origin documents load there. This path is not the gap the owner accepted, which was a remote page that navigates its own frame. The candidate's own rule does not hold on this path.

## Unverified

- **Retained evidence logs:** the logs in `.limen/jobs/2026-11-22-f003-apps-run-in-an-opaque-sandb-04b918db/` have no commit stamp. I treated them as unverified and reran the suite here.
- **Production:** I did not test the real Winamp track Worker or a GitHub Pages deploy. The candidate states the same limit.
- **IE remote page that navigates its own frame to the shell origin:** my probe could not load the shell page there. The navigation from the routed remote page to `127.0.0.1` never completed, probably because Chromium blocks a public page from navigating to a local address. This gap is owner-accepted and recorded in `notes.md`.
- **Probe file:** I deleted the probe script (`/tmp/f003-review-probe/probe.cjs`) after use. Its output exists only in this job's transcript.

## Notes

- **"null"-origin trust follows the frame, not the document (plausible).** In my probe, I navigated the Minesweeper frame to a foreign page, `https://evil.test/storage`. That page still sends with origin `"null"` and `e.source === minesweeperFrame.contentWindow`, so the shell treated it as Minesweeper. Its `app-storage-save` overwrote `ms_best` with `"PWNED"`. With the old origin check, the shell would have rejected that page's messages.
  - This result came from a second probe run whose command was not a single `&&` chain, so it does not count as recorded proof. I label the finding plausible.
  - Today no app document navigates itself to an outside URL. A grep for links, `window.open` and `location` assignments in `windoes/public/applications` found nothing outside vendor code, and `open.app` callers use fixed URLs.
  - So the trust is sound for the current first-party apps. Any future app link or redirect inherits that app's bridge rights: its storage key, Paint grants, and Winamp fetch. A comment at `isTrustedMessageEvent` should state this invariant.
- **Other isolation checks that held:**
  - The storage bridge is scoped correctly. `storageKeyForFrame` maps from the iframe's `src` attribute, never from the payload, and a request for another app's key gets `ok:false` (Test 4).
  - Winamp fetch is scoped correctly. It is limited to `winampFrame` and to keys listed in the shell's own `tracks.json` (Test 7).
  - Paint grants still hold. In the same second probe run, `paint-vfs-load` for an unchosen path got `ok:false`.
  - Replies go only to the verified `e.source`, with target `'*'`. Nested frames fail the `contentWindow` identity check.
- **Cross-app message types (plausible, mostly pre-existing):** `paint-close`, `paint-title`, `winamp-close` and the `*-resize` messages are not limited to their own frame. This candidate adds `virtualboksFrame` to `messagingFrames`, so VirtualBoks can now also close Paint or Winamp. The effect is a nuisance, not a data risk.
- **Storage quota (plausible):** an app can write a value of any size to its own key. This can use up the shell origin's `localStorage` quota, which other shell state shares. Before this change, apps had full same-origin access, so this is not a regression.
- **Winamp downloads (plausible):** `winampFrame` can repeat `winamp-track-fetch` for listed tracks without limit. Each request makes the shell download the full file, about 11 MB for the first track.
- **Refresh skips URL normalization (pre-existing):** Refresh also bypasses `normalizeBrowserUrl`, so a typed `javascript:` URL is not rejected there either. The same fix covers it.

## Checks run

- `npm ci` with `/tmp/f002-review-scratch/env.sh` and `HUSKY=0`: added 312 packages.
- `npm run test:all` (typecheck, lint, unit, integration, all app suites): exit 0, every suite "0 failed". The log is `/tmp/f003-review-test-all.log`.
  - `test-app-sandbox.js` passed 54 of 54, including Test 10: "No 'can escape its sandboxing' warning (0)".
- First probe run: `source /tmp/f002-review-scratch/env.sh && REPO=$PWD NODE_PATH=$PWD/node_modules node /tmp/f003-review-probe/probe.cjs`.
  - It reproduced the IE Refresh escape described under Blocking.
  - It then stopped at the IE self-navigation case described under Unverified.
- Second probe run: this run used a multi-line command, so it is not recorded proof.
  - It repeated the IE Refresh result.
  - It showed the foreign-page trust case from the first note.
  - It showed that the Paint request for an unchosen file was refused.
- Code read of the full diff between merge commit `4dd03b6` and HEAD.

## Note check

- **HEAD is e265ec7:** proven. `rm -rf /tmp/f003-review-probe && git status --short && git rev-parse HEAD` printed `e265ec771f3d53c483252005a76674d68bbe50c3` with no changed files.
- **No frame reaches shell DOM, other storage keys, ungranted VFS paths, or unlisted Winamp keys:** not proven. The check is disproved for the IE frame. `source /tmp/f002-review-scratch/env.sh && REPO=$PWD NODE_PATH=$PWD/node_modules node /tmp/f003-review-probe/probe.cjs` showed a shell-origin page reading `parent.document` and `parent.WindoesApp` after Refresh. Storage, VFS and Winamp scoping rest on `/tmp/f003-review-test-all.log` (Tests 3, 4 and 7) and the code read.
- **Acceptance 1, no app iframe has both flags on a same-origin document:** not proven. The first probe command above broke it through the IE Refresh path.
- **Acceptance 2, no Chromium escape warning in the integration run:** proven. `/tmp/f003-review-test-all.log` shows Test 10 passing with 0 warnings. The warning does appear after the untested Refresh path, per the probe.
- **Acceptance 3, a test shows an app frame cannot read `window.parent.document`:** proven. `/tmp/f003-review-test-all.log` shows Test 2 passing for all seven app frames.
- **Acceptance 4, a test shows Paint cannot grant itself a path through `parent.WindoesApp.open.paint`:** proven. `/tmp/f003-review-test-all.log` shows Test 3 passing. The IE Refresh path exposes `parent.WindoesApp` again, as described under Blocking.
- **Acceptance 5, every app suite in `npm run test:all` passes, including reload state:** proven. `/tmp/f003-review-test-all.log` shows exit 0, all suites "0 failed", and Test 6 (reload) passing.
- **"null"-origin trust is sound with only the e.source check:** not proven. The code read finds it sound for the current apps. The evidence that a foreign document in an app frame is trusted comes from a multi-line probe run, which does not count, so there is no valid record.
- **Easy-to-miss rule, evidence from another commit or a dirty tree is unverified:** followed. The retained logs, for example `/home/agent/windoes/.limen/jobs/2026-11-22-f003-apps-run-in-an-opaque-sandb-04b918db/test-all.log`, carry no commit stamp. I did not reuse them. I reran the suite at HEAD on a clean tree into `/tmp/f003-review-test-all.log`.
