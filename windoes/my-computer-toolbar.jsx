import { useSyncExternalStore } from 'react';
import {
  goBack,
  goForward,
  goUp,
  getNavigationViewState,
  subscribeNavigationView,
} from './fs-explorer.jsx';

export default function MyComputerToolbar() {
  const navigationViewState = useSyncExternalStore(
    subscribeNavigationView,
    getNavigationViewState,
    getNavigationViewState
  );

  return (
    <>
      <div className="toolbar explorer-toolbar" data-my-computer-component="true">
        <div className="toolbar-grip"></div>
        <button
          className="tb-btn"
          id="explorerBackBtn"
          disabled={!navigationViewState.canGoBack}
          onClick={goBack}
        >
          <span className="tb-icon tb-icon-back"></span>
          Back
        </button>
        <button
          className="tb-btn"
          id="explorerForwardBtn"
          disabled={!navigationViewState.canGoForward}
          onClick={goForward}
        >
          <span className="tb-icon tb-icon-forward"></span>
          Forward
        </button>
        <button className="tb-btn" id="explorerUpBtn" onClick={goUp}>
          <span className="tb-icon tb-icon-up"></span>
          Up
        </button>
        <div className="tb-sep"></div>
        <button className="tb-btn" id="explorerCutBtn" disabled>
          <span className="tb-icon tb-icon-cut"></span>
          Cut
        </button>
        <button className="tb-btn" id="explorerCopyBtn" disabled>
          <span className="tb-icon tb-icon-copy"></span>
          Copy
        </button>
        <button className="tb-btn" id="explorerPasteBtn" disabled>
          <span className="tb-icon tb-icon-paste"></span>
          Paste
        </button>
        <button className="tb-btn" id="explorerUndoBtn" disabled>
          <span className="tb-icon tb-icon-undo"></span>
          Undo
        </button>
      </div>
      <div className="address-row">
        <div className="toolbar-grip"></div>
        <label htmlFor="explorerAddress">Address</label>
        <div className="address-input-wrap">
          <span
            className={`address-icon ${navigationViewState.addressIcon}`}
            aria-hidden="true"
          ></span>
          <input
            id="explorerAddress"
            value={navigationViewState.address}
            aria-label="Address bar"
            readOnly
          />
        </div>
      </div>
    </>
  );
}
