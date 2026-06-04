# Windoes Exploratory Testing Plan

**Goal:** Provide a repeatable manual exploratory testing plan for Windoes so each scenario can be assigned and executed as an independent QA task.

**Scope:** Browser-based manual testing of the Windoes desktop simulator, shell interactions, bundled system windows, and bundled applications.

**Primary test target:** Fresh checkout of `main`, run locally with `npm run dev -- --host 0.0.0.0`, then open `http://127.0.0.1:5173/windoes/`.

**Evidence expectation:** For every issue, capture the URL, steps to reproduce, expected behavior, actual behavior, browser console output, and a screenshot or short screen recording where useful.

---

## General Test Setup

Use this setup before executing any scenario below.

1. Start from a fresh checkout of `main`.
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev -- --host 0.0.0.0`.
4. Navigate to `http://127.0.0.1:5173/windoes/`.
5. Wait for boot to complete and confirm the desktop is visible.
6. Open browser devtools or use browser automation console capture.
7. Check console output after every navigation and after each meaningful interaction.

Record:

- Git commit SHA under test
- Browser and viewport size
- Any console warnings or errors
- Whether local storage/session state was clean or reused

---

## Scenario 1: Boot Flow and Desktop Baseline

**Objective:** Confirm the simulator boots cleanly into a usable desktop.

**Areas covered:** BIOS screen, boot transition, desktop icons, wallpaper, taskbar, clock, quick launch, volume button.

**Steps:**

1. Load `/windoes/` from a clean browser session.
2. Observe BIOS/boot text and loading screens until the desktop appears.
3. Confirm desktop icons render with labels and expected spacing.
4. Confirm the taskbar renders at the bottom with Start, quick launch buttons, open-window area, volume, and clock.
5. Click empty desktop space and verify no unexpected windows or menus appear.
6. Check browser console.

**Expected result:** Desktop becomes interactive without JavaScript errors, broken images, or layout corruption.

**Exploration ideas:**

- Reload during boot.
- Reload after the desktop appears.
- Test at smaller/larger viewport sizes.
- Confirm boot text does not get stuck or overlap the final desktop.

---

## Scenario 2: Start Menu Navigation

**Objective:** Verify Start menu interactions and nested program navigation.

**Areas covered:** Start button, Start menu, Programs submenu, Accessories submenu, Games submenu, menu dismissal.

**Steps:**

1. Click Start.
2. Verify menu items: Windoes Update, Programs, Help, Run, Shut Down.
3. Open Programs.
4. Verify program items: Accessories, Internet Explorer, MS-DOS Prompt, Outlook Express, Windoes Explorer.
5. Open Accessories.
6. Verify accessory items: Games, Calculator, Imaging, Notepad, Paint, WordPad.
7. Open Games if available and verify game items.
8. Click outside the menu and confirm all menus close.
9. Repeat with keyboard navigation where possible.
10. Check browser console.

**Expected result:** Menus open, nest, and dismiss predictably without accidental item activation or stale submenu state.

**Exploration ideas:**

- Rapidly open/close Start.
- Switch between sibling submenu items.
- Click a menu item while another window overlaps the menu.
- Verify expanded/collapsed accessibility state is meaningful.

---

## Scenario 3: Window Lifecycle and Taskbar Behavior

**Objective:** Verify windows can be opened, focused, minimized, restored, maximized, and closed consistently.

**Areas covered:** Window chrome, title bars, focus order, taskbar buttons, minimize/maximize/close controls.

**Steps:**

1. Open at least three windows, for example Notepad, Internet Explorer, and My Computer.
2. Confirm each window gets a taskbar button.
3. Click between windows and verify focus/stacking updates visually.
4. Minimize each window and restore it from the taskbar.
5. Maximize and restore each window.
6. Close each window and verify its taskbar button disappears.
7. Check browser console after each lifecycle operation.

**Expected result:** Window state remains consistent between the desktop, window chrome, and taskbar.

**Exploration ideas:**

- Close a minimized window after restoring it.
- Open multiple instances of the same app if supported.
- Confirm active taskbar styling tracks the focused window.
- Drag windows near viewport edges and over the taskbar.

---

## Scenario 4: Notepad Editing and File Save Flow

**Objective:** Verify Notepad supports basic document editing and saving.

**Areas covered:** Notepad launch, text editing, File menu, Save, Save As dialog, title update, dirty state.

**Steps:**

1. Launch Notepad from Start → Programs → Accessories → Notepad.
2. Type multi-line text into the editor.
3. Open File → Save.
4. Verify Save As appears for an untitled document.
5. Confirm the default save path is reasonable, for example `/C:/My Documents/Untitled.txt`.
6. Save the document.
7. Verify the Notepad title changes to the saved filename.
8. Close and reopen the document through Explorer if supported.
9. Check browser console.

**Expected result:** Text entry, Save As, and saved-title state work without losing content.

**Exploration ideas:**

- Save with an empty filename.
- Save with nested folders or invalid paths.
- Save very long text.
- Choose File → New with unsaved changes.
- Close with unsaved changes and verify prompt behavior.

---

## Scenario 5: Explorer and Virtual File System Navigation

**Objective:** Verify My Computer/Windoes Explorer browsing and address navigation.

**Areas covered:** My Computer, Windoes Explorer, address bar, Back/Up buttons, drive/folder listings, status bar counts.

**Steps:**

1. Open My Computer from the desktop or Start → Programs → Windoes Explorer.
2. Verify root items are visible: 3½ Floppy (A:), Local Disk (C:), CD-ROM (D:), Control Panel.
3. Navigate into Local Disk (C:) if supported.
4. Navigate into My Documents if supported.
5. Use Back and Up buttons.
6. Type known paths into the address bar, such as `C:/`, `C:/My Documents`, and `/C:/My Documents`.
7. Press Enter or use the relevant navigation control.
8. Try an invalid path and verify error handling.
9. Check browser console.

**Expected result:** Explorer navigation updates the listing, address bar, button enabled states, and status bar consistently. Invalid paths should produce clear feedback.

**Known area to verify from prior exploratory pass:** Typing `C:/My Documents` into the My Computer address bar appeared to clear the field and remain on My Computer without feedback. Retest and file a bug if reproducible.

**Exploration ideas:**

- Double-click desktop files and folders.
- Save a Notepad file, then verify it appears in Explorer.
- Inspect accessibility labels for window menus; prior testing observed a My Computer menubar label of `[object Object] menu`.

---

## Scenario 6: Internet Explorer Browser Flow

**Objective:** Verify the simulated Internet Explorer window can navigate to pages and expose browser controls.

**Areas covered:** IE launch, address bar, Go button, iframe content, Back/Forward, Refresh, Stop, Home, status bar.

**Steps:**

1. Launch Internet Explorer from quick launch, desktop, and Start menu paths.
2. Confirm it opens to `about:blank` or the configured home page.
3. Type `https://example.com` into the address bar.
4. Click Go.
5. Verify the page loads in the content iframe and the status bar updates.
6. Use Back, Forward, Refresh, Stop, and Home controls.
7. Click links inside the iframe where possible.
8. Check browser console.

**Expected result:** Navigation works and browser controls update page state without console errors.

**Exploration ideas:**

- Navigate to invalid or unreachable URLs.
- Navigate to a URL without protocol.
- Open multiple IE windows.
- Confirm title and taskbar text update after navigation.

---

## Scenario 7: Run Dialog and System Command Launching

**Objective:** Verify the Run dialog opens commands, folders, programs, and URLs correctly.

**Areas covered:** Start → Run, command textbox, OK, Cancel, Browse, error handling.

**Steps:**

1. Open Start → Run.
2. Verify the dialog text and controls render correctly.
3. Enter known app commands if supported, such as `notepad`, `iexplore`, `explorer`, or equivalent configured commands.
4. Enter a folder/path command such as `C:/My Documents`.
5. Enter a URL such as `https://example.com`.
6. Enter an invalid command.
7. Verify OK and Cancel behavior.
8. Check browser console.

**Expected result:** Valid commands launch the correct app or resource. Invalid commands show clear feedback. Cancel closes the dialog without side effects.

**Known area to verify from prior exploratory pass:** During one pass, opening Run coincided with a Windoes Update error dialog. Retest exact Start menu interactions to determine whether Run can accidentally trigger Windoes Update or whether it was a stale prior click.

**Exploration ideas:**

- Press Enter from the textbox instead of clicking OK.
- Press Escape to cancel.
- Try empty input.
- Try commands with extra whitespace or different casing.

---

## Scenario 8: Windoes Update and Error Dialogs

**Objective:** Verify system error dialogs are intentional, focused, and dismissible.

**Areas covered:** Windoes Update menu item, error dialogs, modal layering, OK/Close behavior.

**Steps:**

1. Open Start → Windoes Update.
2. Observe the resulting dialog.
3. Verify copy, error code, title, and buttons.
4. Dismiss via OK.
5. Repeat and dismiss via window close button.
6. Attempt to interact with underlying windows while dialog is visible.
7. Check browser console.

**Expected result:** Error dialogs appear only when intentionally triggered, remain visually above related content, and dismiss cleanly.

**Exploration ideas:**

- Trigger multiple error dialogs.
- Open Run, Help, or Shutdown while an error dialog is visible.
- Confirm focus returns to the expected window after dismissal.

---

## Scenario 9: Desktop Icons and Context Menus

**Objective:** Verify desktop icon behavior and right-click interactions.

**Areas covered:** Desktop icons, double-click launch, selection, desktop context menu, icon context menu if supported.

**Steps:**

1. Click each desktop icon once and observe selection state.
2. Double-click each desktop icon and verify expected launch behavior.
3. Right-click desktop background and verify context menu.
4. Right-click icons if supported and verify context menu actions.
5. Dismiss context menus by clicking elsewhere.
6. Check browser console.

**Expected result:** Icon selection and launch behavior is predictable, and context menus open and close without stale state.

**Exploration ideas:**

- Drag icons if supported.
- Launch the same app from desktop and Start menu and compare behavior.
- Verify Recycle Bin empty/non-empty states if implemented.

---

## Scenario 10: Bundled Games

**Objective:** Verify each bundled game launches and basic gameplay controls work.

**Areas covered:** Minesweeper, Solitaire, ASCII Runner, game window lifecycle, keyboard/mouse controls.

**Steps:**

1. Launch Minesweeper from desktop or Start menu.
2. Play several moves, including flagging if supported.
3. Restart or start a new game if supported.
4. Launch Solitaire and perform basic card moves.
5. Launch ASCII Runner and test keyboard controls.
6. Minimize, restore, and close each game.
7. Check browser console after each game interaction.

**Expected result:** Games launch, accept input, maintain state during normal window operations, and do not produce console errors.

**Exploration ideas:**

- Trigger win/loss states.
- Resize or maximize game windows if supported.
- Test keyboard focus after switching away and back.

---

## Scenario 11: Bundled Creative and Media Apps

**Objective:** Verify bundled non-system apps launch and complete basic user flows.

**Areas covered:** Paint, Winamp, and any other bundled creative/media applications.

**Steps:**

1. Launch Paint from Start → Programs → Accessories → Paint.
2. Draw with available tools and verify canvas updates.
3. Try saving or clearing the canvas if supported.
4. Launch Winamp from the desktop or Start menu.
5. Verify controls render and basic playback/playlist controls respond if media is available.
6. Minimize, restore, and close each app.
7. Check browser console.

**Expected result:** Apps launch successfully and core controls respond without breaking the shell.

**Exploration ideas:**

- Test multiple app windows alongside system windows.
- Verify app-specific menus and dialogs.
- Confirm app state survives focus changes.

---

## Scenario 12: Accessibility and Keyboard Navigation

**Objective:** Identify accessibility issues that affect screen readers, keyboard users, and semantic structure.

**Areas covered:** Roles, labels, focus order, keyboard shortcuts, modal focus, button names, menu semantics.

**Steps:**

1. Tab through the desktop and taskbar controls.
2. Open Start with keyboard if supported.
3. Navigate menus using Arrow keys, Enter, and Escape.
4. Open dialogs and verify focus starts on a sensible control.
5. Verify all interactive controls have meaningful names.
6. Inspect accessibility tree snapshots for incorrect labels.
7. Check browser console.

**Expected result:** Keyboard users can reach and operate primary controls, and accessible names describe visible controls accurately.

**Known area to verify from prior exploratory pass:** My Computer's menu was exposed as `[object Object] menu`, suggesting a non-string accessible label is leaking into the accessibility tree.

**Exploration ideas:**

- Verify modal dialogs trap focus if intended.
- Verify minimized windows remain reachable from taskbar.
- Check whether decorative text or icons create noisy accessibility output.

---

## Scenario 13: Responsive Layout and Viewport Stress

**Objective:** Verify the desktop and windows remain usable across viewport sizes.

**Areas covered:** Desktop icon wrapping, taskbar overflow, window bounds, modal positioning, menu positioning.

**Steps:**

1. Test the default desktop viewport.
2. Resize to a narrow viewport.
3. Resize to a short viewport.
4. Open Start menu, nested menus, and dialogs in each viewport.
5. Open and maximize windows in each viewport.
6. Verify no key controls are clipped behind the taskbar or outside the viewport.
7. Check browser console.

**Expected result:** The simulator remains usable and visually coherent at supported viewport sizes.

**Exploration ideas:**

- Open nested Start menus near viewport edges.
- Drag windows partially off-screen.
- Verify maximized windows do not cover the taskbar unexpectedly.

---

## Scenario 14: Persistence and Session State

**Objective:** Verify saved files, open windows, and app state persistence behave intentionally.

**Areas covered:** Virtual filesystem, local/session storage, reload behavior, saved documents, browser history if implemented.

**Steps:**

1. Create and save a Notepad document.
2. Navigate Explorer to the saved location.
3. Reload the browser page.
4. Verify whether saved files persist or reset according to product expectations.
5. Open apps, create state, reload, and verify expected behavior.
6. Clear browser storage and repeat key flows.
7. Check browser console.

**Expected result:** Persistence behavior is clear and consistent. State should not silently corrupt across reloads.

**Exploration ideas:**

- Save multiple files with similar names.
- Save file contents containing special characters and newlines.
- Confirm state reset behavior after clearing storage.

---

## Scenario 15: Negative and Edge Case Testing

**Objective:** Exercise invalid inputs and unusual interaction sequences.

**Areas covered:** Invalid paths, invalid URLs, empty dialogs, rapid clicks, special characters, repeated open/close cycles.

**Steps:**

1. Enter invalid commands in Run.
2. Enter invalid paths in Explorer and Save As.
3. Enter invalid URLs in Internet Explorer.
4. Click OK/Save with empty required fields.
5. Rapidly click Start, window buttons, and taskbar buttons.
6. Open and close the same app repeatedly.
7. Check browser console.

**Expected result:** Invalid inputs produce clear user feedback and do not break shell state.

**Exploration ideas:**

- Use very long strings.
- Use path separators, quotes, emojis, and non-Latin characters.
- Try interactions while dialogs are open or windows are minimized.

---

## Reporting Template for Each Scenario

Use this format when filing results for an individual scenario:

```markdown
## Scenario: <scenario name>

**Commit tested:** <sha>
**Browser / viewport:** <browser and size>
**Tester:** <name>
**Date:** <date>

### Summary

- Passed:
- Failed:
- Blocked:

### Issues Found

#### Issue 1: <title>

**Severity:** Critical | High | Medium | Low
**Category:** Functional | Visual | Accessibility | Console | UX | Content
**URL:** <url>

**Steps to reproduce:**

1. ...
2. ...

**Expected:** ...
**Actual:** ...
**Console output:** ...
**Evidence:** <screenshot/video path or attachment>

### Notes

- ...
```

---

## Suggested Execution Order

1. Boot Flow and Desktop Baseline
2. Start Menu Navigation
3. Window Lifecycle and Taskbar Behavior
4. Notepad Editing and File Save Flow
5. Explorer and Virtual File System Navigation
6. Internet Explorer Browser Flow
7. Run Dialog and System Command Launching
8. Windoes Update and Error Dialogs
9. Desktop Icons and Context Menus
10. Bundled Games
11. Bundled Creative and Media Apps
12. Accessibility and Keyboard Navigation
13. Responsive Layout and Viewport Stress
14. Persistence and Session State
15. Negative and Edge Case Testing

This order starts with shell stability, then core apps, then accessibility/responsive/persistence/edge-case sweeps.
