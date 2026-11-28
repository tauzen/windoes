# Outcome

The Start menu has Windows 98 proportions and timing: 32 px root icons in 36 px rows, 20 px submenu rows, the navy-to-blue banner, drawn arrows, and submenus that open after a 400 ms hover. Merged in PR #153 (`cdefd24`). `tests/test-start-menu.js` covers the delay (it failed on the old code), crossing another item and keyboard navigation. The banner gradient direction was not compared with a real Windows 98 screenshot.
