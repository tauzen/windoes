import React, { useSyncExternalStore } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { createListenerSet } from './listener-set.mjs';

const renderRegistry = new Map();
const listenerSet = createListenerSet();
const containerKeys = new WeakMap();
let nextKey = 1;
let version = 0;
let snapshot = { version: 0, entries: [] };

function rebuildSnapshot() {
  snapshot = {
    version,
    entries: Array.from(renderRegistry.entries()).filter(([container]) => !!container),
  };
}

function emit() {
  version += 1;
  rebuildSnapshot();
  listenerSet.emit();
}

function subscribe(listener) {
  return listenerSet.subscribe(listener);
}

function getSnapshot() {
  return snapshot;
}

export function renderInto(container, node) {
  if (!container) return;
  renderRegistry.set(container, node);
  emit();
}

export function renderIntoSync(container, node) {
  if (!container) return;
  renderRegistry.set(container, node);
  flushSync(() => {
    emit();
  });
}

export function unmountFrom(container) {
  if (!container) return;
  if (renderRegistry.delete(container)) {
    emit();
  }
}

export function unmountFromSync(container) {
  if (!container) return;
  if (renderRegistry.delete(container)) {
    flushSync(() => {
      emit();
    });
  }
}

export function RenderRegistryPortals() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return snapshot.entries.map(([container, node]) =>
    React.createElement(PortalTarget, { key: getContainerKey(container), container, node })
  );
}

function getContainerKey(container) {
  if (!containerKeys.has(container)) {
    containerKeys.set(container, `portal-${nextKey++}`);
  }
  return containerKeys.get(container);
}

function PortalTarget({ container, node }) {
  return createPortal(node, container);
}
