PASS 13fbd6117eb0777bccbefe7564a95b0ee66591f4

My verdict is unchanged. The candidate commit fixes the Refresh escape from `review-1.md`, the first review's findings, and the full suite passes. The candidate commit `13fbd6117eb0777bccbefe7564a95b0ee66591f4` is HEAD. `git rev-parse HEAD && git status --short` printed that commit and no changed files.

One check is not proven. The probe that tested every Internet Explorer path does not count as recorded proof:

- The bash call that ran it started with another command and a `;`.
- That call piped the probe's output through `grep`.
- I deleted the probe file afterward.

Its output exists only in this job's transcript. I did not rerun it, as the instructions require.

## Note check

- **Review-1 blocking finding fixed (IE Refresh with a typed shell-origin URL gets `allow-scripts` only): proven.** `/tmp/f003-rr-test-all.log` lines 671–672 show the new Test 8 Refresh case passing at clean HEAD `13fbd61`.
- **No IE path (Go, Enter, Refresh, Back/Forward, Home, navigate call) leaves a shell-origin document in a frame with `allow-same-origin`: not proven.**
  - The code read finds only two functions that write the frame's `src`, `srcdoc` or `sandbox`. They are `navigate` and `navigateToLocalFile` in `windoes/ie-window.jsx`.
  - The probe result `ANY_BAD false` exists only in this transcript.
  - `/tmp/f003-rr-test-all.log` covers only `navigate()` and Refresh. Back, Forward, Enter, Go and Home have no recorded proof.
- **Acceptance 1, no app iframe has both flags on a same-origin document: proven for the app frames and for the IE paths the suite covers.** `/tmp/f003-rr-test-all.log` shows Test 1 and Test 8 passing. The other IE paths are not proven, as stated in the line above.
- **Acceptance 2, no Chromium escape warning in the integration run: proven.** `/tmp/f003-rr-test-all.log` line 679 shows Test 10 passing with a count of 0.
- **Acceptance 3, a test shows an app frame cannot read `window.parent.document`: proven.** `/tmp/f003-rr-test-all.log` shows Test 2 of `test-app-sandbox.js` passing, and the whole suite passed 56 of 56.
- **Acceptance 4, a test shows Paint cannot grant itself a path through `parent.WindoesApp.open.paint`: proven.** `/tmp/f003-rr-test-all.log` shows Test 3 of `test-app-sandbox.js` passing.
- **Acceptance 5, every app suite in `npm run test:all` passes, including reload state: proven.** `/tmp/f003-rr-test-all.log` shows `EXIT 0` at line 1246 and every suite at "0 failed". It shows reload state passing at lines 654–657 and VirtualBoks reload at line 1154.
- **Easy-to-miss rule, evidence from another commit or a dirty tree is unverified: followed, but only partly proven.**
  - I did not reuse any log from `review-1.md` or from the earlier job.
  - `git rev-parse HEAD && git status --short` shows HEAD `13fbd61` and a clean tree now.
  - The output that showed HEAD and the clean tree just before `test:all` came from a call that used `|` and `;`. So no qualifying record links `/tmp/f003-rr-test-all.log` to the clean tree at the time of the run. That log has no commit stamp. No commit or edit happened in the worktree between that run and the clean-tree check.
