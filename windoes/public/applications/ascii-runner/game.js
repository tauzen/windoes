// Game Constants (base resolution)
const BASE_WIDTH = 800;
const BASE_HEIGHT = 400;
let CANVAS_WIDTH = 800;
let CANVAS_HEIGHT = 400;
let scale = 1;
const TILE_SIZE = 32;
const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const JUMP_CUT_MULTIPLIER = 0.4;

// Speed settings
const START_SPEED = 2;
const MAX_SPEED = 8;
const SPEED_INCREMENT = 0.001;
let currentSpeed = START_SPEED;

// Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                 ('ontouchstart' in window) ||
                 (navigator.maxTouchPoints > 0);

// Touch state for visual feedback
let touchActive = false;

// Color Palette - mirrors CSS variables for use in canvas
const COLORS = {
    // Background colors
    bgDarkest: '#0f0f1a',
    bgDark: '#1a1a2e',
    bgMid: '#16213e',
    bgLight: '#1f4068',

    // Accent colors
    accentPrimary: '#e94560',
    accentSecondary: '#ff6b9d',
    accentTertiary: '#c34a7b',

    // Neon colors for ASCII art
    neonCyan: '#00fff5',
    neonPink: '#ff00ff',
    neonGreen: '#39ff14',
    neonYellow: '#ffff00',
    neonOrange: '#ff6600',
    neonBlue: '#00aaff',

    // Text colors
    textPrimary: '#eaeaea',
    textSecondary: '#a0a0b0',
    textMuted: '#606080',

    // Game elements
    player: '#e94560',
    playerOutline: '#c34a7b',
    ground: '#2a2a4e',
    groundTop: '#4a4a7e',
    groundDark: '#1a1a3e',
    platform: '#3a3a6e',
    platformTop: '#6a6aae',

    // Collectibles
    coin: '#ffdd00',
    coinGlow: '#ffff88',
    spike: '#ff3333',
    spikeGlow: '#ff6666',
    shield: '#00ffaa',
    shieldGlow: '#88ffcc'
};

// Game State
let canvas, ctx;
let gameState = 'start';
let score = 0;
let distance = 0;
let coins = 0;
let combo = 0;
let comboTimer = 0;
let highScore = parseInt(localStorage.getItem('asciiRunnerHighScore')) || 0;

// Screen effects
let screenShake = 0;
let glitchEffect = 0;
let flashEffect = 0;

// Player
const player = {
    x: 150,
    y: 200,
    width: TILE_SIZE - 4,
    height: TILE_SIZE - 4,
    velY: 0,
    onGround: false,
    isJumping: false,
    jumpKeyHeld: false,
    canDoubleJump: true,
    hasShield: false,
    shieldTimer: 0,
    trail: []
};

// Starting chunk
const startingChunk = [
    "................................................",
    "................................................",
    "................................................",
    "................................................",
    "................................................",
    "................................................",
    "..........C...C...C...C.........................",
    "................................................",
    "................................................",
    "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG"
];

// Map chunks with coins (C), spikes (X), shields (S)
const mapChunks = [
    // Chunk 0 - flat with gap and coins
    [
        "................",
        "................",
        "................",
        "................",
        "......C.C.......",
        "................",
        "......C.C.......",
        "....PPP.........",
        "................",
        "GGGGGGGG..GGGGGG",
        "GGGGGGGG..GGGGGG",
        "GGGGGGGG..GGGGGG"
    ],
    // Chunk 1 - stairs up with coins
    [
        "................",
        "................",
        "................",
        ".............C..",
        "............PPP.",
        "..........C.....",
        "........PPP.....",
        "......C.........",
        "....PPP.........",
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG"
    ],
    // Chunk 2 - platforms with spikes
    [
        "................",
        "................",
        "........C.......",
        "......PPP.......",
        "................",
        "..PPP......PPP..",
        "..C..........C..",
        "................",
        "........XX......",
        "GGG..GGGGGG..GGG",
        "GGG..GGGGGG..GGG",
        "GGG..GGGGGG..GGG"
    ],
    // Chunk 3 - low ceiling challenge
    [
        "................",
        "................",
        "................",
        ".....C....C.....",
        "PPPPPP....PPPPPP",
        "................",
        "................",
        "........S.......",
        "................",
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG"
    ],
    // Chunk 4 - pit jumps with coins
    [
        "................",
        "................",
        "................",
        "................",
        "....C.....C.....",
        "................",
        ".....PP...PP....",
        "................",
        "................",
        "GGG...GGG...GGGG",
        "GGG...GGG...GGGG",
        "GGG...GGG...GGGG"
    ],
    // Chunk 5 - spike gauntlet
    [
        "................",
        "................",
        "................",
        ".........C......",
        "........PPP.....",
        "................",
        "....C...........",
        "...PPP..........",
        "......X...X...X.",
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG"
    ],
    // Chunk 6 - coin trail
    [
        "................",
        "................",
        "................",
        "................",
        "................",
        "...CCCCCCCCC....",
        "................",
        "................",
        "................",
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG"
    ],
    // Chunk 7 - vertical challenge
    [
        "................",
        "................",
        ".............C..",
        "............PPP.",
        "..........C.....",
        ".........PP.....",
        ".......C........",
        "......PP........",
        "....X.....X.....",
        "GGGG......GGGGGG",
        "GGGG......GGGGGG",
        "GGGG......GGGGGG"
    ]
];

// World objects
let worldTiles = [];
let worldCoins = [];
let worldSpikes = [];
let worldShields = [];
let scrollOffset = 0;
let nextChunkX = 0;
let chunksGenerated = 0;

// Particle systems
let jumpParticles = [];
let landParticles = [];
let coinParticles = [];
let trailParticles = [];
let deathParticles = [];

// ASCII Art Background Elements
const ASCII_CITY = [
    "    |   |   _|_  |  _|_      |      ",
    "   _|_  |  |###| | |###|    _|_     ",
    "  |###| |__|   |_| |   |___|###|    ",
    " _|   |_|  |   | | |   |   |   |_   ",
    "|  []  [] ||   |   |   |   |  [] |  ",
    "|  []  [] ||[] |[] | []|[] | []  |  ",
    "|  []  [] ||[] |[] | []|[] | []  |  ",
    "|_[]__[]_||[]_|[]_|_[]|[]_|_[]__|  "
];

const ASCII_MOUNTAINS = [
    "                    /\\                      /\\      ",
    "        /\\         /##\\        /\\          /##\\     ",
    "       /##\\       /####\\      /##\\        /####\\    ",
    "      /####\\     /      \\    /####\\      /      \\   ",
    "     /      \\   /        \\  /      \\    /        \\  ",
    "    /        \\ /          \\/        \\  /          \\ ",
    "___/          V            \\          \\/            \\"
];

const ASCII_STARS = [
    " *    .  *       .    *      .   *    .     *   ",
    "   .       *  .    *    .  *      .    *   .    ",
    "  *   .  .      *     .      *  .    .    *     ",
    "    .    *   .     *    .  *     .  *   .    *  "
];

// Neon signs ASCII art
const NEON_SIGNS = [
    { text: "RUN!", color: COLORS.neonPink, x: 0, speed: 0.25 },
    { text: "JUMP!", color: COLORS.neonCyan, x: 300, speed: 0.25 },
    { text: ">>>", color: COLORS.neonGreen, x: 600, speed: 0.25 },
    { text: "2077", color: COLORS.neonOrange, x: 150, speed: 0.25 },
    { text: "CYBER", color: COLORS.neonBlue, x: 450, speed: 0.25 }
];

// Background layers
const background = {
    stars: [],
    cityBlocks: [],
    mountains: [],
    gridLines: [],
    neonSigns: []
};

// Character size for ASCII rendering
const CHAR_WIDTH = 8;
const CHAR_HEIGHT = 12;

function initBackground() {
    // Generate star positions
    for (let i = 0; i < 60; i++) {
        background.stars.push({
            x: Math.random() * BASE_WIDTH * 3,
            y: Math.random() * 120,
            char: Math.random() > 0.7 ? '*' : (Math.random() > 0.5 ? '.' : '+'),
            color: [COLORS.neonCyan, COLORS.neonPink, COLORS.neonGreen, COLORS.textPrimary][Math.floor(Math.random() * 4)],
            twinkle: Math.random() * Math.PI * 2,
            twinkleSpeed: 1 + Math.random() * 2
        });
    }

    // Generate city blocks
    let cityX = 0;
    while (cityX < BASE_WIDTH * 3) {
        background.cityBlocks.push({
            x: cityX,
            height: 60 + Math.random() * 100,
            width: 35 + Math.random() * 50,
            windows: Math.floor(Math.random() * 4) + 2,
            hasAntenna: Math.random() > 0.6,
            hasSign: Math.random() > 0.7,
            signText: ['BAR', 'CLUB', '24/7', 'OPEN', 'NET', 'DATA'][Math.floor(Math.random() * 6)]
        });
        cityX += 40 + Math.random() * 60;
    }

    // Generate mountain segments
    let mtnX = 0;
    while (mtnX < BASE_WIDTH * 3) {
        background.mountains.push({
            x: mtnX,
            height: 30 + Math.random() * 50,
            width: 80 + Math.random() * 120
        });
        mtnX += 60 + Math.random() * 100;
    }

    // Generate grid line positions
    for (let i = 0; i < 15; i++) {
        background.gridLines.push({
            y: 300 + i * 7,
            speed: 0.6 - (i * 0.03)
        });
    }

    // Initialize neon signs
    for (const sign of NEON_SIGNS) {
        background.neonSigns.push({...sign});
    }
}

function drawASCIIText(text, x, y, color, alpha = 1, size = CHAR_HEIGHT) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.fillText(text, x, y);
    ctx.restore();
}

function drawGlowingText(text, x, y, color, alpha = 1, size = CHAR_HEIGHT) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha;
    ctx.fillText(text, x, y);
    ctx.restore();
}

function drawBackground() {
    // Apply screen shake
    ctx.save();
    if (screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake;
        const shakeY = (Math.random() - 0.5) * screenShake;
        ctx.translate(shakeX, shakeY);
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }

    // Dark gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    gradient.addColorStop(0, COLORS.bgDarkest);
    gradient.addColorStop(0.3, COLORS.bgDark);
    gradient.addColorStop(0.6, COLORS.bgMid);
    gradient.addColorStop(1, COLORS.bgLight);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // Draw ASCII stars
    drawASCIIStars();

    // Draw ASCII art layers
    drawASCIIMountains();
    drawNeonSigns();
    drawASCIICity();
    drawASCIIGrid();
    drawDataStream();

    // Glitch effect
    if (glitchEffect > 0) {
        drawGlitchEffect();
        glitchEffect -= 0.1;
        if (glitchEffect < 0) glitchEffect = 0;
    }

    ctx.restore();
}

function drawASCIIStars() {
    const time = Date.now() * 0.001;

    for (const star of background.stars) {
        let screenX = (star.x - scrollOffset * 0.05) % (BASE_WIDTH * 3);
        if (screenX < 0) screenX += BASE_WIDTH * 3;

        if (screenX < BASE_WIDTH + 20) {
            const twinkle = 0.3 + 0.7 * Math.sin(star.twinkle + time * star.twinkleSpeed);
            drawASCIIText(star.char, screenX, star.y, star.color, twinkle);
        }
    }

    // Draw ASCII star pattern overlay
    const starPatternY = 25;
    for (let i = 0; i < ASCII_STARS.length; i++) {
        const pattern = ASCII_STARS[i];
        let offsetX = (-scrollOffset * 0.03) % (pattern.length * CHAR_WIDTH);

        for (let repeat = 0; repeat < 3; repeat++) {
            const x = offsetX + repeat * pattern.length * CHAR_WIDTH;
            if (x < BASE_WIDTH + 100 && x > -pattern.length * CHAR_WIDTH) {
                const alpha = 0.2 + 0.15 * Math.sin(time + i);
                drawASCIIText(pattern, x, starPatternY + i * CHAR_HEIGHT, COLORS.textMuted, alpha);
            }
        }
    }
}

function drawASCIIMountains() {
    const parallax = 0.12;

    // Draw ASCII mountain pattern
    for (let i = 0; i < ASCII_MOUNTAINS.length; i++) {
        const pattern = ASCII_MOUNTAINS[i];
        let offsetX = (-scrollOffset * parallax) % (pattern.length * CHAR_WIDTH);

        for (let repeat = 0; repeat < 4; repeat++) {
            const x = offsetX + repeat * pattern.length * CHAR_WIDTH;
            if (x < BASE_WIDTH + 100 && x > -pattern.length * CHAR_WIDTH) {
                const y = 130 + i * 10;
                const colorIndex = i / ASCII_MOUNTAINS.length;
                const color = colorIndex < 0.3 ? COLORS.neonCyan : (colorIndex < 0.6 ? COLORS.bgLight : COLORS.textMuted);
                drawASCIIText(pattern, x, y, color, 0.3 + colorIndex * 0.3);
            }
        }
    }
}

function drawNeonSigns() {
    const time = Date.now() * 0.001;
    const parallax = 0.2;

    for (const sign of background.neonSigns) {
        let screenX = (sign.x - scrollOffset * parallax) % (BASE_WIDTH * 2);
        if (screenX < 0) screenX += BASE_WIDTH * 2;

        if (screenX < BASE_WIDTH + 50) {
            // Flickering effect
            const flicker = Math.sin(time * 10 + sign.x) > -0.8 ? 1 : 0.3;
            const pulse = 0.7 + 0.3 * Math.sin(time * 3 + sign.x * 0.1);

            // Draw glowing neon sign
            drawGlowingText(sign.text, screenX, 100 + Math.sin(time + sign.x) * 5, sign.color, flicker * pulse, 16);

            // Draw bracket decorations
            drawGlowingText('[', screenX - 12, 100 + Math.sin(time + sign.x) * 5, sign.color, flicker * pulse * 0.5, 16);
            drawGlowingText(']', screenX + sign.text.length * 10, 100 + Math.sin(time + sign.x) * 5, sign.color, flicker * pulse * 0.5, 16);
        }
    }
}

function drawASCIICity() {
    const parallax = 0.3;
    const time = Date.now() * 0.001;

    // Draw ASCII city pattern
    for (let i = 0; i < ASCII_CITY.length; i++) {
        const pattern = ASCII_CITY[i];
        let offsetX = (-scrollOffset * parallax) % (pattern.length * CHAR_WIDTH);

        for (let repeat = 0; repeat < 4; repeat++) {
            const x = offsetX + repeat * pattern.length * CHAR_WIDTH;
            if (x < BASE_WIDTH + 100 && x > -pattern.length * CHAR_WIDTH) {
                const y = 190 + i * 10;
                const color = i < 2 ? COLORS.neonCyan : COLORS.accentPrimary;
                drawASCIIText(pattern, x, y, color, 0.5);
            }
        }
    }

    // Draw procedural city blocks
    for (const block of background.cityBlocks) {
        const screenX = (block.x - scrollOffset * 0.35) % (BASE_WIDTH * 3);
        const wrappedX = screenX < -block.width ? screenX + BASE_WIDTH * 3 : screenX;

        if (wrappedX > -block.width && wrappedX < BASE_WIDTH + block.width) {
            drawASCIICityBlock(wrappedX, 270 - block.height, block.width, block.height, block);
        }
    }
}

function drawASCIICityBlock(x, y, width, height, block) {
    const cols = Math.floor(width / CHAR_WIDTH);
    const rows = Math.floor(height / CHAR_HEIGHT);
    const time = Date.now() * 0.001;

    // Draw antenna if present
    if (block.hasAntenna) {
        const antennaX = x + width / 2;
        drawASCIIText('|', antennaX, y - 15, COLORS.neonCyan, 0.8);
        drawASCIIText('*', antennaX - 2, y - 20, COLORS.neonPink, 0.5 + 0.5 * Math.sin(time * 5));
    }

    // Draw building sign if present
    if (block.hasSign && rows > 3) {
        const signY = y + CHAR_HEIGHT;
        const flicker = Math.sin(time * 8 + x) > -0.7 ? 1 : 0.2;
        drawGlowingText(block.signText, x + 4, signY, COLORS.neonPink, 0.7 * flicker, 10);
    }

    for (let row = 0; row < rows; row++) {
        let line = '';
        for (let col = 0; col < cols; col++) {
            if (col === 0 || col === cols - 1) {
                line += '|';
            } else if (row === 0) {
                line += '_';
            } else if (row === rows - 1) {
                line += '_';
            } else {
                const isWindowCol = col % 3 === 1;
                const isWindowRow = row % 2 === 1;
                if (isWindowCol && isWindowRow) {
                    const flicker = Math.sin(time * 3 + col * 2 + row * 5 + x * 0.1) > 0.2;
                    line += flicker ? '#' : '.';
                } else {
                    line += ' ';
                }
            }
        }

        const color = row === 0 ? COLORS.neonCyan : COLORS.accentPrimary;
        drawASCIIText(line, x, y + row * CHAR_HEIGHT, color, 0.6);
    }
}

function drawASCIIGrid() {
    const time = Date.now() * 0.001;

    for (let i = 0; i < background.gridLines.length; i++) {
        const line = background.gridLines[i];
        const y = line.y;
        const speed = line.speed;

        let gridLine = '';
        for (let x = 0; x < BASE_WIDTH / CHAR_WIDTH + 5; x++) {
            const offset = Math.floor(scrollOffset * speed / CHAR_WIDTH);
            if ((x + offset) % 10 === 0) {
                gridLine += '+';
            } else {
                gridLine += '-';
            }
        }

        const alpha = 0.1 + (i / background.gridLines.length) * 0.2;
        const offsetX = -(scrollOffset * speed) % CHAR_WIDTH;

        // Color shift based on position
        const hueShift = Math.sin(time + i * 0.3) > 0 ? COLORS.neonCyan : COLORS.neonPink;
        drawASCIIText(gridLine, offsetX, y, hueShift, alpha);
    }

    // Vertical grid lines with perspective
    const verticalSpacing = 80;
    for (let vx = 0; vx < BASE_WIDTH + verticalSpacing; vx += verticalSpacing) {
        const screenX = vx - (scrollOffset * 0.6) % verticalSpacing;

        for (let vy = 300; vy < BASE_HEIGHT; vy += 6) {
            const alpha = 0.05 + ((vy - 300) / (BASE_HEIGHT - 300)) * 0.2;
            drawASCIIText('|', screenX, vy, COLORS.neonPink, alpha);
        }
    }
}

function drawDataStream() {
    const time = Date.now() * 0.001;
    const chars = '01';

    for (let stream = 0; stream < 4; stream++) {
        const baseX = stream * 250 + 100;
        const screenX = baseX - (scrollOffset * 0.08) % 80;

        for (let i = 0; i < 8; i++) {
            const y = 40 + i * 12 + Math.sin(time * 2 + stream) * 3;
            const char = chars[Math.floor((time * 15 + i + stream * 3) % 2)];
            const alpha = 0.08 + Math.sin(time * 4 + i * 0.5) * 0.05;

            if (screenX > 0 && screenX < BASE_WIDTH) {
                drawASCIIText(char, screenX, y, COLORS.neonGreen, alpha);
            }
        }
    }
}

function drawGlitchEffect() {
    const intensity = glitchEffect;

    // Random horizontal slices
    for (let i = 0; i < 5; i++) {
        const y = Math.random() * BASE_HEIGHT;
        const height = 2 + Math.random() * 8;
        const offset = (Math.random() - 0.5) * 20 * intensity;

        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = Math.random() > 0.5 ? COLORS.neonCyan : COLORS.neonPink;
        ctx.fillRect(offset, y, BASE_WIDTH, height);
        ctx.restore();
    }

    // Scanline effect
    ctx.fillStyle = `rgba(0, 255, 255, ${0.1 * intensity})`;
    for (let y = 0; y < BASE_HEIGHT; y += 4) {
        ctx.fillRect(0, y, BASE_WIDTH, 1);
    }
}

// Particle systems
function createJumpParticles() {
    for (let i = 0; i < 8; i++) {
        jumpParticles.push({
            x: player.x + player.width / 2,
            y: player.y + player.height,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 2 + 1,
            life: 1,
            char: ['*', '.', '+', '^'][Math.floor(Math.random() * 4)],
            color: COLORS.neonCyan
        });
    }
}

function createLandParticles() {
    for (let i = 0; i < 6; i++) {
        landParticles.push({
            x: player.x + player.width / 2,
            y: player.y + player.height,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 3,
            life: 1,
            char: ['~', '-', '_'][Math.floor(Math.random() * 3)],
            color: COLORS.groundTop
        });
    }
}

function createCoinParticles(x, y) {
    for (let i = 0; i < 10; i++) {
        coinParticles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1,
            char: ['$', '*', '+', '@'][Math.floor(Math.random() * 4)],
            color: COLORS.coin
        });
    }
}

function createDeathParticles() {
    for (let i = 0; i < 20; i++) {
        deathParticles.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 1,
            char: ['#', '@', '*', 'X', '!'][Math.floor(Math.random() * 5)],
            color: [COLORS.accentPrimary, COLORS.neonPink, COLORS.neonCyan][Math.floor(Math.random() * 3)]
        });
    }
}

function updateParticles() {
    // Update player trail
    if (gameState === 'playing') {
        player.trail.push({
            x: player.x,
            y: player.y,
            alpha: 0.6
        });
        if (player.trail.length > 8) {
            player.trail.shift();
        }
    }

    // Update trail alpha
    for (const t of player.trail) {
        t.alpha *= 0.85;
    }

    // Update jump particles
    for (let i = jumpParticles.length - 1; i >= 0; i--) {
        const p = jumpParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= 0.05;
        if (p.life <= 0) jumpParticles.splice(i, 1);
    }

    // Update land particles
    for (let i = landParticles.length - 1; i >= 0; i--) {
        const p = landParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.06;
        if (p.life <= 0) landParticles.splice(i, 1);
    }

    // Update coin particles
    for (let i = coinParticles.length - 1; i >= 0; i--) {
        const p = coinParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= 0.04;
        if (p.life <= 0) coinParticles.splice(i, 1);
    }

    // Update death particles
    for (let i = deathParticles.length - 1; i >= 0; i--) {
        const p = deathParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 0.02;
        if (p.life <= 0) deathParticles.splice(i, 1);
    }

    // Update combo timer
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer <= 0) {
            combo = 0;
        }
    }

    // Update shield timer
    if (player.shieldTimer > 0) {
        player.shieldTimer--;
        if (player.shieldTimer <= 0) {
            player.hasShield = false;
        }
    }
}

function drawParticles() {
    // Draw player trail
    for (let i = 0; i < player.trail.length; i++) {
        const t = player.trail[i];
        ctx.fillStyle = COLORS.accentPrimary;
        ctx.globalAlpha = t.alpha * 0.5;
        ctx.fillRect(t.x, t.y, player.width, player.height);
    }
    ctx.globalAlpha = 1;

    // Draw all particle types
    for (const p of jumpParticles) {
        drawASCIIText(p.char, p.x, p.y, p.color, p.life);
    }
    for (const p of landParticles) {
        drawASCIIText(p.char, p.x, p.y, p.color, p.life);
    }
    for (const p of coinParticles) {
        drawGlowingText(p.char, p.x, p.y, p.color, p.life);
    }
    for (const p of deathParticles) {
        drawGlowingText(p.char, p.x, p.y, p.color, p.life, 16);
    }
}

// Floating text for score popups
let floatingTexts = [];

function createFloatingText(x, y, text, color) {
    floatingTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        life: 1,
        vy: -2
    });
}

function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.life -= 0.03;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
}

function drawFloatingTexts() {
    for (const ft of floatingTexts) {
        drawGlowingText(ft.text, ft.x, ft.y, ft.color, ft.life, 14);
    }
}

// Canvas resize
function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
}

function getViewportSize() {
    if (window.visualViewport) {
        return {
            width: window.visualViewport.width,
            height: window.visualViewport.height
        };
    }
    return {
        width: window.innerWidth,
        height: window.innerHeight
    };
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    const viewport = getViewportSize();
    const isLandscape = viewport.width > viewport.height;
    const isMobileLandscape = isMobile && isLandscape;
    const inFullscreen = isFullscreen();

    let maxWidth, maxHeight;

    if (inFullscreen) {
        maxWidth = viewport.width;
        maxHeight = viewport.height;
    } else if (isMobileLandscape) {
        maxWidth = viewport.width;
        maxHeight = viewport.height;
    } else if (isMobile) {
        maxWidth = viewport.width - 10;
        maxHeight = viewport.height - 100;
    } else {
        maxWidth = viewport.width - 40;
        maxHeight = viewport.height - 60;
    }

    const scaleX = maxWidth / BASE_WIDTH;
    const scaleY = maxHeight / BASE_HEIGHT;

    if (inFullscreen || isMobileLandscape) {
        scale = Math.min(scaleX, scaleY);
    } else {
        scale = Math.min(scaleX, scaleY, 2);
    }

    if (scale < 0.4) scale = 0.4;

    CANVAS_WIDTH = Math.floor(BASE_WIDTH * scale);
    CANVAS_HEIGHT = Math.floor(BASE_HEIGHT * scale);

    canvas.width = BASE_WIDTH;
    canvas.height = BASE_HEIGHT;
    canvas.style.width = CANVAS_WIDTH + 'px';
    canvas.style.height = CANVAS_HEIGHT + 'px';

    container.style.width = CANVAS_WIDTH + 'px';

    ctx.imageSmoothingEnabled = false;
}

// Initialize
function init() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');

    resizeCanvas();
    ctx.imageSmoothingEnabled = false;

    generateInitialWorld();
    initBackground();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('click', handleClick);

    window.addEventListener('resize', debounce(handleResize, 100));
    window.addEventListener('orientationchange', () => {
        setTimeout(handleResize, 100);
    });

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', debounce(handleResize, 100));
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    const jumpBtn = document.getElementById('jump-btn');
    if (jumpBtn) {
        jumpBtn.addEventListener('touchstart', handleJumpBtnStart, { passive: false });
        jumpBtn.addEventListener('touchend', handleJumpBtnEnd, { passive: false });
        jumpBtn.addEventListener('mousedown', handleJumpBtnStart);
        jumpBtn.addEventListener('mouseup', handleJumpBtnEnd);
        jumpBtn.addEventListener('mouseleave', handleJumpBtnEnd);
    }

    handleResize();
    requestAnimationFrame(gameLoop);
}

function handleResize() {
    resizeCanvas();
    updateMobileControls();
    checkOrientation();
}

function checkOrientation() {
    const orientationOverlay = document.getElementById('orientation-overlay');
    if (orientationOverlay && isMobile) {
        const isPortrait = window.innerHeight > window.innerWidth * 1.2;
        orientationOverlay.style.display = isPortrait ? 'flex' : 'none';
    }
}

function handleJumpBtnStart(e) {
    e.preventDefault();
    e.stopPropagation();
    touchActive = true;
    player.jumpKeyHeld = true;

    const jumpBtn = document.getElementById('jump-btn');
    if (jumpBtn) jumpBtn.classList.add('active');

    const container = document.getElementById('game-container');
    if (container) container.classList.add('touch-active');

    handleInput();
}

function handleJumpBtnEnd(e) {
    e.preventDefault();
    e.stopPropagation();
    touchActive = false;
    player.jumpKeyHeld = false;

    const jumpBtn = document.getElementById('jump-btn');
    if (jumpBtn) jumpBtn.classList.remove('active');

    const container = document.getElementById('game-container');
    if (container) container.classList.remove('touch-active');

    if (player.isJumping && player.velY < 0) {
        player.velY *= JUMP_CUT_MULTIPLIER;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateMobileControls() {
    const mobileControls = document.getElementById('mobile-controls');
    const isLandscape = window.innerWidth > window.innerHeight;

    if (mobileControls) {
        mobileControls.style.display = (isMobile && !isLandscape) ? 'flex' : 'none';
    }
}

function generateInitialWorld() {
    worldTiles = [];
    worldCoins = [];
    worldSpikes = [];
    worldShields = [];
    nextChunkX = 0;
    chunksGenerated = 0;

    while (nextChunkX < BASE_WIDTH + TILE_SIZE * 16) {
        generateNextChunk();
    }
}

function generateNextChunk() {
    let chunk;
    let chunkWidth;

    if (chunksGenerated === 0) {
        chunk = startingChunk;
        chunkWidth = 48;
    } else {
        const chunkIndex = Math.floor(Math.random() * mapChunks.length);
        chunk = mapChunks[chunkIndex];
        chunkWidth = 16;
    }

    for (let row = 0; row < chunk.length; row++) {
        for (let col = 0; col < chunk[row].length; col++) {
            const char = chunk[row][col];
            const x = nextChunkX + col * TILE_SIZE;
            const y = row * TILE_SIZE;

            if (char === 'G' || char === 'P') {
                worldTiles.push({
                    x: x,
                    y: y,
                    type: char === 'G' ? 'ground' : 'platform'
                });
            } else if (char === 'C') {
                worldCoins.push({
                    x: x + TILE_SIZE / 2,
                    y: y + TILE_SIZE / 2,
                    collected: false,
                    bobOffset: Math.random() * Math.PI * 2
                });
            } else if (char === 'X') {
                worldSpikes.push({
                    x: x,
                    y: y
                });
            } else if (char === 'S') {
                worldShields.push({
                    x: x + TILE_SIZE / 2,
                    y: y + TILE_SIZE / 2,
                    collected: false,
                    bobOffset: Math.random() * Math.PI * 2
                });
            }
        }
    }

    nextChunkX += chunkWidth * TILE_SIZE;
    chunksGenerated++;
}

function handleKeyDown(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        player.jumpKeyHeld = true;

        if (gameState === 'start') {
            startGame();
        } else if (gameState === 'gameover') {
            restartGame();
        } else if (gameState === 'playing') {
            jump();
        }
    }
}

function handleKeyUp(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        player.jumpKeyHeld = false;

        if (player.isJumping && player.velY < 0) {
            player.velY *= JUMP_CUT_MULTIPLIER;
        }
    }
}

function handleTouchStart(e) {
    if (e.target.id === 'jump-btn') return;

    e.preventDefault();
    touchActive = true;
    player.jumpKeyHeld = true;

    const jumpBtn = document.getElementById('jump-btn');
    if (jumpBtn) jumpBtn.classList.add('active');

    const container = document.getElementById('game-container');
    if (container) container.classList.add('touch-active');

    handleInput();
}

function handleTouchEnd(e) {
    if (e.target.id === 'jump-btn') return;

    e.preventDefault();
    touchActive = false;
    player.jumpKeyHeld = false;

    const jumpBtn = document.getElementById('jump-btn');
    if (jumpBtn) jumpBtn.classList.remove('active');

    const container = document.getElementById('game-container');
    if (container) container.classList.remove('touch-active');

    if (player.isJumping && player.velY < 0) {
        player.velY *= JUMP_CUT_MULTIPLIER;
    }
}

function handleClick(e) {
    player.jumpKeyHeld = true;
    handleInput();
    setTimeout(() => { player.jumpKeyHeld = false; }, 150);
}

function handleInput() {
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'gameover') {
        restartGame();
    } else if (gameState === 'playing') {
        jump();
    }
}

function requestFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

function handleFullscreenChange() {
    setTimeout(() => {
        handleResize();
    }, 100);
}

function startGame() {
    gameState = 'playing';
    document.getElementById('start-screen').classList.add('hidden');

    if (isMobile) {
        requestFullscreen();
    }
}

function restartGame() {
    gameState = 'playing';
    score = 0;
    distance = 0;
    coins = 0;
    combo = 0;
    comboTimer = 0;
    scrollOffset = 0;
    currentSpeed = START_SPEED;
    player.x = 150;
    player.y = 200;
    player.velY = 0;
    player.onGround = false;
    player.isJumping = false;
    player.jumpKeyHeld = false;
    player.canDoubleJump = true;
    player.hasShield = false;
    player.shieldTimer = 0;
    player.trail = [];

    // Clear particles
    jumpParticles = [];
    landParticles = [];
    coinParticles = [];
    deathParticles = [];
    floatingTexts = [];

    generateInitialWorld();

    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('score-value').textContent = '0';
}

let wasOnGround = false;

function jump() {
    if (player.onGround && !player.isJumping) {
        player.velY = JUMP_FORCE;
        player.onGround = false;
        player.isJumping = true;
        player.canDoubleJump = true;
        createJumpParticles();
    } else if (!player.onGround && player.canDoubleJump) {
        // Double jump!
        player.velY = JUMP_FORCE * 0.85;
        player.canDoubleJump = false;
        createJumpParticles();
        glitchEffect = 0.3;
    }
}

function update() {
    if (gameState !== 'playing') return;

    wasOnGround = player.onGround;

    player.velY += GRAVITY;
    if (player.velY > 15) player.velY = 15;
    player.y += player.velY;

    if (currentSpeed < MAX_SPEED) {
        currentSpeed += SPEED_INCREMENT;
    }

    scrollOffset += currentSpeed;
    distance += currentSpeed;

    score = Math.floor(distance / 10) + coins * 10;
    document.getElementById('score-value').textContent = score;

    player.onGround = false;

    // Collision with tiles
    for (let i = worldTiles.length - 1; i >= 0; i--) {
        const tile = worldTiles[i];
        const tileScreenX = tile.x - scrollOffset;

        if (tileScreenX < -TILE_SIZE * 2) {
            worldTiles.splice(i, 1);
            continue;
        }

        if (checkCollision(player, {
            x: tileScreenX,
            y: tile.y,
            width: TILE_SIZE,
            height: TILE_SIZE
        })) {
            if (player.velY > 0 && player.y + player.height - player.velY <= tile.y + 5) {
                player.y = tile.y - player.height;
                player.velY = 0;
                player.onGround = true;
                player.isJumping = false;
                player.canDoubleJump = true;

                // Landing particles
                if (!wasOnGround) {
                    createLandParticles();
                }
            }
            else if (player.velY < 0 && player.y - player.velY >= tile.y + TILE_SIZE - 5) {
                player.y = tile.y + TILE_SIZE;
                player.velY = 0;
            }
            else if (player.velY >= 0 && player.y + player.height > tile.y + 8) {
                triggerDeath();
                return;
            }
        }
    }

    // Collect coins
    for (let i = worldCoins.length - 1; i >= 0; i--) {
        const coin = worldCoins[i];
        const coinScreenX = coin.x - scrollOffset;

        if (coinScreenX < -TILE_SIZE * 2) {
            worldCoins.splice(i, 1);
            continue;
        }

        if (!coin.collected && checkCollision(player, {
            x: coinScreenX - 12,
            y: coin.y - 12,
            width: 24,
            height: 24
        })) {
            coin.collected = true;
            coins++;
            combo++;
            comboTimer = 60;

            const comboBonus = combo > 1 ? combo : 1;
            createCoinParticles(coinScreenX, coin.y);
            createFloatingText(coinScreenX, coin.y - 20, `+${10 * comboBonus}`, COLORS.coin);

            if (combo > 1) {
                createFloatingText(coinScreenX + 30, coin.y - 10, `x${combo}`, COLORS.neonPink);
            }

            glitchEffect = 0.2;
        }
    }

    // Collect shields
    for (let i = worldShields.length - 1; i >= 0; i--) {
        const shield = worldShields[i];
        const shieldScreenX = shield.x - scrollOffset;

        if (shieldScreenX < -TILE_SIZE * 2) {
            worldShields.splice(i, 1);
            continue;
        }

        if (!shield.collected && checkCollision(player, {
            x: shieldScreenX - 12,
            y: shield.y - 12,
            width: 24,
            height: 24
        })) {
            shield.collected = true;
            player.hasShield = true;
            player.shieldTimer = 300; // 5 seconds at 60fps
            createFloatingText(shieldScreenX, shield.y - 20, 'SHIELD!', COLORS.shield);
            glitchEffect = 0.4;
        }
    }

    // Check spike collisions
    for (let i = worldSpikes.length - 1; i >= 0; i--) {
        const spike = worldSpikes[i];
        const spikeScreenX = spike.x - scrollOffset;

        if (spikeScreenX < -TILE_SIZE * 2) {
            worldSpikes.splice(i, 1);
            continue;
        }

        if (checkCollision(player, {
            x: spikeScreenX + 4,
            y: spike.y + 8,
            width: TILE_SIZE - 8,
            height: TILE_SIZE - 8
        })) {
            if (player.hasShield) {
                player.hasShield = false;
                player.shieldTimer = 0;
                screenShake = 8;
                glitchEffect = 0.5;
                createFloatingText(player.x, player.y - 20, 'BLOCKED!', COLORS.shield);
            } else {
                triggerDeath();
                return;
            }
        }
    }

    // Generate new chunks as needed
    while (nextChunkX - scrollOffset < BASE_WIDTH + TILE_SIZE * 16) {
        generateNextChunk();
    }

    // Check if player fell off the screen
    if (player.y > BASE_HEIGHT) {
        triggerDeath();
    }

    // Keep player from going too far left
    if (player.x < 50) {
        triggerDeath();
    }

    updateParticles();
    updateFloatingTexts();
}

function triggerDeath() {
    screenShake = 15;
    glitchEffect = 1;
    createDeathParticles();

    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('asciiRunnerHighScore', highScore);
    }

    gameOver();
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function gameOver() {
    gameState = 'gameover';
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over').classList.remove('hidden');
}

function draw() {
    // Draw ASCII art background
    drawBackground();

    // Draw particles
    drawParticles();

    const time = Date.now() * 0.001;

    // Draw coins
    for (const coin of worldCoins) {
        if (coin.collected) continue;
        const screenX = coin.x - scrollOffset;
        if (screenX < -TILE_SIZE || screenX > BASE_WIDTH + TILE_SIZE) continue;

        const bob = Math.sin(time * 4 + coin.bobOffset) * 3;
        const rotation = time * 2 + coin.bobOffset;

        // Glow effect
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time * 5);
        ctx.fillStyle = COLORS.coinGlow;
        ctx.beginPath();
        ctx.arc(screenX, coin.y + bob, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Coin character
        const coinChar = Math.sin(rotation) > 0 ? '$' : '@';
        drawGlowingText(coinChar, screenX - 6, coin.y + bob + 5, COLORS.coin, 1, 16);
    }

    // Draw shields
    for (const shield of worldShields) {
        if (shield.collected) continue;
        const screenX = shield.x - scrollOffset;
        if (screenX < -TILE_SIZE || screenX > BASE_WIDTH + TILE_SIZE) continue;

        const bob = Math.sin(time * 3 + shield.bobOffset) * 4;

        // Glow effect
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.2 * Math.sin(time * 4);
        ctx.fillStyle = COLORS.shieldGlow;
        ctx.beginPath();
        ctx.arc(screenX, shield.y + bob, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Shield character
        drawGlowingText('O', screenX - 6, shield.y + bob + 5, COLORS.shield, 1, 18);
    }

    // Draw spikes
    for (const spike of worldSpikes) {
        const screenX = spike.x - scrollOffset;
        if (screenX < -TILE_SIZE || screenX > BASE_WIDTH + TILE_SIZE) continue;

        // Spike glow
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.1 * Math.sin(time * 6);
        ctx.fillStyle = COLORS.spikeGlow;
        ctx.fillRect(screenX + 4, spike.y + 12, TILE_SIZE - 8, TILE_SIZE - 12);
        ctx.restore();

        // ASCII spikes
        drawGlowingText('/\\', screenX + 4, spike.y + 24, COLORS.spike, 0.9, 14);
        drawGlowingText('||', screenX + 8, spike.y + 32, COLORS.spike, 0.7, 10);
    }

    // Draw tiles with ASCII style
    for (const tile of worldTiles) {
        const screenX = tile.x - scrollOffset;

        if (screenX < -TILE_SIZE || screenX > BASE_WIDTH) continue;

        if (tile.type === 'ground') {
            ctx.fillStyle = COLORS.ground;
            ctx.fillRect(screenX, tile.y, TILE_SIZE, TILE_SIZE);

            ctx.fillStyle = COLORS.groundTop;
            ctx.fillRect(screenX, tile.y, TILE_SIZE, 6);

            ctx.fillStyle = COLORS.groundDark;
            ctx.fillRect(screenX, tile.y + TILE_SIZE - 4, TILE_SIZE, 4);

            drawASCIIText('[]', screenX + 8, tile.y + 20, COLORS.textMuted, 0.3);
        } else if (tile.type === 'platform') {
            ctx.fillStyle = COLORS.platform;
            ctx.fillRect(screenX, tile.y, TILE_SIZE, TILE_SIZE);

            ctx.fillStyle = COLORS.platformTop;
            ctx.fillRect(screenX, tile.y, TILE_SIZE, 6);

            drawASCIIText('==', screenX + 8, tile.y + 20, COLORS.neonCyan, 0.4);
        }
    }

    // Draw player
    const px = player.x;
    const py = player.y;
    const pw = player.width;
    const ph = player.height;

    // Shield effect
    if (player.hasShield) {
        ctx.save();
        const shieldPulse = 0.3 + 0.2 * Math.sin(time * 8);
        ctx.globalAlpha = shieldPulse;
        ctx.strokeStyle = COLORS.shield;
        ctx.lineWidth = 3;
        ctx.strokeRect(px - 4, py - 4, pw + 8, ph + 8);
        ctx.globalAlpha = shieldPulse * 0.5;
        ctx.fillStyle = COLORS.shieldGlow;
        ctx.fillRect(px - 4, py - 4, pw + 8, ph + 8);
        ctx.restore();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(px + 4, py + ph + 2, pw, 4);

    // Main body
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(px, py, pw, ph);

    // Outline
    ctx.strokeStyle = COLORS.playerOutline;
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);

    // Eyes - look in direction of movement
    ctx.fillStyle = COLORS.textPrimary;
    ctx.fillRect(px + pw - 12, py + 8, 6, 6);
    ctx.fillRect(px + pw - 20, py + 8, 6, 6);

    // Pupils
    ctx.fillStyle = COLORS.bgDarkest;
    const pupilOffset = player.velY < -5 ? -1 : (player.velY > 5 ? 1 : 0);
    ctx.fillRect(px + pw - 8, py + 10 + pupilOffset, 3, 3);
    ctx.fillRect(px + pw - 16, py + 10 + pupilOffset, 3, 3);

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(px + 2, py + 2, pw - 4, 4);

    // ASCII decoration on player
    const playerChar = player.isJumping ? '^' : (player.hasShield ? '@' : '#');
    drawASCIIText(playerChar, px + 6, py + ph - 6, COLORS.neonCyan, 0.6);

    // Double jump indicator
    if (!player.canDoubleJump && !player.onGround) {
        drawASCIIText('x', px + pw - 8, py - 8, COLORS.accentPrimary, 0.5);
    }

    // Draw floating texts
    drawFloatingTexts();

    // Draw UI
    drawUI();
}

function drawUI() {
    // Speed meter
    const meterX = BASE_WIDTH - 120;
    const meterY = 16;
    const meterWidth = 100;
    const meterHeight = 16;

    ctx.fillStyle = COLORS.accentPrimary;
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('SPD>', meterX - 8, meterY + 12);

    ctx.fillStyle = COLORS.bgDarkest;
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);

    ctx.strokeStyle = COLORS.accentPrimary;
    ctx.lineWidth = 2;
    ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);

    const speedPercent = (currentSpeed - START_SPEED) / (MAX_SPEED - START_SPEED);
    const fillWidth = Math.max(0, Math.min(1, speedPercent)) * (meterWidth - 4);

    let fillColor;
    if (speedPercent < 0.5) {
        fillColor = COLORS.neonGreen;
    } else if (speedPercent < 0.8) {
        fillColor = COLORS.neonYellow;
    } else {
        fillColor = COLORS.accentPrimary;
    }

    ctx.fillStyle = fillColor;
    ctx.fillRect(meterX + 2, meterY + 2, fillWidth, meterHeight - 4);

    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(currentSpeed.toFixed(1), meterX + meterWidth / 2, meterY + 12);

    // Coins display
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.coin;
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText(`$ ${coins}`, 16, 50);

    // Combo display
    if (combo > 1) {
        const comboAlpha = comboTimer / 60;
        drawGlowingText(`COMBO x${combo}`, 16, 70, COLORS.neonPink, comboAlpha, 12);
    }

    // High score
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText(`HI: ${highScore}`, BASE_WIDTH - 20, BASE_HEIGHT - 10);

    // Double jump available indicator
    if (player.canDoubleJump && !player.onGround && gameState === 'playing') {
        drawASCIIText('[2x JUMP]', BASE_WIDTH / 2 - 35, BASE_HEIGHT - 20, COLORS.neonCyan, 0.6, 10);
    }

    // Shield timer
    if (player.hasShield) {
        const shieldPercent = player.shieldTimer / 300;
        ctx.fillStyle = COLORS.bgDarkest;
        ctx.fillRect(16, 80, 60, 8);
        ctx.fillStyle = COLORS.shield;
        ctx.fillRect(16, 80, 60 * shieldPercent, 8);
        drawASCIIText('SHIELD', 16, 78, COLORS.shield, 0.8, 10);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

window.addEventListener('load', init);
