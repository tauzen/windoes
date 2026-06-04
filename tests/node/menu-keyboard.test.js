const test = require('node:test');
const assert = require('node:assert/strict');

let modulePromise;
function loadModule() {
  if (!modulePromise) {
    modulePromise = import('../../windoes/shell/menu-keyboard.js');
  }
  return modulePromise;
}

test('ArrowDown/ArrowUp move and wrap within a panel', async () => {
  const { nextRovingIndex } = await loadModule();
  const len = 4;

  assert.equal(nextRovingIndex('ArrowDown', 0, len), 1);
  assert.equal(nextRovingIndex('ArrowDown', len - 1, len), 0, 'wraps to the top');
  assert.equal(nextRovingIndex('ArrowUp', 1, len), 0);
  assert.equal(nextRovingIndex('ArrowUp', 0, len), len - 1, 'wraps to the bottom');
});

test('Arrow keys pick an end when nothing is focused yet (index -1)', async () => {
  const { nextRovingIndex } = await loadModule();

  assert.equal(nextRovingIndex('ArrowDown', -1, 3), 0);
  assert.equal(nextRovingIndex('ArrowUp', -1, 3), 2);
});

test('Home/End jump to the panel ends, other keys do not move focus', async () => {
  const { nextRovingIndex } = await loadModule();

  assert.equal(nextRovingIndex('Home', 2, 4), 0);
  assert.equal(nextRovingIndex('End', 1, 4), 3);
  assert.equal(nextRovingIndex('ArrowRight', 1, 4), null);
  assert.equal(nextRovingIndex('Enter', 1, 4), null);
});

test('returns null for an empty panel', async () => {
  const { nextRovingIndex } = await loadModule();
  assert.equal(nextRovingIndex('ArrowDown', -1, 0), null);
});

test('submenuKeyFromControlsId maps an arrow item back to its submenu key', async () => {
  const { submenuKeyFromControlsId } = await loadModule();

  assert.equal(submenuKeyFromControlsId('programsSubmenu'), 'programs');
  assert.equal(submenuKeyFromControlsId('accessoriesSubmenu'), 'accessories');
  assert.equal(submenuKeyFromControlsId('gamesSubmenu'), 'games');
  assert.equal(submenuKeyFromControlsId('notARealSubmenu'), null);
  assert.equal(submenuKeyFromControlsId(null), null);
});

test('chainForSubmenu opens ancestors; parentChainForSubmenu drops the own key', async () => {
  const { chainForSubmenu, parentChainForSubmenu } = await loadModule();

  assert.deepEqual(chainForSubmenu('programs'), ['programs']);
  assert.deepEqual(chainForSubmenu('accessories'), ['programs', 'accessories']);
  assert.deepEqual(chainForSubmenu('games'), ['programs', 'accessories', 'games']);

  assert.deepEqual(parentChainForSubmenu('programs'), []);
  assert.deepEqual(parentChainForSubmenu('accessories'), ['programs']);
  assert.deepEqual(parentChainForSubmenu('games'), ['programs', 'accessories']);

  assert.equal(chainForSubmenu('mystery'), null);
  assert.equal(parentChainForSubmenu('mystery'), null);
});
