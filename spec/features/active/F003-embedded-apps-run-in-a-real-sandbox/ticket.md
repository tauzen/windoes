---
opened: 2026-11-22
---

# F003 · Embedded apps run in a real sandbox

## Outcome

The app iframes load from the shell's own origin with `sandbox="allow-scripts allow-same-origin"`. With both flags on a same-origin page, an app can remove its own sandbox and reach the shell's DOM and storage. After this, an embedded app cannot touch the shell except through the validated message channel.

## Scope

- Start with a survey: for each iframe in `windoes/app-windows.jsx`, list what breaks without `allow-same-origin` (localStorage, IndexedDB, fetch of local assets, the VirtualBoks guest, the IE `srcdoc` path).
- Decide between an opaque origin (drop `allow-same-origin`, move app storage behind messages) and a separate serving origin; GitHub Pages hosting is the constraint.
- The parent's origin check (`isTrustedMessageEvent`) must follow the chosen design; an opaque origin sends `"null"`.
- Write the survey and the decision to `notes.md` in this folder before code changes.

## Out of scope

- Moving inline app scripts into modules.
- The Paint path grants (a separate ticket); keep them working.

## Acceptance

- No app iframe has both `allow-scripts` and `allow-same-origin` on a same-origin document.
- The Chromium "can escape its sandboxing" warning no longer appears in the integration run.
- A test shows that script in an app frame cannot read `window.parent.document`.
- A test shows that script in the Paint frame cannot grant itself a file path by calling `parent.WindoesApp.open.paint` (the gap left open by the Paint path grants).
- Every app suite in `npm run test:all` passes, including saved state that survives a reload.

## Notes

The Paint path grants have landed in `onAppMessage`; keep them working.
