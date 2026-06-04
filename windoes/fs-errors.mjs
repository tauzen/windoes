// Maps VirtualFS typed errors onto friendly, Windows-98-styled dialog content
// so failed filesystem operations surface through the shared error-dialog UI
// instead of being swallowed by a silent `catch`.
//
// Keyed on `error.name` (the VFS error classes set a stable `name`, and the
// browser's quota failure is a `DOMException` named `QuotaExceededError`) so
// this stays decoupled from the TypeScript VFS module and unit-testable on its
// own.

// Friendly, user-facing explanations per known error name. The raw VFS messages
// are developer-oriented ("No such file or directory: '/C:/...'"); these read
// like something the era's UI would actually say.
const FRIENDLY_BY_NAME = {
  FileNotFoundError: 'The file or folder could not be found. It may have been moved or deleted.',
  FileExistsError: 'A file or folder with that name already exists.',
  NotADirectoryError: 'That path is not a folder.',
  DirectoryNotEmptyError: 'The folder is not empty.',
  PermissionDeniedError: 'This is a protected system item and cannot be changed.',
  QuotaExceededError:
    'There is not enough free space to save this file. Delete some files and try again.',
};

/**
 * Build error-dialog content (`{ title, text, icon }`) describing a failed
 * filesystem operation. Pass an `action` phrase describing what was attempted
 * (e.g. `"delete 'Hello.txt'"`); the typed-error explanation is appended below.
 *
 * @param {unknown} error - The thrown error (ideally a typed VFS error).
 * @param {{ title?: string, action?: string, icon?: string }} [options]
 * @returns {{ title: string, text: string, icon: string }}
 */
export function describeFsError(error, options = {}) {
  const { title = 'Error', action, icon = 'error' } = options;

  const name = error && typeof error === 'object' ? error.name : undefined;
  const detail =
    (name && FRIENDLY_BY_NAME[name]) ||
    (error && error.message) ||
    'An unknown error has occurred.';

  const text = action ? `Cannot ${action}.\n\n${detail}` : detail;

  return { title, text, icon };
}
