// ─── Custom Errors ───────────────────────────────────────────────────────────

export class FileNotFoundError extends Error {
  constructor(path) {
    super(`No such file or directory: '${path}'`);
    this.name = 'FileNotFoundError';
    this.path = path;
  }
}

export class FileExistsError extends Error {
  constructor(path) {
    super(`File or directory already exists: '${path}'`);
    this.name = 'FileExistsError';
    this.path = path;
  }
}

export class NotADirectoryError extends Error {
  constructor(path) {
    super(`Not a directory: '${path}'`);
    this.name = 'NotADirectoryError';
    this.path = path;
  }
}

export class DirectoryNotEmptyError extends Error {
  constructor(path) {
    super(`Directory not empty: '${path}'`);
    this.name = 'DirectoryNotEmptyError';
    this.path = path;
  }
}

// ─── Path Utilities ──────────────────────────────────────────────────────────

export function normalizePath(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    throw new Error(`Path must be absolute (start with '/'): '${path}'`);
  }

  // Collapse duplicate slashes
  path = path.replace(/\/+/g, '/');

  // Resolve . and ..
  const parts = path.split('/');
  const resolved = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }

  return '/' + resolved.join('/');
}

export function parentPath(path) {
  const norm = normalizePath(path);
  if (norm === '/') return null;
  const idx = norm.lastIndexOf('/');
  return idx === 0 ? '/' : norm.slice(0, idx);
}

export function basename(path) {
  const norm = normalizePath(path);
  if (norm === '/') return '/';
  return norm.slice(norm.lastIndexOf('/') + 1);
}

// ─── IndexedDB Helper ────────────────────────────────────────────────────────

function openDB(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'path' });
      }
      if (!db.objectStoreNames.contains('directories')) {
        db.createObjectStore('directories', { keyPath: 'path' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(db, stores, mode) {
  const transaction = db.transaction(stores, mode);
  const storeMap = {};
  for (const name of stores) {
    storeMap[name] = transaction.objectStore(name);
  }
  return { transaction, stores: storeMap };
}

function req(idbRequest) {
  return new Promise((resolve, reject) => {
    idbRequest.onsuccess = () => resolve(idbRequest.result);
    idbRequest.onerror = () => reject(idbRequest.error);
  });
}

function txDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
  });
}

// ─── VirtualFS ───────────────────────────────────────────────────────────────

export class VirtualFS {
  constructor(dbName = 'virtual-fs') {
    this._dbName = dbName;
    this._db = null;
  }

  _ensureInit() {
    if (!this._db) {
      throw new Error('VirtualFS not initialized. Call init() first.');
    }
  }

  async init() {
    this._db = await openDB(this._dbName);

    // Ensure root directory exists
    const { transaction, stores } = tx(this._db, ['directories'], 'readwrite');
    const existing = await req(stores.directories.get('/'));
    if (!existing) {
      stores.directories.put({ path: '/', createdAt: new Date() });
    }
    await txDone(transaction);

    return this;
  }

  async mkdir(path) {
    this._ensureInit();
    const norm = normalizePath(path);

    const parent = parentPath(norm);

    const { transaction, stores } = tx(this._db, ['directories', 'files'], 'readwrite');

    // Check parent exists
    if (parent !== null) {
      const parentDir = await req(stores.directories.get(parent));
      if (!parentDir) {
        throw new FileNotFoundError(parent);
      }
    }

    // Check not already exists as directory or file
    const existingDir = await req(stores.directories.get(norm));
    if (existingDir) throw new FileExistsError(norm);

    const existingFile = await req(stores.files.get(norm));
    if (existingFile) throw new FileExistsError(norm);

    stores.directories.put({ path: norm, createdAt: new Date() });
    await txDone(transaction);
  }

  async writeFile(path, content) {
    this._ensureInit();
    const norm = normalizePath(path);
    const parent = parentPath(norm);

    const size = content instanceof ArrayBuffer ? content.byteLength : content.length;

    const { transaction, stores } = tx(this._db, ['directories', 'files'], 'readwrite');

    // Parent must exist
    if (parent !== null) {
      const parentDir = await req(stores.directories.get(parent));
      if (!parentDir) throw new FileNotFoundError(parent);
    }

    // Check it's not a directory
    const existingDir = await req(stores.directories.get(norm));
    if (existingDir) throw new NotADirectoryError(norm);

    const now = new Date();
    const existing = await req(stores.files.get(norm));

    const entry = {
      path: norm,
      content,
      size,
      type: 'file',
      createdAt: existing ? existing.createdAt : now,
      modifiedAt: now,
    };

    stores.files.put(entry);
    await txDone(transaction);
  }

  async readFile(path) {
    this._ensureInit();
    const norm = normalizePath(path);

    const { transaction, stores } = tx(this._db, ['files'], 'readonly');
    const file = await req(stores.files.get(norm));
    await txDone(transaction);

    if (!file) throw new FileNotFoundError(norm);
    return file.content;
  }

  async readdir(path) {
    this._ensureInit();
    const norm = normalizePath(path);

    const { transaction, stores } = tx(this._db, ['directories', 'files'], 'readonly');

    // Verify directory exists
    const dir = await req(stores.directories.get(norm));
    if (!dir) throw new FileNotFoundError(norm);

    const prefix = norm === '/' ? '/' : norm + '/';

    const allDirs = await req(stores.directories.getAll());
    const allFiles = await req(stores.files.getAll());
    await txDone(transaction);

    const children = new Set();

    for (const d of allDirs) {
      if (d.path !== norm && d.path.startsWith(prefix)) {
        const rest = d.path.slice(prefix.length);
        if (!rest.includes('/')) {
          children.add(rest);
        }
      }
    }

    for (const f of allFiles) {
      if (f.path.startsWith(prefix)) {
        const rest = f.path.slice(prefix.length);
        if (!rest.includes('/')) {
          children.add(rest);
        }
      }
    }

    return [...children].sort();
  }

  async stat(path) {
    this._ensureInit();
    const norm = normalizePath(path);

    const { transaction, stores } = tx(this._db, ['directories', 'files'], 'readonly');
    const dir = await req(stores.directories.get(norm));
    const file = await req(stores.files.get(norm));
    await txDone(transaction);

    if (dir) {
      return {
        path: norm,
        type: 'directory',
        size: 0,
        createdAt: dir.createdAt,
        modifiedAt: dir.createdAt,
      };
    }
    if (file) {
      return {
        path: norm,
        type: 'file',
        size: file.size,
        createdAt: file.createdAt,
        modifiedAt: file.modifiedAt,
      };
    }

    throw new FileNotFoundError(norm);
  }

  async rm(path, { recursive = false } = {}) {
    this._ensureInit();
    const norm = normalizePath(path);

    if (norm === '/') {
      throw new Error('Cannot delete root directory');
    }

    const { transaction, stores } = tx(this._db, ['directories', 'files'], 'readwrite');

    const dir = await req(stores.directories.get(norm));
    const file = await req(stores.files.get(norm));

    if (!dir && !file) throw new FileNotFoundError(norm);

    if (file) {
      stores.files.delete(norm);
      await txDone(transaction);
      return;
    }

    // It's a directory
    const prefix = norm + '/';
    const allDirs = await req(stores.directories.getAll());
    const allFiles = await req(stores.files.getAll());

    const childDirs = allDirs.filter(d => d.path.startsWith(prefix));
    const childFiles = allFiles.filter(f => f.path.startsWith(prefix));

    if ((childDirs.length > 0 || childFiles.length > 0) && !recursive) {
      throw new DirectoryNotEmptyError(norm);
    }

    // Delete directory and all descendants
    stores.directories.delete(norm);
    for (const d of childDirs) stores.directories.delete(d.path);
    for (const f of childFiles) stores.files.delete(f.path);

    await txDone(transaction);
  }

  async rename(oldPath, newPath) {
    this._ensureInit();
    const oldNorm = normalizePath(oldPath);
    const newNorm = normalizePath(newPath);

    if (oldNorm === '/') throw new Error('Cannot rename root directory');

    const newParent = parentPath(newNorm);

    const { transaction, stores } = tx(this._db, ['directories', 'files'], 'readwrite');

    // New parent must exist
    if (newParent !== null) {
      const parentDir = await req(stores.directories.get(newParent));
      if (!parentDir) throw new FileNotFoundError(newParent);
    }

    // New path must not exist
    const existingDir = await req(stores.directories.get(newNorm));
    const existingFile = await req(stores.files.get(newNorm));
    if (existingDir || existingFile) throw new FileExistsError(newNorm);

    // Check source
    const srcDir = await req(stores.directories.get(oldNorm));
    const srcFile = await req(stores.files.get(oldNorm));
    if (!srcDir && !srcFile) throw new FileNotFoundError(oldNorm);

    if (srcFile) {
      // Simple file rename
      stores.files.delete(oldNorm);
      stores.files.put({ ...srcFile, path: newNorm });
      await txDone(transaction);
      return;
    }

    // Directory rename — move directory + all descendants
    const oldPrefix = oldNorm + '/';
    const allDirs = await req(stores.directories.getAll());
    const allFiles = await req(stores.files.getAll());

    // Delete old directory entry, add new
    stores.directories.delete(oldNorm);
    stores.directories.put({ ...srcDir, path: newNorm });

    // Move descendant directories
    for (const d of allDirs) {
      if (d.path.startsWith(oldPrefix)) {
        stores.directories.delete(d.path);
        stores.directories.put({ ...d, path: newNorm + d.path.slice(oldNorm.length) });
      }
    }

    // Move descendant files
    for (const f of allFiles) {
      if (f.path.startsWith(oldPrefix)) {
        stores.files.delete(f.path);
        stores.files.put({ ...f, path: newNorm + f.path.slice(oldNorm.length) });
      }
    }

    await txDone(transaction);
  }

  async exists(path) {
    this._ensureInit();
    const norm = normalizePath(path);

    const { transaction, stores } = tx(this._db, ['directories', 'files'], 'readonly');
    const dir = await req(stores.directories.get(norm));
    const file = await req(stores.files.get(norm));
    await txDone(transaction);

    return !!(dir || file);
  }
}
