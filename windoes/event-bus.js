import { createListenerSet } from './listener-set.mjs';

export function createEventBus() {
  return createListenerSet();
}
