---
opened: 2026-11-26
landed: 2026-11-27
---

# F005 · Winamp matches the classic 2.x skin pixel for pixel

## Outcome

The Winamp app in Windoes looks like the classic Winamp 2.x base skin in period screenshots: main window, equalizer and playlist, at the original 275-pixel width, with the original bitmap font, buttons, sliders and visualizer. Today it is a CSS approximation (Arial and Courier New text, drawn gradients), which reads as "Winamp-like", not as Winamp.

## Scope

- Start with a survey: collect reference screenshots of the Winamp 2.x base skin (main, equalizer, playlist; playing and stopped states), record their sources and licenses, and list every visual difference against the current app in `notes.md`.
- Rebuild the visuals of `windoes/public/applications/winamp-player/` at 1× pixel scale with crisp scaling, keeping the existing player behavior in `app.js`.
- Button, slider and toggle states (normal, pressed, active) match the reference.
- The window stays sized to its content inside the shell.

## Out of scope

- Loading user `.wsz` skins or a skin browser.
- Winamp 3/5 "modern" skins, the media library, or new player features.
- Changes to the track download path or the app sandbox.

## Acceptance

- Every window, sprite, button and text field has the reference size and position at 1× (checked by the diff harness's geometry report), and every listed state exists.
- The diff harness writes, per window, a committed diff image of our capture and a share of differing pixels outside the dynamic areas; the share is reported, not gated. Side-by-side images with the reference go to a git-ignored folder for local review.
- Text renders with pixel fonts drawn for this app (5×6 small font, 9×13 digits, and a proportional font for playlist rows), not a system font.
- The Winamp app suite and the sandbox test pass, including remote track playback.

## Notes

Owner decisions: all art is our own, drawn to the reference geometry and palette. Do not ship, extract or trace the original Winamp skin bitmaps or `.wsz` files, and do not copy reference pixels. Reference screenshots are fetched at check time and never committed. The owner judges the look; the main window is shown to the owner before the equalizer and playlist art starts.
