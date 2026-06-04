// Single-flight async memoizer for one-time initialization (e.g. opening the
// VirtualFS). The wrapped function runs at most once; concurrent and later
// callers share the same in-flight promise instead of kicking off duplicate
// work. If the function rejects, the cached promise is cleared so the next
// call retries — matching the retry-on-failure behavior the FS-init guards
// scattered across the shell used to implement with module-level `let` flags.

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {() => Promise<T>}
 */
export function once(fn) {
  /** @type {Promise<T> | null} */
  let pending = null;

  return function run() {
    if (!pending) {
      // Invoke eagerly so the work starts immediately (matching the original
      // FS-init guards); `Promise.resolve` normalizes the return value.
      pending = Promise.resolve(fn()).catch((error) => {
        pending = null;
        throw error;
      });
    }
    return pending;
  };
}
