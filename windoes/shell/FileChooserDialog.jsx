// ══════════════════════════════════════════════
// File Chooser Dialog — shared Open / Save As dialog
// ══════════════════════════════════════════════
//
// A reusable Win32-style file dialog backed by the VirtualFS. It is driven
// imperatively through `WindoesApp.fileChooser.open(options)`, which returns a
// Promise resolving to the chosen absolute path (or `null` when cancelled),
// mirroring the one-shot resolver pattern used by the other shell dialogs.
//
// Used by Notepad (Open / Save As) and Paint (via the iframe message bridge in
// app-windows.jsx). The Save flavour lets the user browse folders, type a file
// name at a chosen location, and create new folders.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WindoesApp from '../app-state.js';
import { VirtualFS, basename, normalizePath, parentPath } from '../virtual-fs.js';
import { once } from '../once.mjs';
import { describeFsError } from '../fs-errors.mjs';
import { useDialogFocus } from './dialog-focus.js';

// Top of the navigable tree. The VirtualFS root ('/') only holds the C: drive,
// so clamping here keeps the dialog inside the user-visible disk.
const FILE_CHOOSER_ROOT = '/C:';
const DEFAULT_DIR = '/C:/My Documents';

const fs = new VirtualFS();

// Shared with the explorer/paint stores via the same IndexedDB database, so the
// shipped folders are guaranteed to exist before the dialog lists them.
const ensureFs = once(async () => {
  await fs.init();
  for (const dir of [FILE_CHOOSER_ROOT, DEFAULT_DIR]) {
    if (!(await fs.exists(dir))) {
      await fs.mkdir(dir);
    }
  }
});

// '/C:/My Documents' → 'C:\My Documents', matching the explorer address bar.
function displayDir(path) {
  return path.replace(/^\//, '').replace(/\//g, '\\') || 'C:';
}

const DEFAULT_CONFIG = {
  mode: 'save',
  title: 'Save As',
  confirmLabel: 'Save',
  extensions: [],
  defaultExtension: '',
  allowCreateFolder: true,
};

export default function FileChooserDialog() {
  const dialogRef = useRef(null);
  const nameInputRef = useRef(null);
  const newFolderInputRef = useRef(null);
  const resolverRef = useRef(null);
  const overwriteBoxRef = useRef(null);
  const replaceButtonRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [currentDir, setCurrentDir] = useState(DEFAULT_DIR);
  const [entries, setEntries] = useState([]);
  const [fileName, setFileName] = useState('');
  const [selectedName, setSelectedName] = useState(null);
  const [errorText, setErrorText] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  // When saving over an existing file, holds the target path awaiting the
  // user's confirmation in the "replace existing file?" sub-dialog.
  const [overwriteTarget, setOverwriteTarget] = useState(null);

  // Refresh the folder listing whenever the dialog opens or the directory
  // changes. A failed read (e.g. a stale starting path) falls back to the root.
  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;
    (async () => {
      try {
        await ensureFs();
        const all = await fs.readdir(currentDir);
        if (!cancelled) setEntries(all);
      } catch {
        if (cancelled) return;
        if (currentDir !== FILE_CHOOSER_ROOT) {
          setCurrentDir(FILE_CHOOSER_ROOT);
        } else {
          setEntries([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentDir, refreshKey]);

  const resolveWith = useCallback((result) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    if (resolve) resolve(result ?? null);
  }, []);

  const close = useCallback(
    (result) => {
      setIsOpen(false);
      setCreatingFolder(false);
      setOverwriteTarget(null);
      resolveWith(result ?? null);
    },
    [resolveWith]
  );

  // Imperative entry point exposed on the shared namespace. Only touches stable
  // setters/refs so it is safe to register once.
  const open = useCallback(
    (options = {}) => {
      // Abandon any dialog that was already awaiting a choice.
      resolveWith(null);

      const mode = options.mode === 'open' ? 'open' : 'save';
      const extensions = (options.extensions || []).map((ext) => ext.toLowerCase());

      let dir = DEFAULT_DIR;
      let name = '';
      if (options.startPath) {
        try {
          const norm = normalizePath(options.startPath);
          const base = basename(norm);
          // A name with an extension is treated as a file suggestion; otherwise the
          // path is taken to be the directory to open in.
          if (base && base.includes('.')) {
            dir = parentPath(norm) || FILE_CHOOSER_ROOT;
            name = base;
          } else {
            dir = norm;
          }
        } catch {
          dir = DEFAULT_DIR;
        }
      }

      setConfig({
        mode,
        title: options.title || (mode === 'open' ? 'Open' : 'Save As'),
        confirmLabel: options.confirmLabel || (mode === 'open' ? 'Open' : 'Save'),
        extensions,
        defaultExtension: (options.defaultExtension || '').toLowerCase(),
        allowCreateFolder:
          options.allowCreateFolder === undefined ? mode === 'save' : !!options.allowCreateFolder,
      });
      setCurrentDir(dir);
      setFileName(name);
      setSelectedName(null);
      setErrorText('');
      setCreatingFolder(false);
      setNewFolderName('');
      setOverwriteTarget(null);
      setIsOpen(true);
      setRefreshKey((key) => key + 1);

      return new Promise((resolve) => {
        resolverRef.current = resolve;
      });
    },
    [resolveWith]
  );

  useEffect(() => {
    WindoesApp.fileChooser.open = open;
    return () => {
      if (WindoesApp.fileChooser.open === open) delete WindoesApp.fileChooser.open;
    };
  }, [open]);

  // Memoized so `useDialogFocus` only re-runs when the dialog opens/closes;
  // an inline callback would re-run the effect on every render and yank focus
  // back to the name input (e.g. while editing a new folder name).
  const handleInitialFocus = useCallback((el) => {
    if (typeof el.select === 'function') el.select();
  }, []);

  useDialogFocus({
    isOpen,
    dialogRef,
    initialFocusRef: nameInputRef,
    onInitialFocus: handleInitialFocus,
  });

  // The overwrite confirmation sits on top of the chooser; trap focus there
  // while it is shown so Tab/Escape stay within the prompt.
  useDialogFocus({
    isOpen: overwriteTarget !== null,
    dialogRef: overwriteBoxRef,
    initialFocusRef: replaceButtonRef,
  });

  // Focus the inline new-folder field as soon as it appears.
  useEffect(() => {
    if (creatingFolder && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
      newFolderInputRef.current.select();
    }
  }, [creatingFolder]);

  const matchesFilter = useCallback(
    (name) => {
      if (config.extensions.length === 0) return true;
      const lower = name.toLowerCase();
      return config.extensions.some((ext) => lower.endsWith(ext));
    },
    [config.extensions]
  );

  // Directories first, then files matching the active type filter.
  const visibleItems = useMemo(() => {
    const dirs = entries.filter((entry) => entry.type === 'directory');
    const files = entries.filter((entry) => entry.type === 'file' && matchesFilter(entry.name));
    return [...dirs, ...files];
  }, [entries, matchesFilter]);

  const filterLabel = useMemo(() => {
    if (config.extensions.length === 0) return 'All Files (*.*)';
    return config.extensions.map((ext) => `*${ext}`).join(', ');
  }, [config.extensions]);

  function navigateTo(dir) {
    setCurrentDir(dir);
    setSelectedName(null);
    setErrorText('');
    setCreatingFolder(false);
  }

  function goUp() {
    if (currentDir === FILE_CHOOSER_ROOT) return;
    navigateTo(parentPath(currentDir) || FILE_CHOOSER_ROOT);
  }

  function selectItem(item) {
    setSelectedName(item.name);
    setErrorText('');
    if (item.type === 'file') {
      setFileName(item.name);
    }
  }

  function activateItem(item) {
    if (item.type === 'directory') {
      navigateTo(normalizePath(`${currentDir}/${item.name}`));
      return;
    }
    // Double-clicking a file confirms the choice immediately.
    setFileName(item.name);
    confirmChoice(item.name);
  }

  function resolveTargetPath(rawName) {
    const raw = (rawName ?? fileName).trim();
    if (!raw) return { error: 'Please enter a file name.' };
    try {
      const target = raw.startsWith('/')
        ? normalizePath(raw)
        : normalizePath(`${currentDir}/${raw}`);
      return { target };
    } catch {
      return { error: 'That file name is not valid.' };
    }
  }

  async function confirmChoice(rawName) {
    const { target, error } = resolveTargetPath(rawName);
    if (error) {
      setErrorText(error);
      return;
    }

    try {
      await ensureFs();

      // If the entered name resolves to an existing folder, browse into it
      // instead of treating it as the file to open/save.
      try {
        const stat = await fs.stat(target);
        if (stat.type === 'directory') {
          navigateTo(target);
          setFileName('');
          return;
        }
      } catch {
        // Not an existing entry — fine for Save, validated below for Open.
      }

      let finalPath = target;
      if (
        config.defaultExtension &&
        !basename(finalPath).toLowerCase().endsWith(config.defaultExtension)
      ) {
        finalPath += config.defaultExtension;
      }

      if (config.mode === 'open') {
        if (!(await fs.exists(finalPath))) {
          setErrorText('File not found. Check the name and try again.');
          return;
        }
        close(finalPath);
        return;
      }

      // Save: the destination folder must exist (it always will when browsing,
      // but a hand-typed path could point somewhere that does not).
      const parent = parentPath(finalPath);
      if (parent && !(await fs.exists(parent))) {
        setErrorText('That folder does not exist.');
        return;
      }

      // Saving over an existing file is destructive, so confirm the overwrite
      // before resolving with the chosen path.
      if (await fs.exists(finalPath)) {
        setOverwriteTarget(finalPath);
        return;
      }

      close(finalPath);
    } catch (e) {
      setErrorText(describeFsError(e).text);
    }
  }

  function confirmOverwrite() {
    const target = overwriteTarget;
    setOverwriteTarget(null);
    if (target) close(target);
  }

  function cancelOverwrite() {
    setOverwriteTarget(null);
  }

  async function submitNewFolder() {
    const name = newFolderName.trim();
    if (!name) {
      setCreatingFolder(false);
      setNewFolderName('');
      return;
    }
    try {
      await ensureFs();
      await fs.mkdir(normalizePath(`${currentDir}/${name}`));
      WindoesApp.sound.playClickSound?.();
      setCreatingFolder(false);
      setNewFolderName('');
      setSelectedName(name);
      setRefreshKey((key) => key + 1);
    } catch (e) {
      const friendly =
        e && e.name === 'FileExistsError'
          ? 'A folder with that name already exists.'
          : describeFsError(e).text;
      setErrorText(friendly);
    }
  }

  return (
    <>
      <div
        className={`dialog-overlay file-chooser-dialog${isOpen ? ' active' : ''}`}
        id="fileChooserDialog"
      >
        <div ref={dialogRef} className="dialog-box file-chooser-box">
          <div className="dialog-titlebar">
            <span>{config.title}</span>
            <button
              className="ctrl-btn"
              id="fileChooserCloseBtn"
              aria-label="Close"
              onClick={() => close(null)}
            >
              ×
            </button>
          </div>

          <div className="file-chooser-toolbar">
            <label className="file-chooser-look-label" htmlFor="fileChooserList">
              Look in:
            </label>
            <span className="file-chooser-location" id="fileChooserLocation">
              {displayDir(currentDir)}
            </span>
            <button
              type="button"
              id="fileChooserUpBtn"
              className="file-chooser-tool-btn"
              title="Up One Level"
              aria-label="Up One Level"
              onClick={goUp}
              disabled={currentDir === FILE_CHOOSER_ROOT}
            >
              <span className="file-chooser-tool-icon fc-icon-up" aria-hidden={true}></span>
            </button>
            {config.allowCreateFolder && (
              <button
                type="button"
                id="fileChooserNewFolderBtn"
                className="file-chooser-tool-btn"
                title="Create New Folder"
                aria-label="Create New Folder"
                onClick={() => {
                  setErrorText('');
                  setNewFolderName('New Folder');
                  setCreatingFolder(true);
                }}
              >
                <span
                  className="file-chooser-tool-icon fc-icon-newfolder"
                  aria-hidden={true}
                ></span>
              </button>
            )}
          </div>

          <div className="file-chooser-list" id="fileChooserList" role="listbox">
            {creatingFolder && (
              <div className="file-chooser-item file-chooser-new-folder">
                <span className="file-chooser-item-icon is-dir" aria-hidden={true}></span>
                <input
                  ref={newFolderInputRef}
                  type="text"
                  id="fileChooserNewFolderInput"
                  aria-label="New folder name"
                  className="file-chooser-new-folder-input"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={submitNewFolder}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submitNewFolder();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setCreatingFolder(false);
                      setNewFolderName('');
                    }
                  }}
                />
              </div>
            )}

            {visibleItems.length === 0 && !creatingFolder ? (
              <div className="file-chooser-empty">This folder is empty.</div>
            ) : (
              visibleItems.map((item) => (
                <div
                  key={`${item.type}:${item.name}`}
                  className={`file-chooser-item${selectedName === item.name ? ' selected' : ''}`}
                  role="option"
                  aria-selected={selectedName === item.name}
                  data-name={item.name}
                  data-type={item.type}
                  onClick={() => selectItem(item)}
                  onDoubleClick={() => activateItem(item)}
                >
                  <span
                    className={`file-chooser-item-icon ${
                      item.type === 'directory' ? 'is-dir' : 'is-file'
                    }`}
                    aria-hidden={true}
                  ></span>
                  <span className="file-chooser-item-label">{item.name}</span>
                </div>
              ))
            )}
          </div>

          <div className="file-chooser-fields">
            <div className="file-chooser-row">
              <label htmlFor="fileChooserNameInput">File name:</label>
              <input
                ref={nameInputRef}
                type="text"
                id="fileChooserNameInput"
                aria-label="File name"
                value={fileName}
                onChange={(e) => {
                  setFileName(e.target.value);
                  setErrorText('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmChoice();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    close(null);
                  }
                }}
              />
              <button
                type="button"
                className="dialog-btn"
                id="fileChooserConfirmBtn"
                onClick={() => confirmChoice()}
              >
                {config.confirmLabel}
              </button>
            </div>
            <div className="file-chooser-row">
              <label htmlFor="fileChooserFileType">Files of type:</label>
              <span className="file-chooser-filetype" id="fileChooserFileType">
                {filterLabel}
              </span>
              <button
                type="button"
                className="dialog-btn"
                id="fileChooserCancelBtn"
                onClick={() => close(null)}
              >
                Cancel
              </button>
            </div>
            {errorText && (
              <div className="file-chooser-error" id="fileChooserError" role="alert">
                {errorText}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`dialog-overlay file-chooser-overwrite-overlay${
          overwriteTarget !== null ? ' active' : ''
        }`}
        id="fileChooserOverwriteDialog"
      >
        <div
          ref={overwriteBoxRef}
          className="dialog-box"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              cancelOverwrite();
            }
          }}
        >
          <div className="dialog-titlebar">
            <span>{config.confirmLabel}</span>
            <button
              className="ctrl-btn"
              id="fileChooserOverwriteCloseBtn"
              aria-label="Close"
              onClick={cancelOverwrite}
            >
              ×
            </button>
          </div>
          <div className="dialog-body">
            <div className="dialog-icon dialog-icon-warning" aria-hidden={true}></div>
            <div className="dialog-text" id="fileChooserOverwriteText">
              {overwriteTarget ? basename(overwriteTarget) : ''} already exists.
              <br />
              Do you want to replace it?
            </div>
          </div>
          <div className="dialog-buttons">
            <button
              ref={replaceButtonRef}
              className="dialog-btn"
              id="fileChooserReplaceBtn"
              onClick={confirmOverwrite}
            >
              Replace
            </button>
            <button
              className="dialog-btn"
              id="fileChooserOverwriteCancelBtn"
              onClick={cancelOverwrite}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
