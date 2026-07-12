import { useRef, useSyncExternalStore } from 'react';
import {
  activateExplorerItem,
  getExplorerViewState,
  openExplorerContextMenu,
  openExplorerContextMenuAt,
  subscribeExplorerView,
} from './fs-explorer.jsx';

function useExplorerViewState() {
  return useSyncExternalStore(subscribeExplorerView, getExplorerViewState, getExplorerViewState);
}

// Touch long-press opens the context menu (mobile counterpart of right-click).
const LONG_PRESS_MS = 500;
const TOUCH_MOVE_CANCEL_PX = 10;

function useLongPressContextMenu() {
  const touchStateRef = useRef(null);

  function clearTouchState() {
    const touchState = touchStateRef.current;
    if (!touchState) return;
    clearTimeout(touchState.timer);
    touchStateRef.current = null;
  }

  function onTouchStart(event) {
    clearTouchState();
    if (event.touches.length > 1) return;

    const touch = event.touches[0];
    const itemEl = event.target.closest('.folder-item');
    touchStateRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      path: itemEl ? itemEl.dataset.path || null : null,
      longPressFired: false,
      timer: setTimeout(() => {
        const state = touchStateRef.current;
        if (!state) return;
        state.longPressFired = true;
        openExplorerContextMenuAt(state.x, state.y, state.path);
        if (navigator.vibrate) navigator.vibrate(50);
      }, LONG_PRESS_MS),
    };
  }

  function onTouchMove(event) {
    const touchState = touchStateRef.current;
    if (!touchState) return;
    const touch = event.touches[0];
    const dx = touch.clientX - touchState.x;
    const dy = touch.clientY - touchState.y;
    // Finger moved too far: treat as scroll, not a long-press
    if (Math.hypot(dx, dy) > TOUCH_MOVE_CANCEL_PX) clearTouchState();
  }

  function onTouchEnd(event) {
    const touchState = touchStateRef.current;
    if (!touchState) return;
    clearTouchState();
    // Suppress the synthesized click after a long-press, which would land
    // outside the freshly opened menu and immediately close it.
    if (touchState.longPressFired && event.cancelable) event.preventDefault();
  }

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: clearTouchState,
  };
}

export function MyComputerView() {
  const explorerView = useExplorerViewState();
  const longPressHandlers = useLongPressContextMenu();

  if (!explorerView.items.length) {
    return (
      <div
        className="folder-view explorer-folder-view"
        data-my-computer-view-component="true"
        onContextMenu={openExplorerContextMenu}
        {...longPressHandlers}
      >
        <div className="explorer-empty">This folder is empty.</div>
      </div>
    );
  }

  return (
    <div
      className="folder-view explorer-folder-view"
      data-my-computer-view-component="true"
      onContextMenu={openExplorerContextMenu}
      {...longPressHandlers}
    >
      {explorerView.items.map((item) => (
        <div
          key={item.key}
          className="folder-item"
          data-path={item.path || ''}
          data-type={item.type}
          onDoubleClick={() => activateExplorerItem(item)}
        >
          <div className={`folder-item-icon ${item.icon}`}></div>
          <div>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export function MyComputerStatusLeft() {
  const explorerView = useExplorerViewState();
  return <span className="status-left explorer-status-left">{explorerView.statusText}</span>;
}

export function MyComputerTitleText() {
  const explorerView = useExplorerViewState();
  return <>{explorerView.title}</>;
}
