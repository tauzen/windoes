const test = require('node:test');
const assert = require('node:assert/strict');

let navigationModulePromise;
function loadNavigationModule() {
  if (!navigationModulePromise) {
    navigationModulePromise = import('../../windoes/explorer-navigation.mjs');
  }
  return navigationModulePromise;
}

test('explorer navigation tracks history and back state', async () => {
  const { createExplorerNavigation } = await loadNavigationModule();
  const nav = createExplorerNavigation();

  nav.navigateTo(null);
  nav.navigateTo('/C:');

  const stateBeforeBack = nav.getState();
  assert.equal(stateBeforeBack.path, '/C:');
  assert.equal(stateBeforeBack.canGoBack, true);

  nav.goBack();

  const stateAfterBack = nav.getState();
  assert.equal(stateAfterBack.path, null);
  assert.equal(stateAfterBack.canGoBack, false);
});

test('explorer navigation trims forward history on fresh navigation', async () => {
  const { createExplorerNavigation } = await loadNavigationModule();
  const nav = createExplorerNavigation();

  nav.navigateTo(null);
  nav.navigateTo('/C:');
  nav.navigateTo('/C:/My Documents');
  nav.goBack();
  nav.navigateTo('/C:/Windows');

  const state = nav.getState();
  assert.equal(state.path, '/C:/Windows');

  nav.goBack();
  assert.equal(nav.getState().path, '/C:');
});

test('explorer navigation reset clears stale history', async () => {
  const { createExplorerNavigation } = await loadNavigationModule();
  const nav = createExplorerNavigation();

  nav.navigateTo(null);
  nav.navigateTo('/C:');

  nav.reset();
  nav.navigateTo(null);

  const state = nav.getState();
  assert.equal(state.path, null);
  assert.equal(state.canGoBack, false);
});

test('explorer navigation goUp returns parent and then My Computer root', async () => {
  const { createExplorerNavigation } = await loadNavigationModule();
  const nav = createExplorerNavigation();

  nav.navigateTo('/C:/My Documents');
  nav.goUp();
  assert.equal(nav.getState().path, '/C:');

  nav.goUp();
  assert.equal(nav.getState().path, null);
});
