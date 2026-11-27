---
opened: 2026-11-27
---

# F006 · Winamp keeps the EQ preamp boost when the volume changes

## Outcome

In Winamp, moving the volume slider or pressing the volume keys sets the output gain to the volume alone, so a preamp boost or cut set on the equalizer is lost until the preamp is moved again. After this, the output always reflects both the volume and the preamp.

## Scope

- Start in `windoes/public/applications/winamp-player/app.js`, where the volume slider and the global volume keys write the output gain.
- One place computes the gain from volume, preamp and EQ ON; every control calls it.

## Out of scope

- Equalizer band filters, presets, or new audio features.
- Winamp's look.

## Acceptance

- With preamp at +6 dB, moving the volume keeps the output gain at volume × 10^(6/20).
- The volume keys behave the same way as the slider.
- With EQ ON off, the preamp does not change the gain.
- The Winamp app suite passes, including remote track playback.
