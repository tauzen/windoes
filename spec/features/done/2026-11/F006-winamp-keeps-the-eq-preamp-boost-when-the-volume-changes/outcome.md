# Outcome

Winamp's output gain now follows the volume, the EQ preamp and EQ ON together: one `applyGain()` in `app.js` sets it, and the volume slider, the volume keys and every equalizer control call it. Merged in PR #142 (`3924756`). Test 8 of the Winamp suite reads the real GainNode value; it failed on the old code (slider and volume-key checks) and passes now. No independent review: a 19-line change covered by that test.
