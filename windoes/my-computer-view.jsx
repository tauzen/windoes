import { useSyncExternalStore } from 'react';
import {
  activateExplorerItem,
  getExplorerViewState,
  openExplorerContextMenu,
  subscribeExplorerView,
} from './fs-explorer.jsx';

function useExplorerViewState() {
  return useSyncExternalStore(subscribeExplorerView, getExplorerViewState, getExplorerViewState);
}

export function MyComputerView() {
  const explorerView = useExplorerViewState();

  if (!explorerView.items.length) {
    return (
      <div
        className="folder-view explorer-folder-view"
        data-my-computer-view-component="true"
        onContextMenu={openExplorerContextMenu}
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
