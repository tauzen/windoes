import { useSyncExternalStore } from 'react';
import { goBack, goUp, getNavigationViewState, subscribeNavigationView } from './fs-explorer.jsx';

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
        <button className="tb-btn" id="explorerUpBtn" onClick={goUp}>
          <span className="tb-icon tb-icon-up"></span>
          Up
        </button>
      </div>
      <div className="address-row">
        <div className="toolbar-grip"></div>
        <label htmlFor="explorerAddress">Address</label>
        <div className="address-input-wrap">
          <span className="address-icon address-icon-folder" aria-hidden="true"></span>
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
