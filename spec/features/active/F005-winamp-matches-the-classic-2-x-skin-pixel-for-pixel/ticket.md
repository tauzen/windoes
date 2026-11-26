---
opened: 2026-11-26
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

- A side-by-side image of each window (main, equalizer, playlist) next to its reference screenshot, at 1× scale, is in the feature folder.
- A pixel diff against each reference shows no difference outside dynamic areas (track title, time, visualizer, playlist rows); the diff images are in the feature folder.
- Text renders with a pixel font drawn for this app in the skin's style, not a system font.
- The Winamp app suite and the sandbox test pass, including remote track playback.

## Notes

Owner decision: all art is our own, redrawn from the reference screenshots. Do not ship, extract or trace the original Winamp skin bitmaps or `.wsz` files. Reference screenshots stay comparison material, committed only where their license allows.
