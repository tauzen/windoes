---
opened: 2026-11-27
---

# F008 · Taskbar buttons have a right-click menu with Close

## Outcome

In Windows 98, right-clicking a taskbar button opens a menu with Restore, Minimize, Maximize and Close. Windoes has no such menu. Since Winamp draws its own title bar, a Winamp page that fails to load leaves a window with no close control until the page reloads. After this, every window can be closed from its taskbar button.

## Scope

- Start at the taskbar button component in `windoes/shell/` and the window manager's minimize, restore and close calls.
- Restore, Minimize, Maximize and Close, each disabled when it does not apply, in the shell's existing menu style.
- Keyboard: the menu key or Shift+F10 on a focused taskbar button opens it.

## Out of scope

- The desktop or Start menu right-click menus.
- Window title-bar system menus.

## Acceptance

- Right-clicking a taskbar button opens the menu at the pointer.
- Close closes the window, including Winamp with its page replaced by `about:blank`.
- Minimize and Restore match the taskbar button's state; items that do not apply are disabled.
- Escape or a click elsewhere closes the menu.
