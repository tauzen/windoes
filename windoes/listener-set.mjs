/** @typedef {(payload: unknown) => void} Listener */

export function createListenerSet() {
  /** @type {Set<Listener>} */
  const listeners = new Set();

  return {
    /** @param {unknown} payload */
    emit(payload) {
      listeners.forEach((listener) => listener(payload));
    },
    /** @param {Listener} listener */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
