PASS 8f199f6038805ea3054cbd828de82bee366d1232

I reviewed commit `8f199f6038805ea3054cbd828de82bee366d1232`. `git rev-parse HEAD` printed that value. Nothing blocks.

The proof is weaker than the verdict needs. I joined most check commands with `;` and saved no logs, so by the note rules most results below lack proof. I did not rerun them to clear the note.

**Blocking findings:** none.

**Unverified checks:** I did not run the full `npm run test:integration` lane.

## Notes

- **Only winampFrame can minimize or close Winamp (proven by code).**
  - The new checks are in `windoes/app-windows.jsx:596-601`. Each message type requires `iframe === winampFrame`. Before this commit, any trusted app frame could send `winamp-close`.
  - The diff does not touch `isTrustedMessageEvent`, `frameOfSource` or any `sandbox` attribute.
  - IE's `#browserFrame` is not in `messagingFrames`, so the shell drops its messages.
  - Test 6 and a throwaway probe showed the same result at runtime. Neither log was saved.
- **A document navigated inside winampFrame keeps its rights (plausible, by design).** Lines 482-485 of the same file say that trust follows the frame, not the document. This commit does not add any path that navigates winampFrame. In an unsaved probe, Solitaire tried to navigate winampFrame and got `SecurityError`.
- **The title bar still drags.** The drag area is now 275 × 14 px, with clip-path holes over the four buttons. Test 3 measured a move of (60, 40). The log was not saved.
- **A broken Winamp page cannot be closed (reproduced in a probe, log not saved).**
  - I loaded `about:blank#x` into winampFrame in place of a Winamp page that fails to load. The shell then had no close control. The taskbar button could only minimize Winamp, and the button stayed in the taskbar until page reload.
  - Before this commit, the shell's own close button always worked.
  - No acceptance bullet covers this. A possible fix is a shell-side close path, for example a Close item on the taskbar button.

## Checks run

These results are from calls that joined commands with `;`, with no saved logs.

- `npm ci`: 312 packages added.
- `node tests/test-winamp-title-bar.js`: 20 passed.
- `node tests/test-app-sandbox.js`: 56 passed.
- `npm run test:winamp-player`: 30 passed.
- `npx eslint` on the four changed JS and JSX files: exit 0.
- `npm run typecheck`: no errors.
- `npx prettier --check` on the changed files: clean.
- Two Playwright probes: results above. I deleted both probes.

## Note check

- HEAD is the candidate and the tree is clean: not proven. The `git rev-parse HEAD` output matched the candidate, but the call joined commands with `;`, and no log was saved.
- Only winampFrame can minimize or close Winamp, and the sandbox and `isTrustedMessageEvent` are not loosened: proven. Evidence: `windoes/app-windows.jsx` lines 140, 463-488 and 596-601. The runtime probes that support it have no saved log.
- Acceptance 1, each title-bar button shows its pressed frame: not proven. Test 1 passed, but the run joined commands with `;`, and no log was saved.
- Acceptance 2, minimize sends Winamp to the taskbar and close closes it: not proven. Tests 4 and 5 passed, but the run has the same gap.
- Acceptance 3, dragging outside the buttons moves the window: not proven. Test 3 passed, but the run has the same gap.
- Acceptance 4, the Winamp suite and the sandbox test pass: not proven. They passed 30 and 56, but the run has the same gap.
- No stuck state after the shell close button is removed: not proven. The probe showed the opposite: a broken Winamp page cannot be closed until page reload. The probe log was not saved.
- Easy-to-miss rule, no evidence from a different commit or a dirty tree: not proven. `git status --short` printed nothing before and after the runs, but both calls joined commands with `;`, and no log was saved.
