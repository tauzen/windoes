// Saved state for an app that may run inside the Windoes shell.
//
// The shell frames every app in an opaque-origin sandbox, where localStorage
// throws. A framed app therefore asks the shell to load or save its saved
// state over postMessage; the shell keeps it in its own localStorage under
// the same key. An app opened on its own (top level, as the app suites do)
// uses its own localStorage directly.
//
// Each app has exactly one key, and the shell answers only for the key of the
// app it loaded into the frame.
(function () {
  var framed = window.self !== window.top;
  var REPLY_TIMEOUT_MS = 5000;
  var nextRequestId = 0;

  function askShell(type, payload) {
    return new Promise(function (resolve, reject) {
      var requestId = 'app-storage-' + ++nextRequestId;
      var timer = setTimeout(function () {
        window.removeEventListener('message', onMessage);
        reject(new Error('The shell did not answer the ' + type + ' request.'));
      }, REPLY_TIMEOUT_MS);

      function onMessage(event) {
        if (event.source !== window.parent || !event.data) return;
        if (event.data.type !== type + '-result' || event.data.requestId !== requestId) return;
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        if (event.data.ok) resolve(event.data);
        else reject(new Error(event.data.error || type + ' failed'));
      }

      window.addEventListener('message', onMessage);
      // An opaque-origin document still has the shell's URL, so this targets
      // the shell's origin and the state never goes to another embedder.
      window.parent.postMessage(
        Object.assign({ type: type, requestId: requestId }, payload),
        window.location.origin
      );
    });
  }

  window.WindoesAppStorage = {
    /**
     * @param {string} key
     * @returns {Promise<string | null>}
     */
    load: function (key) {
      if (!framed) {
        return new Promise(function (resolve) {
          resolve(window.localStorage.getItem(key));
        });
      }
      return askShell('app-storage-load', { key: key }).then(function (reply) {
        return typeof reply.value === 'string' ? reply.value : null;
      });
    },
    /**
     * @param {string} key
     * @param {string} value
     * @returns {Promise<void>}
     */
    save: function (key, value) {
      if (!framed) {
        return new Promise(function (resolve) {
          window.localStorage.setItem(key, value);
          resolve();
        });
      }
      return askShell('app-storage-save', { key: key, value: value }).then(function () {});
    },
  };
})();
