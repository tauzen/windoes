---
opened: 2026-11-22
landed: 2026-11-22
---

# F002 · Paint reads and writes only files the user picked

## Outcome

The shell accepts `paint-vfs-save` and `paint-vfs-load` messages for any path in the virtual file system. Any code running in the Paint frame can therefore read or overwrite any file there. After this, the shell serves a Paint load or save only for a path the user chose in the file chooser during this Paint session, so the frame cannot reach files the user did not pick.

## Scope

- Start at `onAppMessage` in `windoes/app-windows.jsx`: `paint-request-file-path` returns the chosen path; record it there as a grant for that Paint frame and mode.
- `paint-vfs-load` and `paint-vfs-save` check the normalized path against the grants and refuse others with an `ok: false` error.
- A save to a path that was granted for open, or opened earlier, must still work (re-save of the current file).
- Grants end when the Paint window closes.

## Out of scope

- Moving apps to a separate origin or changing iframe `sandbox` flags (a separate ticket).
- Other apps' messages and the shared `postMessage` helper.

## Acceptance

- A unit or integration test shows that load of a path that was never chosen returns `ok: false` and does not read the file.
- A test shows that save to a path that was never chosen returns `ok: false` and does not write the file.
- Open a chosen file, edit it, save it: the Paint suite still passes this flow.
- Save As to a new chosen path, then Save again: both writes succeed.
- `npm run test:all` passes.
