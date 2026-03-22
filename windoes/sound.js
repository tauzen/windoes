// ══════════════════════════════════════════════
// Sound System (Web Audio API)
// ══════════════════════════════════════════════
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
function ensureAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
    return audioCtx;
}

function playBeep(freq, duration, type) {
    try {
        const ctx = ensureAudio();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || 'square';
        osc.frequency.value = freq;
        gain.gain.value = 0.08;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch(e) {}
}

function playStartupSound() {
    try {
        const ctx = ensureAudio();
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.value = 0;
            gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.3 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.3 + 0.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.3);
            osc.stop(ctx.currentTime + i * 0.3 + 0.7);
        });
    } catch(e) {}
}

function playErrorSound() {
    playBeep(400, 0.15, 'square');
    setTimeout(() => playBeep(300, 0.2, 'square'), 160);
}

function playClickSound() {
    playBeep(800, 0.03, 'square');
}

// Register on shared namespace
WindoesApp.sound = { playBeep, playStartupSound, playErrorSound, playClickSound };
