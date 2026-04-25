import { createListenerSet } from './listener-set.mjs';

function createExplorerNavigation() {
  let currentPath = null;
  let historyStack = [];
  let historyIndex = -1;
  const listenerSet = createListenerSet();

  function emitChange() {
    listenerSet.emit();
  }

  function navigateTo(path, addToHistory = true) {
    if (addToHistory) {
      if (historyIndex < historyStack.length - 1) {
        historyStack = historyStack.slice(0, historyIndex + 1);
      }
      historyStack.push(path);
      historyIndex = historyStack.length - 1;
    }

    currentPath = path;
    emitChange();
    return currentPath;
  }

  function goBack() {
    if (historyIndex <= 0) return currentPath;

    historyIndex -= 1;
    currentPath = historyStack[historyIndex];
    emitChange();
    return currentPath;
  }

  function goUp() {
    if (currentPath === null) return currentPath;

    const slashCount = (currentPath.match(/\//g) || []).length;
    if (slashCount <= 1) {
      return navigateTo(null);
    }

    const parent = currentPath.slice(0, currentPath.lastIndexOf('/'));
    return navigateTo(parent || '/');
  }

  function reset() {
    currentPath = null;
    historyStack = [];
    historyIndex = -1;
    emitChange();
  }

  function getState() {
    return {
      path: currentPath,
      canGoBack: historyIndex > 0,
    };
  }

  function subscribe(listener) {
    return listenerSet.subscribe(listener);
  }

  return {
    navigateTo,
    goBack,
    goUp,
    reset,
    getState,
    subscribe,
  };
}

export { createExplorerNavigation };
