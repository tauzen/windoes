const test = require('node:test');
const assert = require('node:assert/strict');

let configModulePromise;
function loadConfig() {
  if (!configModulePromise) {
    configModulePromise = import('../../windoes/shell/start-menu-config.js');
  }
  return configModulePromise;
}

test('every menu item has a unique DOM id', async () => {
  const { ROOT_ITEMS, SUBMENUS } = await loadConfig();
  const ids = [];
  const collect = (items) => {
    for (const item of items) {
      if (item.separator) continue;
      ids.push(item.id);
    }
  };
  collect(ROOT_ITEMS);
  for (const submenu of SUBMENUS) collect(submenu.items);

  assert.equal(new Set(ids).size, ids.length, `duplicate menu ids: ${ids.join(', ')}`);
  // Ids the integration tests hover/click must keep existing.
  for (const id of ['menuPrograms', 'subGames', 'subPaint']) {
    assert.ok(ids.includes(id), `expected menu id "${id}" to exist`);
  }
});

test('non-separator items are an action XOR a submenu, with icon + label', async () => {
  const { ROOT_ITEMS, SUBMENUS } = await loadConfig();
  const allItems = [...ROOT_ITEMS, ...SUBMENUS.flatMap((s) => s.items)];
  for (const item of allItems) {
    if (item.separator) continue;
    assert.ok(item.icon, `item ${item.id} missing icon`);
    assert.ok(item.label, `item ${item.id} missing label`);
    const hasAction = Boolean(item.action);
    const hasSubmenu = Boolean(item.submenu);
    assert.ok(hasAction !== hasSubmenu, `item ${item.id} must be action XOR submenu`);
  }
});

test('arrow items reference a real child submenu that points back', async () => {
  const { ROOT_ITEMS, SUBMENUS } = await loadConfig();
  const byKey = new Map(SUBMENUS.map((s) => [s.key, s]));

  // Root "Programs" arrow opens the programs submenu.
  const programsArrow = ROOT_ITEMS.find((i) => i.submenu);
  assert.ok(byKey.has(programsArrow.submenu), 'root arrow must open a known submenu');

  for (const submenu of SUBMENUS) {
    const arrow = submenu.items.find((i) => i.submenu);
    if (submenu.childKey) {
      assert.ok(arrow, `submenu ${submenu.key} declares childKey but has no arrow item`);
      assert.equal(arrow.submenu, submenu.childKey, `arrow in ${submenu.key} must open childKey`);
      const child = byKey.get(submenu.childKey);
      assert.ok(child, `childKey ${submenu.childKey} must exist`);
      assert.equal(child.parentKey, submenu.key, `${child.key} parentKey must point back`);
    } else {
      assert.equal(arrow, undefined, `leaf submenu ${submenu.key} must not contain an arrow`);
    }
  }
});

test('each chain ends with its own key and extends its parent chain', async () => {
  const { SUBMENUS } = await loadConfig();
  const byKey = new Map(SUBMENUS.map((s) => [s.key, s]));

  for (const submenu of SUBMENUS) {
    assert.equal(
      submenu.chain[submenu.chain.length - 1],
      submenu.key,
      `chain for ${submenu.key} must end with its own key`
    );
    const parentChain = submenu.parentKey ? byKey.get(submenu.parentKey).chain : [];
    // Dropping the last element yields exactly the parent's chain — this is the
    // invariant the unified hover/leave logic relies on.
    assert.deepEqual(
      submenu.chain.slice(0, -1),
      parentChain,
      `chain for ${submenu.key} must extend its parent's chain`
    );
  }
});
