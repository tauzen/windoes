# F003 notes · survey and decision

## Decision

Use an **opaque origin**: drop `allow-same-origin` from every app iframe and move the three apps that keep saved state onto a shell-owned storage bridge over `postMessage`. A separate serving origin needs a second GitHub account or organization, or a custom domain, plus a second deploy. It still needs a message bridge for Paint. It also strands the saved state that users have today. The opaque origin works on GitHub Pages as deployed now, because Pages sends `Access-Control-Allow-Origin: *` on every file.

One cost has no clean fix inside this repository: the Winamp track Worker. See "Winamp remote tracks" below. The recommended path needs no owner action.

## How this was measured

A Playwright probe opened each app window three ways: current sandbox, the same flags without `allow-same-origin`, and the current flags with the app served from a second origin (another port). It ran against the Vite dev server that the integration tests use, and against `dist/` served under `/windoes/` with `Access-Control-Allow-Origin: *` to copy GitHub Pages. Inside each frame it tried `localStorage`, `sessionStorage`, `indexedDB.open`, a relative `fetch`, `window.parent.document`, and `frameElement`. For VirtualBoks it also loaded `libv86.js` and waited for `emulator-loaded` (wasm and BIOS fetched). The shell side recorded `e.origin` of each message.

The scripts and raw JSON are not committed. They are in the main checkout's job folder, `.limen/jobs/2026-11-22-f003-app-sandbox-survey-289f5981/probe/` (`probe.cjs`, `warn-probe.cjs`, `probe-dev.json`, `probe-pages.json`, `warn-probe.out`). Remote host checks used `curl` with an explicit `Origin` header.

## Results common to every app frame, opaque origin

- `self.origin` is `"null"`. `location.origin` is still the shell's origin. Paint depends on this; see the Paint row.
- `localStorage`, `sessionStorage` and `indexedDB.open` throw `SecurityError`.
- `window.parent.document` throws `SecurityError` and `frameElement` is `null`. With the current flags, the frame read the shell's title and reached `frameElement`, so it could remove its own sandbox.
- Messages to the shell arrive with `e.origin === "null"`. Today `isTrustedMessageEvent` requires `e.origin === window.location.origin`, so the shell drops all of them: the probe saw no resize from Minesweeper, Solitaire or Paint.
- The shell cannot reply with `e.source.postMessage(msg, e.origin)`. A target origin of `"null"` throws `SyntaxError: Invalid target origin 'null'` (observed). Replies to an opaque frame must use `'*'`. That is safe only because the shell posts to the `contentWindow` that it verified as the sender.
- A relative `fetch` or XHR is now cross-origin. Under the Pages copy it returns 200 because of `Access-Control-Allow-Origin: *`. On the Vite dev server (8.0.11) it fails: Vite's default CORS allows only localhost origins, and `"null"` is not one. `<script src>`, `<img>` and `<audio>` without `crossOrigin` load without CORS and keep working.
- The Chromium warning "can escape its sandboxing" disappears (observed for all seven).

## Per iframe in `windoes/app-windows.jsx`

| Frame | Flags today | Breaks without `allow-same-origin` | Needed |
| --- | --- | --- | --- |
| `appFrame` (ASCII Runner, `openApp`) | scripts, same-origin; `allow="autoplay"` | `game.js:76` reads `localStorage` at the top level and throws. The rest of `game.js` does not run, so the game never starts (observed pageerror). The high score (`asciiRunnerHighScore`) is lost. | Storage bridge; read the high score asynchronously after init. |
| `winampFrame` | scripts, same-origin | Dev: `fetch('tracks.json')` is blocked by CORS, so there is no remote playlist (observed). Pages: `tracks.json` loads. The track Worker rejects `Origin: null` for both `/sign` and `/stream` with 403 (curl). With `crossOrigin='anonymous'`, remote tracks do not play. Resize and close messages are dropped by the shell's origin check. | Dev CORS fix; Winamp track path below; shell origin check. |
| `minesweeperFrame` | scripts, same-origin | `loadBestTimes` is guarded, so best times read as empty. `saveBestTimes` (line 592) is not guarded. On a record time, the OK button throws before the dialog closes, so the win dialog stays open. Resize is dropped. | Storage bridge (`ms_best`); shell origin check. |
| `solitaireFrame` | scripts, same-origin | No storage use. Resize is dropped. | Shell origin check only. |
| `minecraftFrame` | scripts, same-origin, pointer-lock | Nothing observed. No storage or fetch use. Pointer lock depends on its own flag. | None. |
| `virtualboksFrame` | scripts, same-origin, downloads | The user's machine list (`virtualboks.machines.v1`) does not load. On save, the guarded catch shows "this browser is blocking storage". Dev: v86 cannot fetch `vendor/v86.wasm` or XHR `seabios.bin` (CORS; `emulator-loaded` never fired). Pages: the emulator loads. Built-in guest images on `i.copy.sh` send `Access-Control-Allow-Origin: *` for `Origin: null` (curl). A local image file and the Screenshot download do not depend on the origin. | Storage bridge; dev CORS fix. |
| `paintFrame` | scripts, same-origin, downloads, modals | No direct storage use: files go through the shell's VirtualFS by message. Paint posts with target origin `window.location.origin`, which is still the shell's origin, so delivery works. Its reply check `event.origin === window.location.origin` also passes for shell replies. It breaks only because the shell drops `"null"` and replies to `e.origin`. | Shell origin check and `'*'` replies only. Paint path grants are unchanged. |

IndexedDB: no app opens IndexedDB. The VirtualFS lives in the shell and is not affected.

## IE frame (`windoes/ie-window.jsx`, outside `app-windows.jsx`)

- The local `srcdoc` path already uses `allow-scripts` only. It is opaque and is not affected.
- The remote path keeps `allow-scripts allow-same-origin`. `normalizeBrowserUrl` accepts any https URL, so a user can type `https://tauzen.github.io/windoes/`, or any other `tauzen.github.io` project page. That page is then same-origin with the shell, with both flags. This is the same escape. The ticket's first acceptance line covers it. The boring fix: when the resolved URL's origin equals `location.origin`, use the local sandbox (`allow-scripts`). A link that navigates inside the frame keeps the iframe's flags. To be complete, drop `allow-same-origin` for remote pages as well; external sites then lose storage inside IE. That is a product call for the implementer. The origin-match rule covers the typed URL only.

## Opaque origin vs separate serving origin

| | Opaque origin | Separate origin |
| --- | --- | --- |
| Hosting | Works on Pages today (`Access-Control-Allow-Origin: *` verified on `tauzen.github.io`). | All project sites of one account share `tauzen.github.io`. A new origin needs a second account or organization site, or a custom domain. A cross-repository deploy needs a token secret. Pages cannot set headers, so there is no server-side fix either way. |
| Release | One build, one deploy. | Two deploys that can skew. The message protocol must stay compatible across versions. |
| App storage | Shell-owned bridge. The data stays where it is today: the three keys already live in the shell origin's `localStorage`, so saved state carries over. | Works directly in the frame, but starts empty on the new origin. Today's saved state stays behind unless there is a migration handshake. |
| Messages | `e.origin === "null"`; replies use `'*'`. | Shell checks a configured apps origin. Paint's `window.location.origin` target and reply check break: the probe saw "target origin does not match" and the shell dropped the second-origin resize. Paint must learn the shell's origin. |
| Winamp Worker | Rejects `null`. Needs a shell-side fetch, or `null` on the allowlist. | The owner adds the new origin to the Worker allowlist (private repository). |
| Dev and tests | One Vite server plus a CORS rule for `/windoes/applications/`. | Two servers or ports. `iframeSrc` becomes absolute and configured. |
| Chromium warning | Gone. | The iframe sits at `about:blank` with both flags before `src` is set, and that state alone logs the warning (observed with a second origin, and in a minimal page; see `warn-probe.out`). The flags or `src` must be set together. |

## Implementation seams (opaque)

- **Sandbox attributes**: remove `allow-same-origin` from the seven frames in `app-windows.jsx`, and fix the IE remote case above.
- **`isTrustedMessageEvent`**: keep the `contentWindow` identity check as the real guard. Accept `e.origin === "null"` (and nothing else) for app frames. Every reply in `onAppMessage` uses `'*'` and goes to the verified `e.source`. The Paint path grants change (F002) is rewriting `onAppMessage` in parallel. This ticket must build on that version, not edit around it.
- **Storage bridge**: the shell derives the app id from which frame sent the message, never from the payload. It stores per-app data in the shell's `localStorage` and keeps reading the existing keys (`asciiRunnerHighScore`, `ms_best`, `virtualboks.machines.v1`), so a reload and an upgrade keep the data. Apps use the bridge only when `window.self !== window.top`. The app suites load each app top-level from `file://`, where `localStorage` works, so those suites do not exercise the bridge. The "survives a reload" acceptance needs a shell integration test that runs the embedded app.
- **Dev CORS**: a small Vite plugin middleware (dev and preview) that adds `Access-Control-Allow-Origin: *` to responses under `/windoes/applications/`. This matches Pages exactly. Do not set `server.cors: true`, because that also exposes the dev server's source modules to any site.
- **Winamp remote tracks**: the Worker accepts only `Origin: https://tauzen.github.io` on `/sign` and `/stream` (curl: 403 for `null`, for no Origin, and for another origin). Recommended: the shell performs the sign and stream fetch for the Winamp frame and transfers the `ArrayBuffer`. Winamp plays it from a `blob:` URL that it creates itself, which keeps the WebAudio EQ and visualizer working. Cost: playback starts after the whole file has downloaded (10,974,848 bytes for the first track). Alternative: the owner adds `null` to the Worker allowlist. That allows any sandboxed frame on any site, which defeats the allowlist. Not recommended.
- **Acceptance test for the escape**: inside the app frame, `window.parent.document` must throw `SecurityError` (`FRAME_PROBE` in `probe.cjs` shows the shape). In the same run, assert that no console message matches `/escape its sandboxing/`.

## Open question

- IE remote pages: keep `allow-same-origin` for other origins (with the same-origin guard above), or drop it for all of them? This is a product call. Recommended: keep it with the guard.
