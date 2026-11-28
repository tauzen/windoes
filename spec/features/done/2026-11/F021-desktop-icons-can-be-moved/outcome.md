# Outcome

Desktop icons can be dragged with a mouse or by touch; a drag does not open the app, positions survive a reload in `localStorage`, and icons stay inside the desktop and do not overlap after a resize. Merged in PR #151 (`18caa40`). `tests/test-desktop-drag.js` covers drag, reload, selection and double-click and failed on the old code; touch dragging was proven once in a browser run, not in the permanent test.
