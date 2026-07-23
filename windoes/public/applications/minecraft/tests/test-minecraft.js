/**
 * Playwright tests for the Minecraft application.
 *
 * Validates:
 * - Page loads with all expected UI elements (canvas, hotbar, menus, status bar)
 * - The world generates deterministic terrain (grass, stone, water, trees)
 * - The player spawns standing on solid ground and gravity works
 * - Hotbar selection via keyboard and clicking
 * - Breaking and placing blocks through the raycast code path
 * - Game > New World regenerates the world
 * - Help > About dialog opens and closes
 */

const path = require('path');
const { launchBrowser } = require('../../../../../tests/launch-browser');
const { createAssertTracker } = require('../../../../../tests/helpers/test-harness');

const FILE_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const tracker = createAssertTracker();
const { assert } = tracker;

// Block ids mirrored from index.html
const AIR = 0;
const COBBLE = 8;
const WATER = 9;
const BEDROCK = 10;

async function runTests() {
  const browser = await launchBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // ── Test 1: Page loads with core UI elements ─────────────────────────
  console.log('\nTest 1: Page loads with core UI elements');
  await page.goto(FILE_URL);
  await page.waitForFunction(() => window.MinecraftTest && window.MinecraftTest.ready);

  const elements = await page.evaluate(() => ({
    window: !!document.getElementById('window'),
    canvas: !!document.getElementById('glCanvas'),
    hotbar: !!document.getElementById('hotbar'),
    hotbarSlots: document.querySelectorAll('.hotbar-slot').length,
    menuGame: !!document.getElementById('menuGame'),
    menuHelp: !!document.getElementById('menuHelp'),
    statusPos: !!document.getElementById('statusPos'),
    overlay: !!document.getElementById('playOverlay'),
    glOk: window.MinecraftTest.glOk,
  }));

  assert(elements.window, 'Window element exists');
  assert(elements.canvas, 'WebGL canvas exists');
  assert(elements.hotbar, 'Hotbar exists');
  assert(elements.hotbarSlots === 8, `Hotbar has 8 slots (got: ${elements.hotbarSlots})`);
  assert(elements.menuGame, 'Game menu exists');
  assert(elements.menuHelp, 'Help menu exists');
  assert(elements.statusPos, 'Status bar position cell exists');
  assert(elements.overlay, 'Click-to-play overlay exists');
  console.log(`  (WebGL available: ${elements.glOk})`);

  // ── Test 2: World generates deterministic terrain ────────────────────
  console.log('\nTest 2: World generates terrain');

  const terrain = await page.evaluate(() => {
    const T = window.MinecraftTest;
    return {
      seed: T.seed(),
      grass: T.countBlocks(1),
      stone: T.countBlocks(3),
      water: T.countBlocks(9),
      logs: T.countBlocks(5),
      leaves: T.countBlocks(6),
      bedrock: T.countBlocks(10),
      size: T.worldSize,
    };
  });

  assert(terrain.seed === 1337, `Default world uses fixed seed (got: ${terrain.seed})`);
  assert(terrain.grass > 100, `World has grass (got: ${terrain.grass})`);
  assert(terrain.stone > 1000, `World has stone (got: ${terrain.stone})`);
  assert(terrain.water > 0, `World has water (got: ${terrain.water})`);
  assert(terrain.logs > 0, `World has tree trunks (got: ${terrain.logs})`);
  assert(terrain.leaves > 0, `World has tree leaves (got: ${terrain.leaves})`);
  assert(
    terrain.bedrock === terrain.size.x * terrain.size.z,
    `Bedrock floor covers the world (got: ${terrain.bedrock})`
  );

  // ── Test 3: Player spawns on solid ground ────────────────────────────
  console.log('\nTest 3: Player spawns on solid ground');

  const spawn = await page.evaluate(() => {
    const T = window.MinecraftTest;
    const p = T.getPlayer();
    const below = T.getBlock(Math.floor(p.x), Math.floor(p.y) - 1, Math.floor(p.z));
    return { p, below };
  });

  assert(
    spawn.below !== AIR && spawn.below !== WATER,
    `Block below spawn is solid (got id: ${spawn.below})`
  );

  // ── Test 4: Gravity pulls the player down (needs the render loop) ────
  console.log('\nTest 4: Gravity works');

  if (elements.glOk) {
    const yBefore = await page.evaluate(() => {
      const T = window.MinecraftTest;
      const p = T.getPlayer();
      T.setPlayer(p.x, p.y + 10, p.z);
      return T.getPlayer().y;
    });
    await page.waitForTimeout(500);
    const yAfter = await page.evaluate(() => window.MinecraftTest.getPlayer().y);
    assert(yAfter < yBefore - 1, `Player fell after being lifted (${yBefore} -> ${yAfter})`);
  } else {
    assert(true, 'Gravity check skipped (no WebGL, physics loop not running)');
  }

  // ── Test 5: Hotbar selection via keyboard and click ──────────────────
  console.log('\nTest 5: Hotbar selection');

  await page.keyboard.press('3');
  let selected = await page.evaluate(() => window.MinecraftTest.getSelected());
  assert(selected === 2, `Key "3" selects slot 3 (got index: ${selected})`);

  const slotHighlighted = await page.evaluate(() =>
    document.getElementById('hotbarSlot2').classList.contains('selected')
  );
  assert(slotHighlighted, 'Selected slot is highlighted');

  await page.click('#hotbarSlot7');
  selected = await page.evaluate(() => window.MinecraftTest.getSelected());
  assert(selected === 7, `Clicking slot 8 selects it (got index: ${selected})`);

  // ── Test 6: Breaking a block via the raycast path ────────────────────
  console.log('\nTest 6: Breaking a block');

  const breakResult = await page.evaluate(() => {
    const T = window.MinecraftTest;
    // Stand on a known column and look straight down
    const x = 10,
      z = 10;
    const top = T.surfaceHeight(x, z);
    T.setPlayer(x + 0.5, top + 1, z + 0.5);
    T.setLook(0, -Math.PI / 2 + 0.01);
    const before = T.getBlock(x, top, z);
    const broke = T.breakBlock();
    const after = T.getBlock(x, top, z);
    return { before, broke, after };
  });

  assert(breakResult.broke, 'breakBlock() reported success');
  assert(
    breakResult.before !== AIR && breakResult.after !== breakResult.before,
    `Block below was removed (${breakResult.before} -> ${breakResult.after})`
  );

  // ── Test 7: Placing a block via the raycast path ─────────────────────
  console.log('\nTest 7: Placing a block');

  const placeResult = await page.evaluate(() => {
    const T = window.MinecraftTest;
    // Aim down at a solid column from two blocks up so the placed block
    // lands beside the player-occupied space.
    const x = 12,
      z = 12;
    const top = T.surfaceHeight(x, z);
    T.setPlayer(x + 0.5, top + 3, z + 0.5);
    T.setLook(0, -Math.PI / 2 + 0.01);
    const placed = T.placeBlock();
    const block = T.getBlock(x, top + 1, z);
    return { placed, block };
  });

  assert(placeResult.placed, 'placeBlock() reported success');
  assert(
    placeResult.block === COBBLE,
    `Placed block is the selected hotbar block (got id: ${placeResult.block})`
  );

  // ── Test 8: Bedrock cannot be broken ─────────────────────────────────
  console.log('\nTest 8: Bedrock is unbreakable');

  const bedrockResult = await page.evaluate(() => {
    const T = window.MinecraftTest;
    T.setBlock(20, 1, 20, 0);
    T.setBlock(20, 2, 20, 0);
    T.setPlayer(20.5, 1, 20.5);
    T.setLook(0, -Math.PI / 2 + 0.01);
    const broke = T.breakBlock();
    return { broke, block: T.getBlock(20, 0, 20) };
  });

  assert(!bedrockResult.broke, 'breakBlock() refuses bedrock');
  assert(bedrockResult.block === BEDROCK, `Bedrock still present (got id: ${bedrockResult.block})`);

  // ── Test 9: Game > New World regenerates the world ───────────────────
  console.log('\nTest 9: New World via menu');

  await page.click('#menuGame');
  await page.waitForTimeout(100);
  const newWorldVisible = await page.evaluate(() =>
    document.getElementById('gameDropdown').classList.contains('open')
  );
  assert(newWorldVisible, 'Game dropdown opens');

  await page.click('#menuNewWorld');
  await page.waitForTimeout(200);

  const newWorldState = await page.evaluate(() => {
    const T = window.MinecraftTest;
    const p = T.getPlayer();
    return {
      seed: T.seed(),
      grass: T.countBlocks(1),
      cobbleAt: T.getBlock(12, T.surfaceHeight(12, 12), 12),
      onSpawn: Math.floor(p.x) === Math.floor(T.worldSize.x / 2),
    };
  });

  assert(newWorldState.seed !== 1337, `New world has a new seed (got: ${newWorldState.seed})`);
  assert(newWorldState.grass > 100, `New world has terrain (grass: ${newWorldState.grass})`);
  assert(newWorldState.onSpawn, 'Player respawned at world center');

  // ── Test 10: About dialog ────────────────────────────────────────────
  console.log('\nTest 10: About dialog');

  await page.click('#menuHelp');
  await page.waitForTimeout(100);
  await page.click('#menuAbout');
  await page.waitForTimeout(100);

  const aboutShown = await page.evaluate(() =>
    document.getElementById('aboutDialog').classList.contains('show')
  );
  assert(aboutShown, 'About dialog opens from Help menu');

  await page.click('#aboutCloseBtn');
  await page.waitForTimeout(100);
  const aboutHidden = await page.evaluate(
    () => !document.getElementById('aboutDialog').classList.contains('show')
  );
  assert(aboutHidden, 'About dialog closes via OK button');

  await browser.close();

  // ── Summary ──────────────────────────────────────────────────────────
  tracker.exitWithSummary();
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
