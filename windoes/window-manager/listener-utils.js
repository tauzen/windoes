import WindoesApp from '../app-state.js';
import { makeDraggable } from '../dragging.js';

export function trackListener(cleanups, element, eventName, handler, options) {
  if (!element) return;
  element.addEventListener(eventName, handler, options);
  cleanups.push(() => {
    element.removeEventListener(eventName, handler, options);
  });
}

export function runCleanupFns(cleanups) {
  if (!Array.isArray(cleanups)) return;
  for (const cleanup of cleanups) {
    cleanup();
  }
}

export function setupRegistrationListeners(manager, id, config, cleanups) {
  const onWindowMouseDown = () => manager.bringToFront(id);
  manager._trackListener(cleanups, config.el, 'mousedown', onWindowMouseDown);

  if (config.template && config.template.closeBtnId) {
    const closeBtn = config.el.querySelector('#' + config.template.closeBtnId);
    const onCloseClick = () => manager.close(id);
    manager._trackListener(cleanups, closeBtn, 'click', onCloseClick);
  }

  if (config.template && config.template.minimizeBtnId) {
    const minBtn = config.el.querySelector('#' + config.template.minimizeBtnId);
    const onMinClick = () => manager.minimize(id);
    manager._trackListener(cleanups, minBtn, 'click', onMinClick);
  }

  if (config.template && (config.template.maximizeBtnId || config.template.maximizeBtn)) {
    const maxBtn = config.el.querySelector('.ctrl-max');
    const onMaxClick = () => {
      WindoesApp.events.windowInteraction.emit({ type: 'TOGGLE_MAXIMIZE', id });
    };
    manager._trackListener(cleanups, maxBtn, 'click', onMaxClick);
  }

  if (config.taskBtn) {
    const onTaskbarClick = () => manager.toggleFromTaskbar(id);
    manager._trackListener(cleanups, config.taskBtn, 'click', onTaskbarClick);
  }

  if (config.draggable !== false) {
    const titlebar =
      config.template && config.template.titlebarId
        ? config.el.querySelector('#' + config.template.titlebarId)
        : config.el.querySelector('.titlebar');
    if (titlebar) {
      const disposeDrag = makeDraggable(titlebar, config.el);
      if (typeof disposeDrag === 'function') cleanups.push(disposeDrag);

      if (config.template && (config.template.maximizeBtnId || config.template.maximizeBtn)) {
        const onTitlebarDoubleClick = (e) => {
          if (e.target.classList.contains('ctrl-btn')) return;
          WindoesApp.events.windowInteraction.emit({ type: 'TOGGLE_MAXIMIZE', id });
        };
        manager._trackListener(cleanups, titlebar, 'dblclick', onTitlebarDoubleClick);
      }
    }
  }

  if (config.setup) {
    const customCleanup = config.setup(config);
    if (typeof customCleanup === 'function') cleanups.push(customCleanup);
  }
}
