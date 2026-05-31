// Shared numeric constants pulled out of various modules so the magic numbers
// live in one place.

// Visible taskbar height in CSS pixels (matches `.taskbar { height: 30px }`).
export const TASKBAR_HEIGHT_PX = 30;

// Reserve in pixels at the bottom of the viewport that drag movement keeps a
// window above. Slightly larger than TASKBAR_HEIGHT_PX to account for the
// taskbar's top border so the titlebar never tucks under the chrome.
export const TASKBAR_DRAG_RESERVE_PX = 36;

// Minimum visible portion of a window when dragged near a viewport edge.
export const DRAG_MIN_VISIBLE_PX = 60;

// Border applied around `.view` (2px inset on each side). Used when sizing
// embedded apps that report their content size via postMessage.
export const VIEW_BORDER_PX = 4;

// Base z-index for stacked windows; live z-index is BASE + stack position.
export const WINDOW_Z_BASE = 10;

// Target memory amount used by the BIOS POST animation, in KB (256 MB).
export const BOOT_MEMORY_TARGET_KB = 262144;

// Delay before the boot sequence starts after the React shell mounts, in ms.
// Gives the initial paint a beat before the BIOS animation kicks in.
export const BOOT_SEQUENCE_DELAY_MS = 300;

// How long the Internet Explorer window shows its busy/loading indicator
// before clearing it automatically, in ms.
export const IE_LOADING_INDICATOR_MS = 2000;

// Default path proposed in the Notepad "Save As" flow (and the reducer's
// initial save-dialog state). Lives in the sandboxed VirtualFS.
export const DEFAULT_NOTEPAD_SAVE_PATH = '/C:/My Documents/Untitled.txt';

// Taskbar button labels are truncated so they fit the button chrome. When a
// title exceeds the MAX length it is cut to the TRUNCATE length and suffixed
// with an ellipsis. App windows and IE use slightly different budgets.
export const APP_TASK_LABEL_MAX_LEN = 22;
export const APP_TASK_LABEL_TRUNCATE_LEN = 20;
export const IE_TASK_LABEL_MAX_LEN = 30;
export const IE_TASK_LABEL_TRUNCATE_LEN = 28;
