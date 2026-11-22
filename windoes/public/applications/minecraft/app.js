(function () {
  'use strict';

  /**
   * A face of a unit cube: its outward normal, its four corners and the
   * light factor of its direction.
   * @typedef {object} Face
   * @property {number[]} n
   * @property {number[][]} c
   * @property {number} light
   */

  /**
   * Attribute and uniform locations of the block shader.
   * @typedef {object} MainLocs
   * @property {number} aPos
   * @property {number} aUV
   * @property {number} aLight
   * @property {WebGLUniformLocation | null} uMVP
   * @property {WebGLUniformLocation | null} uCam
   * @property {WebGLUniformLocation | null} uTex
   * @property {WebGLUniformLocation | null} uFogColor
   * @property {WebGLUniformLocation | null} uAlpha
   */

  /**
   * Attribute and uniform locations of the outline shader.
   * @typedef {object} LineLocs
   * @property {number} aPos
   * @property {WebGLUniformLocation | null} uMVP
   * @property {WebGLUniformLocation | null} uOffset
   */

  // ============================================================
  // DOM HELPERS
  // ============================================================
  /**
   * Returns the element with this id. index.html defines every id the game
   * asks for, so a missing element or one of another kind is a markup bug.
   * @template {HTMLElement} T
   * @param {string} id
   * @param {{ new (): T }} type
   * @returns {T}
   */
  function byId(id, type) {
    const el = document.getElementById(id);
    if (!(el instanceof type)) throw new Error(`#${id} is missing or not a ${type.name}`);
    return el;
  }

  /**
   * @template T
   * @param {T | null | undefined} value
   * @param {string} what
   * @returns {T}
   */
  function required(value, what) {
    if (value == null) throw new Error(`${what} is missing`);
    return value;
  }

  // ============================================================
  // CONSTANTS
  // ============================================================
  var SX = 64,
    SY = 48,
    SZ = 64; // world dimensions
  var SEA = 13; // water level
  var DEFAULT_SEED = 1337;

  var AIR = 0,
    GRASS = 1,
    DIRT = 2,
    STONE = 3,
    SAND = 4,
    LOG = 5,
    LEAVES = 6,
    PLANKS = 7,
    COBBLE = 8,
    WATER = 9,
    BEDROCK = 10;

  // Texture atlas tile indices (4x4 grid of 16px tiles in a 64x64 atlas)
  var T_GRASS_TOP = 0,
    T_GRASS_SIDE = 1,
    T_DIRT = 2,
    T_STONE = 3,
    T_SAND = 4,
    T_LOG_SIDE = 5,
    T_LOG_TOP = 6,
    T_LEAVES = 7,
    T_PLANKS = 8,
    T_COBBLE = 9,
    T_WATER = 10,
    T_BEDROCK = 11;

  // Per-block face tiles: [top, side, bottom]
  /** @type {Record<number, number[]>} */
  var BLOCK_TILES = {};
  BLOCK_TILES[GRASS] = [T_GRASS_TOP, T_GRASS_SIDE, T_DIRT];
  BLOCK_TILES[DIRT] = [T_DIRT, T_DIRT, T_DIRT];
  BLOCK_TILES[STONE] = [T_STONE, T_STONE, T_STONE];
  BLOCK_TILES[SAND] = [T_SAND, T_SAND, T_SAND];
  BLOCK_TILES[LOG] = [T_LOG_TOP, T_LOG_SIDE, T_LOG_TOP];
  BLOCK_TILES[LEAVES] = [T_LEAVES, T_LEAVES, T_LEAVES];
  BLOCK_TILES[PLANKS] = [T_PLANKS, T_PLANKS, T_PLANKS];
  BLOCK_TILES[COBBLE] = [T_COBBLE, T_COBBLE, T_COBBLE];
  BLOCK_TILES[WATER] = [T_WATER, T_WATER, T_WATER];
  BLOCK_TILES[BEDROCK] = [T_BEDROCK, T_BEDROCK, T_BEDROCK];

  /** @type {Record<number, string>} */
  var BLOCK_NAMES = {};
  BLOCK_NAMES[GRASS] = 'Grass';
  BLOCK_NAMES[DIRT] = 'Dirt';
  BLOCK_NAMES[STONE] = 'Stone';
  BLOCK_NAMES[SAND] = 'Sand';
  BLOCK_NAMES[LOG] = 'Wood';
  BLOCK_NAMES[LEAVES] = 'Leaves';
  BLOCK_NAMES[PLANKS] = 'Planks';
  BLOCK_NAMES[COBBLE] = 'Cobblestone';

  var HOTBAR_BLOCKS = [GRASS, DIRT, STONE, SAND, LOG, LEAVES, PLANKS, COBBLE];

  var EYE_HEIGHT = 1.62;
  var PLAYER_HALF = 0.3;
  var PLAYER_HEIGHT = 1.8;
  var GRAVITY = 24;
  var JUMP_SPEED = 8.2;
  var WALK_SPEED = 4.5;
  var REACH = 7;

  // ============================================================
  // WORLD STATE
  // ============================================================
  var world = new Uint8Array(SX * SY * SZ);
  var worldSeed = DEFAULT_SEED;

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  function idx(x, y, z) {
    return x + z * SX + y * SX * SZ;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  function inBounds(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < SX && y < SY && z < SZ;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  function getBlock(x, y, z) {
    if (!inBounds(x, y, z)) return AIR;
    return world[idx(x, y, z)];
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} id
   */
  function setBlock(x, y, z, id) {
    if (!inBounds(x, y, z)) return;
    world[idx(x, y, z)] = id;
  }

  /** @param {number} id */
  function isOpaque(id) {
    return id !== AIR && id !== WATER;
  }

  /** @param {number} id */
  function isSolid(id) {
    return id !== AIR && id !== WATER;
  }

  // ============================================================
  // NOISE (seeded value noise, 2 octaves)
  // ============================================================
  /**
   * @param {number} ix
   * @param {number} iz
   * @param {number} s
   */
  function hash2(ix, iz, s) {
    var h = (ix * 374761393 + iz * 668265263 + s * 1442695041) | 0;
    h = ((h ^ (h >> 13)) * 1274126177) | 0;
    h = h ^ (h >> 16);
    return (h >>> 0) / 4294967295;
  }

  /** @param {number} t */
  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  /**
   * @param {number} x
   * @param {number} z
   * @param {number} s
   */
  function valueNoise(x, z, s) {
    var ix = Math.floor(x),
      iz = Math.floor(z);
    var fx = x - ix,
      fz = z - iz;
    var a = hash2(ix, iz, s);
    var b = hash2(ix + 1, iz, s);
    var c = hash2(ix, iz + 1, s);
    var d = hash2(ix + 1, iz + 1, s);
    var u = smooth(fx),
      v = smooth(fz);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  }

  /**
   * @param {number} x
   * @param {number} z
   * @param {number} s
   */
  function terrainHeight(x, z, s) {
    var n = valueNoise(x / 22, z / 22, s) * 0.65 + valueNoise(x / 7, z / 7, s + 7) * 0.35;
    return Math.max(3, Math.min(SY - 14, Math.round(8 + n * 20)));
  }

  // ============================================================
  // WORLD GENERATION
  // ============================================================
  /** @param {number} s */
  function generateWorld(s) {
    worldSeed = s;
    world.fill(AIR);

    for (var x = 0; x < SX; x++) {
      for (var z = 0; z < SZ; z++) {
        var h = terrainHeight(x, z, s);
        for (var y = 0; y <= h; y++) {
          var b;
          if (y === 0) b = BEDROCK;
          else if (y < h - 3) b = STONE;
          else if (y < h) b = DIRT;
          else b = h <= SEA + 1 ? SAND : GRASS;
          setBlock(x, y, z, b);
        }
        for (var w = h + 1; w <= SEA; w++) {
          setBlock(x, w, z, WATER);
        }
      }
    }

    // Trees on grass, away from the world edge
    for (var tx = 3; tx < SX - 3; tx++) {
      for (var tz = 3; tz < SZ - 3; tz++) {
        var th = terrainHeight(tx, tz, s);
        if (getBlock(tx, th, tz) !== GRASS) continue;
        if (hash2(tx, tz, s + 99) > 0.012) continue;
        var trunk = 4 + Math.floor(hash2(tx, tz, s + 123) * 2);
        if (th + trunk + 3 >= SY) continue;
        for (var ty = 1; ty <= trunk; ty++) setBlock(tx, th + ty, tz, LOG);
        for (var lx = -2; lx <= 2; lx++) {
          for (var lz = -2; lz <= 2; lz++) {
            for (var ly = trunk - 1; ly <= trunk + 2; ly++) {
              var r = Math.abs(lx) + Math.abs(lz) + Math.max(0, ly - trunk);
              if (r > 3) continue;
              if (lx === 0 && lz === 0 && ly <= trunk) continue;
              if (getBlock(tx + lx, th + ly, tz + lz) === AIR) {
                setBlock(tx + lx, th + ly, tz + lz, LEAVES);
              }
            }
          }
        }
      }
    }
  }

  /**
   * @param {number} x
   * @param {number} z
   */
  function surfaceHeight(x, z) {
    for (var y = SY - 1; y >= 0; y--) {
      if (isSolid(getBlock(x, y, z))) return y;
    }
    return 0;
  }

  // ============================================================
  // TEXTURE ATLAS (procedurally drawn)
  // ============================================================
  var ATLAS = 64,
    TILE = 16;
  var atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = ATLAS;
  atlasCanvas.height = ATLAS;

  var texSeed = 42;
  function trand() {
    texSeed = (texSeed * 1664525 + 1013904223) >>> 0;
    return texSeed / 4294967296;
  }

  /**
   * Paints one 16px tile of the atlas. `painter` may return the colour of a
   * pixel; when it returns null the pixel gets `base` plus the jitter.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} tile
   * @param {number[]} base
   * @param {number} jitter
   * @param {(x: number, y: number, j: number) => number[] | null} [painter]
   */
  function drawTile(ctx, tile, base, jitter, painter) {
    var ox = (tile % 4) * TILE;
    var oy = Math.floor(tile / 4) * TILE;
    for (var y = 0; y < TILE; y++) {
      for (var x = 0; x < TILE; x++) {
        var j = (trand() - 0.5) * 2 * jitter;
        var c = painter ? painter(x, y, j) : null;
        if (!c) {
          c = [base[0] + j, base[1] + j, base[2] + j * 0.7];
        }
        ctx.fillStyle =
          'rgb(' +
          Math.max(0, Math.min(255, Math.round(c[0]))) +
          ',' +
          Math.max(0, Math.min(255, Math.round(c[1]))) +
          ',' +
          Math.max(0, Math.min(255, Math.round(c[2]))) +
          ')';
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }

  function buildAtlas() {
    var ctx = required(atlasCanvas.getContext('2d'), 'atlas 2D context');
    texSeed = 42;

    drawTile(ctx, T_GRASS_TOP, [98, 160, 58], 16);
    drawTile(ctx, T_GRASS_SIDE, [116, 84, 54], 14, function (x, y, j) {
      if (y < 3 + (x % 3 === 0 ? 1 : 0)) return [96 + j, 152 + j, 56 + j * 0.5];
      return null;
    });
    drawTile(ctx, T_DIRT, [116, 84, 54], 16);
    drawTile(ctx, T_STONE, [125, 125, 125], 13);
    drawTile(ctx, T_SAND, [214, 202, 150], 10);
    drawTile(ctx, T_LOG_SIDE, [102, 78, 44], 8, function (x, y, j) {
      var stripe = x % 4 === 0 ? -22 : 0;
      return [102 + j + stripe, 78 + j + stripe, 44 + j * 0.5 + stripe];
    });
    drawTile(ctx, T_LOG_TOP, [156, 126, 74], 8, function (x, y, j) {
      var dx = x - 7.5,
        dy = y - 7.5;
      var ring = Math.floor(Math.sqrt(dx * dx + dy * dy)) % 3 === 0 ? -30 : 0;
      return [156 + j + ring, 126 + j + ring, 74 + j * 0.5 + ring];
    });
    drawTile(ctx, T_LEAVES, [46, 110, 34], 24);
    drawTile(ctx, T_PLANKS, [160, 128, 78], 8, function (x, y, j) {
      var seam = y % 4 === 3 ? -36 : 0;
      return [160 + j + seam, 128 + j + seam, 78 + j * 0.5 + seam];
    });
    drawTile(ctx, T_COBBLE, [110, 110, 110], 10, function (x, y, j) {
      var blob = ((x >> 2) + (y >> 2)) % 2 === 0 ? 16 : -12;
      return [110 + j + blob, 110 + j + blob, 110 + j + blob];
    });
    drawTile(ctx, T_WATER, [48, 84, 190], 14, function (x, y, j) {
      var wave = (x + y * 2) % 8 < 2 ? 22 : 0;
      return [48 + j + wave, 84 + j + wave, 190 + j];
    });
    drawTile(ctx, T_BEDROCK, [58, 58, 58], 22);
  }

  // ============================================================
  // MAT4 HELPERS (column-major)
  // ============================================================
  function mat4Identity() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }

  /**
   * @param {Float32Array} a
   * @param {Float32Array} b
   */
  function mat4Multiply(a, b) {
    var out = new Float32Array(16);
    for (var c = 0; c < 4; c++) {
      for (var r = 0; r < 4; r++) {
        var sum = 0;
        for (var k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k];
        out[c * 4 + r] = sum;
      }
    }
    return out;
  }

  /**
   * @param {number} fovy
   * @param {number} aspect
   * @param {number} near
   * @param {number} far
   */
  function mat4Perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2);
    var out = new Float32Array(16);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[14] = (2 * far * near) / (near - far);
    return out;
  }

  /** @param {number} a */
  function mat4RotX(a) {
    var c = Math.cos(a),
      s = Math.sin(a);
    var m = mat4Identity();
    m[5] = c;
    m[6] = s;
    m[9] = -s;
    m[10] = c;
    return m;
  }

  /** @param {number} a */
  function mat4RotY(a) {
    var c = Math.cos(a),
      s = Math.sin(a);
    var m = mat4Identity();
    m[0] = c;
    m[2] = -s;
    m[8] = s;
    m[10] = c;
    return m;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  function mat4Translate(x, y, z) {
    var m = mat4Identity();
    m[12] = x;
    m[13] = y;
    m[14] = z;
    return m;
  }

  // ============================================================
  // WEBGL SETUP
  // ============================================================
  var canvas = byId('glCanvas', HTMLCanvasElement);
  /**
   * Set by initGL. Code that draws runs only when glOk is true, so it
   * reads the context through requireGL().
   * @type {WebGLRenderingContext | null}
   */
  var glContext = null;
  var glOk = false;
  /** @type {WebGLProgram | null} */
  var mainProgram = null;
  /** @type {WebGLProgram | null} */
  var lineProgram = null;
  /** @type {MainLocs} */
  var mainLocs;
  /** @type {LineLocs} */
  var lineLocs;
  /** @type {WebGLBuffer | null} */
  var opaqueBuffer = null;
  /** @type {WebGLBuffer | null} */
  var waterBuffer = null;
  /** @type {WebGLBuffer | null} */
  var lineBuffer = null;
  var opaqueVerts = 0,
    waterVerts = 0;
  /** @type {WebGLTexture | null} */
  var atlasTexture = null;

  function requireGL() {
    return required(glContext, 'WebGL context');
  }

  var VERT_SRC = [
    'attribute vec3 aPos;',
    'attribute vec2 aUV;',
    'attribute float aLight;',
    'uniform mat4 uMVP;',
    'uniform vec3 uCam;',
    'varying vec2 vUV;',
    'varying float vLight;',
    'varying float vDist;',
    'void main() {',
    '  vUV = aUV;',
    '  vLight = aLight;',
    '  vDist = distance(aPos, uCam);',
    '  gl_Position = uMVP * vec4(aPos, 1.0);',
    '}',
  ].join('\n');

  var FRAG_SRC = [
    'precision mediump float;',
    'uniform sampler2D uTex;',
    'uniform vec3 uFogColor;',
    'uniform float uAlpha;',
    'varying vec2 vUV;',
    'varying float vLight;',
    'varying float vDist;',
    'void main() {',
    '  vec4 c = texture2D(uTex, vUV);',
    '  c.rgb *= vLight;',
    '  float fog = smoothstep(38.0, 60.0, vDist);',
    '  c.rgb = mix(c.rgb, uFogColor, fog);',
    '  c.a *= uAlpha;',
    '  gl_FragColor = c;',
    '}',
  ].join('\n');

  var LINE_VERT_SRC = [
    'attribute vec3 aPos;',
    'uniform mat4 uMVP;',
    'uniform vec3 uOffset;',
    'void main() {',
    '  gl_Position = uMVP * vec4(aPos + uOffset, 1.0);',
    '}',
  ].join('\n');

  var LINE_FRAG_SRC = [
    'precision mediump float;',
    'void main() { gl_FragColor = vec4(0.05, 0.05, 0.05, 1.0); }',
  ].join('\n');

  /**
   * @param {number} type
   * @param {string} src
   */
  function compileShader(type, src) {
    var gl = requireGL();
    var sh = required(gl.createShader(type), 'shader');
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  /**
   * @param {string} vsSrc
   * @param {string} fsSrc
   */
  function linkProgram(vsSrc, fsSrc) {
    var gl = requireGL();
    var p = required(gl.createProgram(), 'program');
    gl.attachShader(p, compileShader(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, compileShader(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('Program link failed: ' + gl.getProgramInfoLog(p));
    }
    return p;
  }

  function initGL() {
    var gl =
      canvas.getContext('webgl', { antialias: false }) ||
      /** @type {WebGLRenderingContext | null} */ (canvas.getContext('experimental-webgl'));
    if (!gl) return false;
    glContext = gl;

    var main = linkProgram(VERT_SRC, FRAG_SRC);
    mainProgram = main;
    mainLocs = {
      aPos: gl.getAttribLocation(main, 'aPos'),
      aUV: gl.getAttribLocation(main, 'aUV'),
      aLight: gl.getAttribLocation(main, 'aLight'),
      uMVP: gl.getUniformLocation(main, 'uMVP'),
      uCam: gl.getUniformLocation(main, 'uCam'),
      uTex: gl.getUniformLocation(main, 'uTex'),
      uFogColor: gl.getUniformLocation(main, 'uFogColor'),
      uAlpha: gl.getUniformLocation(main, 'uAlpha'),
    };

    var line = linkProgram(LINE_VERT_SRC, LINE_FRAG_SRC);
    lineProgram = line;
    lineLocs = {
      aPos: gl.getAttribLocation(line, 'aPos'),
      uMVP: gl.getUniformLocation(line, 'uMVP'),
      uOffset: gl.getUniformLocation(line, 'uOffset'),
    };

    opaqueBuffer = gl.createBuffer();
    waterBuffer = gl.createBuffer();

    // Unit-cube wireframe, slightly inflated to avoid z-fighting
    var lo = -0.003,
      hi = 1.003;
    var cubeEdges = [
      [lo, lo, lo, hi, lo, lo],
      [hi, lo, lo, hi, lo, hi],
      [hi, lo, hi, lo, lo, hi],
      [lo, lo, hi, lo, lo, lo],
      [lo, hi, lo, hi, hi, lo],
      [hi, hi, lo, hi, hi, hi],
      [hi, hi, hi, lo, hi, hi],
      [lo, hi, hi, lo, hi, lo],
      [lo, lo, lo, lo, hi, lo],
      [hi, lo, lo, hi, hi, lo],
      [hi, lo, hi, hi, hi, hi],
      [lo, lo, hi, lo, hi, hi],
    ];
    /** @type {number[]} */
    var lineVerts = [];
    cubeEdges.forEach(function (e) {
      lineVerts.push(e[0], e[1], e[2], e[3], e[4], e[5]);
    });
    lineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVerts), gl.STATIC_DRAW);

    buildAtlas();
    atlasTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clearColor(0.55, 0.75, 0.98, 1);
    return true;
  }

  // ============================================================
  // MESH BUILDING
  // ============================================================
  // Face corner layout per direction. Corners are counter-clockwise when
  // viewed from outside the block (so back-face culling works).
  // dir: 0 +x, 1 -x, 2 +y (top), 3 -y (bottom), 4 +z, 5 -z
  /** @type {Face[]} */
  var FACES = [
    {
      n: [1, 0, 0],
      c: [
        [1, 0, 1],
        [1, 0, 0],
        [1, 1, 0],
        [1, 1, 1],
      ],
      light: 0.8,
    },
    {
      n: [-1, 0, 0],
      c: [
        [0, 0, 0],
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
      ],
      light: 0.8,
    },
    {
      n: [0, 1, 0],
      c: [
        [0, 1, 1],
        [1, 1, 1],
        [1, 1, 0],
        [0, 1, 0],
      ],
      light: 1.0,
    },
    {
      n: [0, -1, 0],
      c: [
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 1],
        [0, 0, 1],
      ],
      light: 0.5,
    },
    {
      n: [0, 0, 1],
      c: [
        [0, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 1],
      ],
      light: 0.65,
    },
    {
      n: [0, 0, -1],
      c: [
        [1, 0, 0],
        [0, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
      light: 0.65,
    },
  ];

  /** @param {number} tile */
  function tileUV(tile) {
    var pad = 0.5 / ATLAS;
    var tx = (tile % 4) * 0.25;
    var ty = Math.floor(tile / 4) * 0.25;
    return [tx + pad, ty + pad, tx + 0.25 - pad, ty + 0.25 - pad];
  }

  /**
   * @param {number[]} arr
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {Face} face
   * @param {number} tile
   * @param {number} light
   */
  function pushFace(arr, x, y, z, face, tile, light) {
    var uv = tileUV(tile);
    var u0 = uv[0],
      v0 = uv[1],
      u1 = uv[2],
      v1 = uv[3];
    var c = face.c;
    // Two triangles: 0-1-2, 0-2-3
    var corners = [c[0], c[1], c[2], c[0], c[2], c[3]];
    var uvs = [
      [u0, v1],
      [u1, v1],
      [u1, v0],
      [u0, v1],
      [u1, v0],
      [u0, v0],
    ];
    for (var i = 0; i < 6; i++) {
      arr.push(
        x + corners[i][0],
        y + corners[i][1],
        z + corners[i][2],
        uvs[i][0],
        uvs[i][1],
        light
      );
    }
  }

  function rebuildMesh() {
    if (!glOk) return;
    var gl = requireGL();
    /** @type {number[]} */
    var opaque = [];
    /** @type {number[]} */
    var water = [];

    for (var y = 0; y < SY; y++) {
      for (var z = 0; z < SZ; z++) {
        for (var x = 0; x < SX; x++) {
          var b = world[idx(x, y, z)];
          if (b === AIR) continue;
          var tiles = BLOCK_TILES[b];
          for (var d = 0; d < 6; d++) {
            var f = FACES[d];
            var nb = getBlock(x + f.n[0], y + f.n[1], z + f.n[2]);
            if (b === WATER) {
              if (nb !== AIR) continue;
              pushFace(water, x, y, z, f, tiles[1], f.light);
            } else {
              if (isOpaque(nb)) continue;
              var tile = d === 2 ? tiles[0] : d === 3 ? tiles[2] : tiles[1];
              pushFace(opaque, x, y, z, f, tile, f.light);
            }
          }
        }
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, opaqueBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(opaque), gl.DYNAMIC_DRAW);
    opaqueVerts = opaque.length / 6;

    gl.bindBuffer(gl.ARRAY_BUFFER, waterBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(water), gl.DYNAMIC_DRAW);
    waterVerts = water.length / 6;
  }

  // ============================================================
  // PLAYER
  // ============================================================
  var player = {
    x: SX / 2 + 0.5,
    y: 30,
    z: SZ / 2 + 0.5,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: Math.PI / 4,
    pitch: -0.15,
    onGround: false,
  };

  /** @type {Record<string, boolean>} */
  var keys = {};
  var selectedSlot = 0;

  function spawnPlayer() {
    var sx = Math.floor(SX / 2),
      sz = Math.floor(SZ / 2);
    var top = surfaceHeight(sx, sz);
    player.x = sx + 0.5;
    player.y = top + 1;
    player.z = sz + 0.5;
    player.vx = 0;
    player.vy = 0;
    player.vz = 0;
    player.yaw = Math.PI / 4;
    player.pitch = -0.15;
  }

  /**
   * @param {number} px
   * @param {number} py
   * @param {number} pz
   */
  function collides(px, py, pz) {
    var x0 = Math.floor(px - PLAYER_HALF),
      x1 = Math.floor(px + PLAYER_HALF);
    var y0 = Math.floor(py),
      y1 = Math.floor(py + PLAYER_HEIGHT);
    var z0 = Math.floor(pz - PLAYER_HALF),
      z1 = Math.floor(pz + PLAYER_HALF);
    for (var x = x0; x <= x1; x++) {
      for (var y = y0; y <= y1; y++) {
        for (var z = z0; z <= z1; z++) {
          if (isSolid(getBlock(x, y, z))) return true;
        }
      }
    }
    return false;
  }

  function inWater() {
    return (
      getBlock(Math.floor(player.x), Math.floor(player.y + 0.4), Math.floor(player.z)) === WATER
    );
  }

  /** @param {number} dt */
  function updatePhysics(dt) {
    var swim = inWater();

    var fx = -Math.sin(player.yaw),
      fz = -Math.cos(player.yaw);
    var rx = Math.cos(player.yaw),
      rz = -Math.sin(player.yaw);

    var mx = 0,
      mz = 0;
    if (keys['KeyW']) {
      mx += fx;
      mz += fz;
    }
    if (keys['KeyS']) {
      mx -= fx;
      mz -= fz;
    }
    if (keys['KeyD']) {
      mx += rx;
      mz += rz;
    }
    if (keys['KeyA']) {
      mx -= rx;
      mz -= rz;
    }
    var len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len;
      mz /= len;
    }
    var speed = swim ? WALK_SPEED * 0.6 : WALK_SPEED;
    player.vx = mx * speed;
    player.vz = mz * speed;

    if (swim) {
      player.vy -= GRAVITY * 0.25 * dt;
      player.vy *= 0.9;
      if (keys['Space']) player.vy = 3.2;
    } else {
      player.vy -= GRAVITY * dt;
      if (keys['Space'] && player.onGround) {
        player.vy = JUMP_SPEED;
        player.onGround = false;
      }
    }
    if (player.vy < -50) player.vy = -50;

    // Move and resolve axis by axis
    var nx = player.x + player.vx * dt;
    if (!collides(nx, player.y, player.z)) player.x = nx;

    var nz = player.z + player.vz * dt;
    if (!collides(player.x, player.y, nz)) player.z = nz;

    var ny = player.y + player.vy * dt;
    if (!collides(player.x, ny, player.z)) {
      player.y = ny;
      player.onGround = false;
    } else {
      if (player.vy < 0) player.onGround = true;
      player.vy = 0;
    }

    // Safety net: never fall out of the world
    if (player.y < -10) spawnPlayer();
  }

  // ============================================================
  // RAYCAST (Amanatides & Woo voxel traversal)
  // ============================================================
  function raycast() {
    var cp = Math.cos(player.pitch);
    var dx = -Math.sin(player.yaw) * cp;
    var dy = Math.sin(player.pitch);
    var dz = -Math.cos(player.yaw) * cp;

    var ox = player.x,
      oy = player.y + EYE_HEIGHT,
      oz = player.z;
    var x = Math.floor(ox),
      y = Math.floor(oy),
      z = Math.floor(oz);

    var stepX = dx > 0 ? 1 : -1;
    var stepY = dy > 0 ? 1 : -1;
    var stepZ = dz > 0 ? 1 : -1;

    var tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    var tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    var tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;

    var tMaxX = dx !== 0 ? (dx > 0 ? x + 1 - ox : ox - x) * tDeltaX : Infinity;
    var tMaxY = dy !== 0 ? (dy > 0 ? y + 1 - oy : oy - y) * tDeltaY : Infinity;
    var tMaxZ = dz !== 0 ? (dz > 0 ? z + 1 - oz : oz - z) * tDeltaZ : Infinity;

    var face = [0, 0, 0];
    for (var i = 0; i < 128; i++) {
      var b = getBlock(x, y, z);
      if (b !== AIR && b !== WATER) {
        return { x: x, y: y, z: z, block: b, face: face };
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        if (tMaxX > REACH) return null;
        x += stepX;
        tMaxX += tDeltaX;
        face = [-stepX, 0, 0];
      } else if (tMaxY < tMaxZ) {
        if (tMaxY > REACH) return null;
        y += stepY;
        tMaxY += tDeltaY;
        face = [0, -stepY, 0];
      } else {
        if (tMaxZ > REACH) return null;
        z += stepZ;
        tMaxZ += tDeltaZ;
        face = [0, 0, -stepZ];
      }
    }
    return null;
  }

  function breakBlock() {
    const hit = raycast();
    if (!hit || hit.block === BEDROCK) return false;
    setBlock(hit.x, hit.y, hit.z, AIR);
    // Let water flow into the hole from any adjacent water block
    var nearWater = FACES.some(function (f) {
      return getBlock(hit.x + f.n[0], hit.y + f.n[1], hit.z + f.n[2]) === WATER;
    });
    if (nearWater && hit.y <= SEA) setBlock(hit.x, hit.y, hit.z, WATER);
    rebuildMesh();
    return true;
  }

  function placeBlock() {
    var hit = raycast();
    if (!hit) return false;
    var px = hit.x + hit.face[0],
      py = hit.y + hit.face[1],
      pz = hit.z + hit.face[2];
    if (!inBounds(px, py, pz)) return false;
    var target = getBlock(px, py, pz);
    if (target !== AIR && target !== WATER) return false;
    // Don't place a block inside the player
    var overlapsPlayer =
      px + 1 > player.x - PLAYER_HALF &&
      px < player.x + PLAYER_HALF &&
      pz + 1 > player.z - PLAYER_HALF &&
      pz < player.z + PLAYER_HALF &&
      py + 1 > player.y &&
      py < player.y + PLAYER_HEIGHT;
    if (overlapsPlayer) return false;
    setBlock(px, py, pz, HOTBAR_BLOCKS[selectedSlot]);
    rebuildMesh();
    return true;
  }

  // ============================================================
  // RENDER LOOP
  // ============================================================
  var lastTime = 0;
  var fpsCount = 0,
    fpsTime = 0,
    fps = 0;

  // Keep the drawing buffer matched to the element size (the shell can
  // resize or maximize the window around us).
  function syncCanvasSize() {
    var w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  /** @param {number} now */
  function render(now) {
    var gl = requireGL();
    var dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
    lastTime = now;

    syncCanvasSize();

    updatePhysics(dt);
    updateStatus();

    fpsCount++;
    fpsTime += dt;
    if (fpsTime >= 1) {
      fps = fpsCount;
      fpsCount = 0;
      fpsTime = 0;
      byId('statusFps', HTMLElement).textContent = fps + ' fps';
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var eyeX = player.x,
      eyeY = player.y + EYE_HEIGHT,
      eyeZ = player.z;
    var proj = mat4Perspective((70 * Math.PI) / 180, canvas.width / canvas.height, 0.08, 120);
    var view = mat4Multiply(
      mat4RotX(-player.pitch),
      mat4Multiply(mat4RotY(-player.yaw), mat4Translate(-eyeX, -eyeY, -eyeZ))
    );
    var mvp = mat4Multiply(proj, view);

    gl.useProgram(mainProgram);
    gl.uniformMatrix4fv(mainLocs.uMVP, false, mvp);
    gl.uniform3f(mainLocs.uCam, eyeX, eyeY, eyeZ);
    gl.uniform3f(mainLocs.uFogColor, 0.55, 0.75, 0.98);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.uniform1i(mainLocs.uTex, 0);

    // Opaque pass
    gl.uniform1f(mainLocs.uAlpha, 1);
    drawMeshBuffer(opaqueBuffer, opaqueVerts);

    // Highlight targeted block
    var hit = raycast();
    if (hit) {
      gl.useProgram(lineProgram);
      gl.uniformMatrix4fv(lineLocs.uMVP, false, mvp);
      gl.uniform3f(lineLocs.uOffset, hit.x, hit.y, hit.z);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
      gl.enableVertexAttribArray(lineLocs.aPos);
      gl.vertexAttribPointer(lineLocs.aPos, 3, gl.FLOAT, false, 12, 0);
      gl.drawArrays(gl.LINES, 0, 24);
    }

    // Water pass (translucent, after everything else)
    if (waterVerts > 0) {
      gl.useProgram(mainProgram);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);
      gl.uniform1f(mainLocs.uAlpha, 0.55);
      drawMeshBuffer(waterBuffer, waterVerts);
      gl.enable(gl.CULL_FACE);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    requestAnimationFrame(render);
  }

  /**
   * @param {WebGLBuffer | null} buffer
   * @param {number} count
   */
  function drawMeshBuffer(buffer, count) {
    if (count === 0) return;
    var gl = requireGL();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(mainLocs.aPos);
    gl.vertexAttribPointer(mainLocs.aPos, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(mainLocs.aUV);
    gl.vertexAttribPointer(mainLocs.aUV, 2, gl.FLOAT, false, 24, 12);
    gl.enableVertexAttribArray(mainLocs.aLight);
    gl.vertexAttribPointer(mainLocs.aLight, 1, gl.FLOAT, false, 24, 20);
    gl.drawArrays(gl.TRIANGLES, 0, count);
  }

  function updateStatus() {
    byId('statusPos', HTMLElement).textContent =
      'x: ' +
      Math.floor(player.x) +
      '  y: ' +
      Math.floor(player.y) +
      '  z: ' +
      Math.floor(player.z);
  }

  // ============================================================
  // HOTBAR UI
  // ============================================================
  function buildHotbar() {
    var hotbar = byId('hotbar', HTMLElement);
    hotbar.innerHTML = '';
    var actx = required(atlasCanvas.getContext('2d'), 'atlas 2D context');
    HOTBAR_BLOCKS.forEach(function (block, i) {
      var slot = document.createElement('div');
      slot.className = 'hotbar-slot' + (i === selectedSlot ? ' selected' : '');
      slot.id = 'hotbarSlot' + i;
      slot.title = BLOCK_NAMES[block];

      var key = document.createElement('span');
      key.className = 'slot-key';
      key.textContent = String(i + 1);
      slot.appendChild(key);

      var thumb = document.createElement('canvas');
      thumb.width = TILE;
      thumb.height = TILE;
      var tile = BLOCK_TILES[block][1];
      var tctx = required(thumb.getContext('2d'), 'thumbnail 2D context');
      tctx.putImageData(
        actx.getImageData((tile % 4) * TILE, Math.floor(tile / 4) * TILE, TILE, TILE),
        0,
        0
      );
      slot.appendChild(thumb);

      slot.addEventListener('click', function () {
        selectSlot(i);
      });
      hotbar.appendChild(slot);
    });
  }

  /** @param {number} i */
  function selectSlot(i) {
    selectedSlot = ((i % HOTBAR_BLOCKS.length) + HOTBAR_BLOCKS.length) % HOTBAR_BLOCKS.length;
    document.querySelectorAll('.hotbar-slot').forEach(function (el, j) {
      el.classList.toggle('selected', j === selectedSlot);
    });
    byId('statusBlock', HTMLElement).textContent = BLOCK_NAMES[HOTBAR_BLOCKS[selectedSlot]];
  }

  // ============================================================
  // INPUT
  // ============================================================
  var pointerLocked = false;

  function requestLock() {
    if (canvas.requestPointerLock) canvas.requestPointerLock();
  }

  document.addEventListener('pointerlockchange', function () {
    pointerLocked = document.pointerLockElement === canvas;
    byId('playOverlay', HTMLElement).classList.toggle('show', !pointerLocked && glOk);
    if (!pointerLocked) keys = {};
  });

  byId('playPanel', HTMLElement).addEventListener('click', function () {
    if (glOk) requestLock();
  });

  canvas.addEventListener('mousedown', function (e) {
    if (!glOk) return;
    if (!pointerLocked) {
      requestLock();
      return;
    }
    if (e.button === 0) breakBlock();
    else if (e.button === 2) placeBlock();
  });

  canvas.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!pointerLocked) return;
    var sens = 0.0026;
    player.yaw -= e.movementX * sens;
    player.pitch -= e.movementY * sens;
    var maxPitch = Math.PI / 2 - 0.01;
    if (player.pitch > maxPitch) player.pitch = maxPitch;
    if (player.pitch < -maxPitch) player.pitch = -maxPitch;
  });

  document.addEventListener('keydown', function (e) {
    if (byId('aboutDialog', HTMLElement).classList.contains('show')) return;
    keys[e.code] = true;
    if (e.code >= 'Digit1' && e.code <= 'Digit8') {
      selectSlot(parseInt(e.code.slice(5), 10) - 1);
    }
    if (e.code === 'Space') e.preventDefault();
  });

  document.addEventListener('keyup', function (e) {
    keys[e.code] = false;
  });

  document.addEventListener(
    'wheel',
    function (e) {
      if (!pointerLocked) return;
      selectSlot(selectedSlot + (e.deltaY > 0 ? 1 : -1));
    },
    { passive: true }
  );

  // ============================================================
  // MENUS & DIALOGS
  // ============================================================
  /** @type {HTMLElement | null} */
  var openDropdown = null;

  function closeMenus() {
    document.querySelectorAll('.menu-dropdown').forEach(function (d) {
      d.classList.remove('open');
    });
    document.querySelectorAll('.menu-title').forEach(function (t) {
      t.classList.remove('open');
    });
    openDropdown = null;
  }

  /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.menu-title')).forEach(
    function (title) {
      title.addEventListener('click', function (e) {
        e.stopPropagation();
        var dd = byId(required(title.dataset.menu, 'data-menu'), HTMLElement);
        var wasOpen = dd.classList.contains('open');
        closeMenus();
        if (!wasOpen) {
          dd.classList.add('open');
          title.classList.add('open');
          openDropdown = dd;
        }
      });
    }
  );

  document.addEventListener('click', function () {
    if (openDropdown) closeMenus();
  });

  /** @param {number} [seed] */
  function newWorld(seed) {
    generateWorld(seed === undefined ? (Math.random() * 1e9) >>> 0 : seed);
    spawnPlayer();
    rebuildMesh();
  }

  byId('menuNewWorld', HTMLElement).addEventListener('click', function () {
    closeMenus();
    newWorld();
  });

  byId('menuControls', HTMLElement).addEventListener('click', function () {
    closeMenus();
    if (document.exitPointerLock) document.exitPointerLock();
    byId('playOverlay', HTMLElement).classList.add('show');
  });

  /** @param {boolean} show */
  function showAbout(show) {
    byId('aboutDialog', HTMLElement).classList.toggle('show', show);
  }

  byId('menuAbout', HTMLElement).addEventListener('click', function () {
    closeMenus();
    if (document.exitPointerLock) document.exitPointerLock();
    showAbout(true);
  });

  byId('aboutCloseBtn', HTMLElement).addEventListener('click', function () {
    showAbout(false);
  });

  byId('aboutCloseX', HTMLElement).addEventListener('click', function () {
    showAbout(false);
  });

  byId('closeBtn', HTMLElement).addEventListener('click', function () {
    window.history.back();
  });

  // ============================================================
  // EMBEDDED (IFRAME) MODE
  // ============================================================
  if (window.self !== window.top) {
    document.body.classList.add('embedded');
  }

  // ============================================================
  // INIT
  // ============================================================
  generateWorld(DEFAULT_SEED);
  spawnPlayer();

  try {
    glOk = initGL();
  } catch {
    glOk = false;
  }

  buildAtlas(); // ensure atlas exists even without GL (hotbar thumbnails)
  buildHotbar();
  selectSlot(0);

  if (glOk) {
    rebuildMesh();
    requestAnimationFrame(render);
  } else {
    var hint = byId('overlayHint', HTMLElement);
    hint.textContent = 'WebGL is not available on this system.';
    byId('playPanel', HTMLElement).style.cursor = 'default';
  }

  // ============================================================
  // TEST HOOKS (used by the Playwright suite)
  // ============================================================
  Object.assign(window, {
    MinecraftTest: {
      ready: true,
      glOk: glOk,
      worldSize: { x: SX, y: SY, z: SZ },
      seed: function () {
        return worldSeed;
      },
      getBlock: getBlock,
      /**
       * @param {number} x
       * @param {number} y
       * @param {number} z
       * @param {number} id
       */
      setBlock: function (x, y, z, id) {
        setBlock(x, y, z, id);
        rebuildMesh();
      },
      /** @param {number} id */
      countBlocks: function (id) {
        var n = 0;
        for (var i = 0; i < world.length; i++) if (world[i] === id) n++;
        return n;
      },
      getPlayer: function () {
        return { x: player.x, y: player.y, z: player.z, yaw: player.yaw, pitch: player.pitch };
      },
      /**
       * @param {number} x
       * @param {number} y
       * @param {number} z
       */
      setPlayer: function (x, y, z) {
        player.x = x;
        player.y = y;
        player.z = z;
        player.vx = 0;
        player.vy = 0;
        player.vz = 0;
      },
      /**
       * @param {number} yaw
       * @param {number} pitch
       */
      setLook: function (yaw, pitch) {
        player.yaw = yaw;
        player.pitch = pitch;
      },
      getSelected: function () {
        return selectedSlot;
      },
      surfaceHeight: surfaceHeight,
      breakBlock: breakBlock,
      placeBlock: placeBlock,
      newWorld: newWorld,
    },
  });
})();
