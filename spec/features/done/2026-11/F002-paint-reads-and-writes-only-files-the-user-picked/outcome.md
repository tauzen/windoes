# Outcome

The shell now serves Paint VFS load and save only for paths the user picked in the file chooser or opened Paint with, and only for messages from the Paint frame. Grants end when Paint closes or opens a new document. Landed in `751055e` after an independent PASS (`review-1.md`) that reran `test:all` and showed the new test fails on the old code. Known gap: the Paint frame is same-origin, so its code can call `parent.WindoesApp.open.paint` and grant itself a path; the embedded-apps sandbox work (F003) must close that.
