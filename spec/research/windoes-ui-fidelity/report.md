# Windoes shell UI vs Windows 98 / Me

Question: where does the Windoes shell deviate from the original Windows 98 SE / Windows Me look and behaviour, and which fixes bring it closest for the least work?

Answer: the shell has the right palette family and layout, but six things make it read as "web page in grey" instead of "Windows 98": anti-aliased Liberation/Arial text instead of a bitmap 8 pt font, a 22 px Windows-2000-coloured title bar, one-level bevels where 98 draws two, modern Chromium scrollbars, taskbar buttons that are all bold with no active dither, and menus with a navy menu-bar highlight and a drop shadow. Each of the first five is one small or medium CSS-first PR. The ranked ticket list is at the end.

## Method

- Windoes captures: `capture.mjs` (this folder) starts the Vite dev server and headless Chromium 1217 (Playwright, Linux), viewport 800x600, `deviceScaleFactor: 1`, scrollbars not hidden. It writes `screenshots/*.png` and `screenshots/metrics.json` (rendered font per element, from CDP `CSS.getPlatformFontsForNode`, and measured element sizes). Rerun from the repo root: `node spec/research/windoes-ui-fidelity/capture.mjs`.
- Pixel values quoted below were read from those PNGs. Geometry comes from `metrics.json`.
- References are public screenshots, viewed for comparison only. No Microsoft image, icon or font was saved, committed, extracted or traced. Default scheme colours and metrics come from cited open sources (Wine, 98.css, Microsoft docs), not from bitmaps.
- Target: Windows 98 SE, because most Windoes surfaces already follow 98 (teal desktop, 98 Shut Down radio list, 98 Start menu items). Where Me differs it is noted. The shell today mixes the two (see Window chrome).
- Font rendering on Windows and macOS was not captured. Statements about it are marked [INFERENCE].

## References

| #   | Surface                                  | Version    | Page URL                                                                        | Image URL                                                                                   | Size          | Scale                       |
| --- | ---------------------------------------- | ---------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------- | --------------------------- |
| R1  | Desktop, taskbar, Explorer, dialog       | 98 SE      | https://guidebookgallery.org/screenshots/win98se                                | https://guidebookgallery.org/pics/gui/desktop/full/win98se.png                              | 640x480       | 1x                          |
| R2  | Start menu (large icons, banner)         | 98         | http://toastytech.com/guis/win98.html                                           | http://toastytech.com/guis/win98start.png                                                   | 640x480       | 1x                          |
| R3  | Shut Down dialog, dithered screen        | 98         | http://toastytech.com/guis/win98.html                                           | http://toastytech.com/guis/win98shut.png                                                    | 640x480       | 1x                          |
| R4  | Notepad, warning message box, taskbar    | 98         | http://toastytech.com/guis/win98.html                                           | http://toastytech.com/guis/win98notepad.png                                                 | 640x480       | 1x                          |
| R5  | Boot splash                              | 98         | http://toastytech.com/guis/win98.html                                           | http://toastytech.com/guis/win98logo.png                                                    | 640x480       | 1x, one frame               |
| R7  | Shut Down dialog (dropdown)              | Me         | https://guidebookgallery.org/screenshots/winme                                  | https://guidebookgallery.org/pics/gui/startupshutdown/shutdownwindow/winme.png              | 323x192       | 1x crop, served as WebP     |
| R8  | Desktop with apps, taskbar, Explorer bar | Me         | https://guidebookgallery.org/screenshots/winme                                  | https://guidebookgallery.org/pics/gui/desktop/full/winme.png                                | 800x600       | 1x, served as WebP          |
| R9  | Run dialog                               | Me         | https://guidebookgallery.org/screenshots/winme                                  | https://guidebookgallery.org/pics/gui/system/features/run/winme.png                         | 347x163       | 1x crop, served as WebP     |
| R10 | Internet Explorer 5                      | 98 SE      | https://guidebookgallery.org/screenshots/win98se                                | https://guidebookgallery.org/pics/gui/applications/internet/browser/win98se.png             | about 480x321 | 1x crop                     |
| R11 | Win9x blue screen                        | 9x         | https://commons.wikimedia.org/wiki/File:Windows_9X_BSOD.png                     | https://upload.wikimedia.org/wikipedia/commons/3/3b/Windows_9X_BSOD.png                     | 640x400       | 1x (80x25 text, 8x16 cells) |
| R13 | Message box                              | 98         | https://commons.wikimedia.org/wiki/File:Windows_98_Exit_Windows_message_box.png | https://upload.wikimedia.org/wikipedia/commons/1/1e/Windows_98_Exit_Windows_message_box.png | 246x106       | 1x, not viewed              |
| R17 | Explorer Web view                        | 98 SE      | https://guidebookgallery.org/screenshots/win98se                                | https://guidebookgallery.org/pics/gui/system/managers/filemanager/win98se.png               | unknown       | 1x, not viewed              |
| R21 | Appearance tab, scheme preview           | 98 SE / Me | https://guidebookgallery.org/screenshots/win98se                                | https://guidebookgallery.org/pics/gui/settings/appearance/win98se-1-1.png                   | 404x448       | 1x, not viewed              |

Secondary sources for exact values:

- S1 98.css stylesheet (MIT): https://github.com/jdan/98.css/blob/main/style.css
- S2 Wine default system colours: https://gitlab.winehq.org/wine/wine/-/blob/master/dlls/win32u/sysparams.c
- S3 `GetSystemMetrics`: https://learn.microsoft.com/windows/win32/api/winuser/nf-winuser-getsystemmetrics
- S4 `SPI_GETMENUSHOWDELAY` (default 400 ms): https://learn.microsoft.com/windows/win32/api/winuser/nf-winuser-systemparametersinfoa

Not found: a Windows Me Start menu capture, a Me boot splash at 1x, and any still that shows 98/Me menu or window animation. Facts that rest only on these are marked UNCONFIRMED.

### Windows Standard scheme (S2, S1)

| Role                                  | Value                                | Windoes today                                             |
| ------------------------------------- | ------------------------------------ | --------------------------------------------------------- |
| ButtonFace                            | #C0C0C0                              | #C0C0C0                                                   |
| ButtonHilight                         | #FFFFFF                              | #FFFFFF                                                   |
| ButtonLight                           | #DFDFDF                              | used only as an inner `box-shadow` on windows and dialogs |
| ButtonShadow                          | #808080                              | #808080                                                   |
| ButtonDkShadow                        | #000000                              | #000000 on windows, missing on buttons, taskbar, menus    |
| ActiveTitle → GradientActiveTitle     | #000080 → #1084D0                    | #0A246A → #3A6EA5                                         |
| InactiveTitle → GradientInactiveTitle | #808080 → #C0C0C0 (98.css: #B5B5B5)  | #808080 → #B0B0B0                                         |
| InactiveTitleText                     | #C0C0C0                              | #FFFFFF                                                   |
| Hilight                               | #000080                              | #000080                                                   |
| InfoWindow (tooltip)                  | #FFFFE1                              | #FFFFCC                                                   |
| Background                            | #008080 (98), about #3A6EA5 (Me, R8) | #008080                                                   |

Metrics: caption 18 px, caption buttons 16x14, scrollbar 16 px, icon spacing 75 px, taskbar 28 px, push button 75x23 (S3, R1, R3, R4).

## Screenshots

All are 1x PNGs in `screenshots/`. Full-screen ones are 800x600.

| File                                                                                                                                                   | Shows                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| 01-boot-bios, 02-boot-splash                                                                                                                           | BIOS text, splash with progress bar                 |
| 03-desktop, 06-desktop-icon-selected                                                                                                                   | desktop, selected icon                              |
| 04-taskbar, 05-taskbar-left, 17-taskbar-two-tasks, 18-task-buttons-crop                                                                                | taskbar, Start button, task button states           |
| 07-start-menu, 08-start-menu-programs-60ms, 09-start-menu-cascade                                                                                      | Start menu; Programs already open 60 ms after hover |
| 10-desktop-context-menu, 13-notepad-file-menu                                                                                                          | context menu, menu bar dropdown                     |
| 11-notepad-active, 12-titlebar-active-crop, 14-two-windows-active-inactive, 15-titlebar-inactive-crop, 20-caption-button-pressed, 22-notepad-maximized | window chrome states                                |
| 16-my-computer, 19-explorer-folder                                                                                                                     | My Computer, folder view                            |
| 21-scrollbar-notepad                                                                                                                                   | the scrollbar the shell gets today                  |
| 23-internet-explorer, 24-ie-toolbar-crop, 25-ie-toolbar-hover                                                                                          | IE window, toolbar normal and hot                   |
| 26-message-box-error / -warning / -info, 27-message-box-button-pressed                                                                                 | message boxes, pressed OK                           |
| 28-run-dialog, 29-shutdown-dialog, 30-bsod                                                                                                             | Run, Shut Down, blue screen                         |
| metrics.json                                                                                                                                           | rendered fonts and element sizes                    |

## Findings by surface

Size: S = under half a day, one file or two; M = one PR touching several style files or one component; L = new asset or new component. Impact: how much the deviation changes the first impression at 1x.

### Fonts (all surfaces)

Every UI element asks for `'MS Sans Serif', 'Microsoft Sans Serif', Tahoma, Arial, sans-serif` at 11 px. In the capture every element renders Liberation Sans (`metrics.json`), sub-pixel anti-aliased with colour fringes (`05-taskbar-left`, `18-task-buttons-crop`). In 98 every UI string is the aliased 8 pt MS Sans Serif bitmap; Me looks the same (R1–R4, R8, R9). On Windows, Chrome cannot use the `.fon` bitmap face, so it falls back to the TrueType Microsoft Sans Serif with ClearType; on macOS it gets Tahoma or Arial [INFERENCE]. So no user sees the 98 glyphs today.

| Deviation                                                    | Fix                                                                                                                                                              | Size | Impact |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| Anti-aliased vector sans instead of 1-bit 8 pt bitmap glyphs | Self-host one openly licensed pixel UI font (regular + bold, designed for 11 px) and put it first in one `--ui-font` variable; licence check is part of the work | M    | high   |
| Font stack repeated in 12 rules across 5 style files         | Define the stack once in `base.css` and use `font: inherit` elsewhere                                                                                            | S    | low    |
| Toolbar labels at 10 px (`.tb-btn`)                          | Use the same 11 px UI size as 98 toolbar text                                                                                                                    | S    | low    |
| Notepad uses Courier New 13 px                               | Use a fixed-pitch bitmap-style font close to Fixedsys at 15 px line height (R4)                                                                                  | S    | medium |

### Palette and 3D edges (all surfaces)

98 draws a raised edge with four colours: outer #FFFFFF / #000000, inner #DFDFDF / #808080 (S1, S2). Windoes writes each edge by hand: about 100 one-side `border-*` declarations in `dialogs.css`, `menus.css`, `taskbar.css` and `windows-ie.css`. Most use two colours and one level.

| Deviation                                                                                                                                         | Fix                                                                                                                                                                                                                  | Size | Impact |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| Buttons, Start button, taskbar, menus, task buttons use a 1- or 2-colour edge (white/grey), no #000 outer shadow                                  | Add `--button-face`, `--button-hilight`, `--button-light`, `--button-shadow`, `--button-dk-shadow` and `raised`, `sunken`, `field`, `window` edge rules (via `box-shadow` insets) in `base.css`; use them everywhere | M    | high   |
| Window and dialog frame order inverted: 2 px #FFFFFF outside, then #DFDFDF; 2 px #000 outside, then #808080 (pixel column in `11-notepad-active`) | 98: 1 px #DFDFDF outside, 1 px #FFFFFF inside; 1 px #000 outside, 1 px #808080 inside, then 2 px face                                                                                                                | S    | medium |
| `border: 2px inset #c0c0c0` on fields and views gives browser-computed colours                                                                    | Use the 98 sunken field edge: #808080/#FFFFFF outer, #000/#DFDFDF inner                                                                                                                                              | S    | medium |
| Tooltip #FFFFCC                                                                                                                                   | #FFFFE1                                                                                                                                                                                                              | S    | low    |

### Desktop

| Deviation                                                                                               | Fix                                                               | Size | Impact |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---- | ------ |
| Labels have a black text shadow (`03-desktop`); 98 labels have none (R1)                                | Remove `text-shadow` on `.icon`                                   | S    | medium |
| Hover paints the label navy with a focus box; 98 does nothing on hover in the default double-click mode | Remove the `:hover` rule; keep `.selected`                        | S    | medium |
| Selected icon image is not tinted; 98 tints it with a 50% navy dither (R1)                              | Add a navy checkerboard overlay on `.icon.selected .icon-graphic` | S    | low    |
| Vertical icon pitch is 61 px (cell 75x57 + 4 px gap); 98 uses 75 px (S3, R1)                            | Set a 75x75 grid cell                                             | S    | low    |
| Desktop icons are existing 48 px PNGs scaled to 32 px and look soft                                     | Note only; icons are out of scope                                 | —    | —      |

### Taskbar

Measured: taskbar 800x30, Start button 60x24, task button 140x22 (`metrics.json`). 98: taskbar 28 px, Start button about 54x22, task buttons about 160x22 (R1, R2).

| Deviation                                                                                                 | Fix                                                                         | Size | Impact |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---- | ------ |
| Every task button label is bold (`18-task-buttons-crop`); 98 bolds only the active one (R1, R4, R8)       | `font-weight: normal` on `.task-button`, bold on `.task-button.active`      | S    | high   |
| Active task button is plain sunken grey; 98 fills it with a white/silver checkerboard dither (R1, R4, R8) | 2x2 `repeating-conic-gradient` (or 2x2 PNG we draw) background on `.active` | S    | high   |
| Task buttons and Start button use a 1-level edge with no black outer shadow                               | Use the shared `raised` / `sunken` edge                                     | S    | medium |
| Taskbar is 30 px with a 2 px white top line                                                               | 28 px: 1 px #DFDFDF + 1 px #FFFFFF top edge, 2 px padding, 22 px buttons    | S    | medium |
| Pressed task/Start button text does not move                                                              | Offset content 1 px right and down when sunken                              | S    | low    |
| Tray well uses `1px inset`, which draws only top/left grey in Chromium (`04-taskbar`)                     | 1 px #808080 top/left, #FFFFFF bottom/right                                 | S    | low    |
| Volume icon is a black CSS shape; Show Desktop icon is a CSS drawing                                      | Note only; icons are out of scope                                           | —    | —      |
| No Quick Launch toolbar grip at its left edge (R1)                                                        | Add the 3 px raised grip                                                    | S    | low    |

### Start menu

Measured: root item 194x26, submenu item 196x26, banner 22 px wide (`metrics.json`). 98 root: 32 px icons, rows about 36 px; submenus: 16 px icons, rows about 17–18 px (R2; submenu height UNCONFIRMED).

| Deviation                                                                                                                                                                                                 | Fix                                                                                                        | Size | Impact |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---- | ------ |
| Root uses 16 px icons in 26 px rows; 98 root uses 32 px icons in about 36 px rows (R2)                                                                                                                    | Root items: 32 px icon, about 36 px row; existing icon PNGs are 48 px so they scale down                   | S    | medium |
| Submenu rows are 26 px, too loose                                                                                                                                                                         | 16 px icon, about 20 px row with 2 px icon inset                                                           | S    | medium |
| Programs opens in under 60 ms on hover (`08-start-menu-programs-60ms`) and closes at once on leave; 98 waits `MenuShowDelay` 400 ms (S4) and keeps the open submenu while the pointer crosses other items | Open and switch submenus after a 400 ms hover timer; cancel on leave                                       | M    | medium |
| No open animation; 98 slides menus open by default                                                                                                                                                        | Short `clip-path` slide (about 100 ms) on open; respect `prefers-reduced-motion` (UNCONFIRMED from stills) | S    | low    |
| Banner is `#0a246a → #3a6ea5`, 20 px bold text; 98 banner is navy #000080 to #1084D0 with "Windows" bold and "98" light (R2)                                                                              | Use the 98 title colours; keep the "WindoesXD" text                                                        | S    | low    |
| Arrow is a `▶` text character at 8 px                                                                                                                                                                     | Draw a 4x7 solid triangle (CSS border or inline SVG) right-aligned                                         | S    | low    |
| Root list lacks Favorites, Documents, Settings, Find, Log Off (R2)                                                                                                                                        | Content, not chrome; leave for a feature ticket                                                            | —    | —      |

### Window chrome

Measured: title bar 22 px, caption button 16x14 (`metrics.json`); frame 5 px from outer edge to caption (2 px #FFFFFF, 1 px #DFDFDF, 2 px face). 98: caption 18 px, buttons 16x14 with a 2 px gap before Close, frame 4 px (R1, R4, R10, S3).

| Deviation                                                                                                                                                                          | Fix                                                                                                                     | Size | Impact |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| Active gradient #0A246A → #3A6EA5: the start is the Windows 2000 navy, the end is the Me/2000 desktop blue; neither 98 nor Me                                                      | #000080 → #1084D0 (S1, S2)                                                                                              | S    | high   |
| Title bar 22 px                                                                                                                                                                    | 18 px caption, 2 px gap to the menu bar                                                                                 | S    | high   |
| Inactive gradient ends at #B0B0B0 and keeps white text (`15-titlebar-inactive-crop`)                                                                                               | #808080 → #C0C0C0, text #C0C0C0 (R1, R4, R8)                                                                            | S    | high   |
| Caption buttons have a 1-level white/black edge (`20-caption-button-pressed`)                                                                                                      | Shared 2-level `raised` edge; `sunken` when pressed with the glyph offset 1 px                                          | S    | medium |
| Caption glyphs are text characters `_ □ ×` in the vector font, blurred and fringed                                                                                                 | Draw our own 1-bit glyphs (minimise 6x2 bar, maximise 9x9 box with 2 px top, restore, close 8x7 X) as inline SVG or CSS | S    | medium |
| Frame bevel colours inverted (see Palette)                                                                                                                                         | Fix with the shared `window` edge                                                                                       | S    | medium |
| Resizable windows show Chromium's `resize: both` diagonal at the bottom right (`21-scrollbar-notepad`), not a 98 size grip                                                         | Hide the native resizer; draw a 12x12 size grip in the status bar or corner                                             | M    | low    |
| Maximised height is `100vh - 36px`, leaving a 6 px desktop strip above the 30 px taskbar, and the frame bevel stays drawn (`22-notepad-maximized`); 98 pushes the frame off-screen | Bind the height to a taskbar height variable and drop the frame when maximised                                          | S    | low    |
| No minimise/restore animation; 98 draws a caption "zoom" rectangle to the task button (UNCONFIRMED from stills)                                                                    | Optional 200 ms outline animation                                                                                       | M    | low    |
| Title icons are scaled 48 px PNGs and look soft                                                                                                                                    | Note only; icons are out of scope                                                                                       | —    | —      |

### Menus (menu bar, dropdowns, context menus)

Measured: menu bar 20 px, menu bar item 30x16, dropdown and context item 156x20 (`metrics.json`). 98: menu bar 19 px, item rows about 17–18 px (S3, UNCONFIRMED).

| Deviation                                                                                                                                                                             | Fix                                                                              | Size | Impact |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---- | ------ |
| Menu bar item turns navy on hover and when open (`13-notepad-file-menu`); 98 draws a 1 px raised frame on hover and a 1 px sunken frame when open, no fill (UNCONFIRMED in a capture) | Replace the navy fill on `.menubar-item` with the two 1 px frames                | S    | high   |
| Context menu has `box-shadow: 2px 2px 0 rgba(0,0,0,.3)`; 98/Me menus have none (R2)                                                                                                   | Remove it                                                                        | S    | medium |
| Disabled items are flat grey (`10-desktop-context-menu`); 98 embosses them (#808080 text with a #FFFFFF copy 1 px down-right, R10)                                                    | `text-shadow: 1px 1px 0 #fff` on disabled items                                  | S    | medium |
| The "New ▶" arrow is a literal character in the label, so it sits next to the text, not at the right edge (`10-desktop-context-menu`)                                                 | Give the item the existing `.context-menu-item-arrow` class and drop the literal | S    | low    |
| Menu frame uses a 2-colour edge, no #000 outer shadow                                                                                                                                 | Shared `raised` edge                                                             | S    | medium |
| No keyboard mnemonic underlines (`F̲ile`); Me shows them (R8)                                                                                                                          | Render an underlined access letter per item                                      | M    | low    |
| Notepad File menu lacks Page Setup… and Print (R4)                                                                                                                                    | Content; leave                                                                   | —    | —      |

### Scrollbars

No rule styles scrollbars, so the host browser's scrollbar shows. In the capture it is the Chromium Linux bar: rounded grey thumb, triangle arrows without buttons, white track (`21-scrollbar-notepad`). Users on Windows and macOS see their own system bar [INFERENCE]. 98: 16 px, raised 16x16 arrow buttons, checkerboard track, raised thumb (R1, R4, R10, S3).

| Deviation                                                                    | Fix                                                                                                                                                                              | Size | Impact |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| Native modern scrollbar everywhere                                           | `::-webkit-scrollbar` rules in `base.css`: 16 px, raised buttons with drawn arrows, dither track, raised thumb, corner face; Firefox fallback `scrollbar-color: #c0c0c0 #dfdfdf` | M    | high   |
| Notepad shows only a vertical bar; 98 Notepad shows both (Word Wrap off, R4) | `white-space: pre; overflow: scroll` on the text area                                                                                                                            | S    | low    |

### Push buttons and form controls

Measured: dialog button 75x23, correct (`metrics.json`).

| Deviation                                                                                                  | Fix                                                                       | Size | Impact |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---- | ------ |
| Default button has no 1 px black outer outline (`26-message-box-*`, R3, R4)                                | `.dialog-btn.default` adds the outline; dialogs mark their default button | S    | medium |
| Pressed button keeps the label in place and shows a 2-colour sunken edge (`27-message-box-button-pressed`) | 98 pressed: #000 outline, 1 px #808080 inner, label offset 1 px           | S    | medium |
| Focus box drawn with `outline-offset: -4px` sits on the bevel                                              | Inset the dotted box 4 px inside the face, not over the edge              | S    | low    |
| Radio buttons are native Chromium blue circles (`29-shutdown-dialog`)                                      | Draw 12x12 98 radios with `appearance: none`                              | S    | medium |
| Run input and IE address bar are plain inputs; 98 uses combo boxes with a 16x16 drop button (R9, R10)      | Add a non-functional or history drop button                               | S    | low    |

### Message boxes

| Deviation                                                                                                   | Fix                                                                   | Size | Impact |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---- | ------ |
| Error, warning and info icons are CSS shapes (red circle with ×, flat yellow triangle, blue-outline circle) | Draw our own 32x32 pixel icons in 98 style; do not copy Microsoft art | M    | medium |
| Box is 340–480 px wide regardless of text; 98 sizes to the text with 75x23 buttons centred (R4)             | Fit width to content with a max                                       | S    | low    |
| Text is vertically top-aligned with the icon; 98 centres one-line text on the icon (R4)                     | `align-items: center` for one-line bodies                             | S    | low    |

### Run dialog

| Deviation                                                     | Fix                         | Size | Impact |
| ------------------------------------------------------------- | --------------------------- | ---- | ------ |
| Buttons centred; Me/98 right-align OK / Cancel / Browse… (R9) | `justify-content: flex-end` | S    | low    |
| Title bar has only Close; Me shows "?" and Close (R9)         | Add a help caption button   | S    | low    |
| Open field is an input, not a combo box (R9)                  | See form controls           | S    | low    |

### Shut Down dialog

98 layout matches: title, computer icon, question, radio list, OK / Cancel / Help (R3). Me uses a dropdown with a description instead (R7); Windoes follows 98.

| Deviation                                                                                    | Fix                                                       | Size | Impact |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---- | ------ |
| Screen behind stays bright; 98 darkens it with a 50% black checkerboard (R3; Me UNCONFIRMED) | Overlay a 2x2 checkerboard on `.shutdown-dialog` backdrop | S    | medium |
| Native radio buttons (see form controls)                                                     | 98 radios                                                 | S    | medium |
| 98 shows "Stand by" when power management exists (R3)                                        | Optional; content                                         | —    | —      |

### Explorer / My Computer

| Deviation                                                                                                            | Fix                                        | Size | Impact |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---- | ------ |
| No Web view left pane (large folder title, icon, description); 98 and Me show it by default (R2, R3, R17 not viewed) | New left pane component in the folder view | L    | medium |
| Toolbar lacks Delete, Properties and Views (R1)                                                                      | Add buttons; Views can switch icon/list    | M    | low    |
| Folder items highlight the whole cell navy on hover                                                                  | Highlight only on selection, label only    | S    | low    |
| Status bar has no size grip                                                                                          | See Window chrome                          | —    | —      |

### Notepad

| Deviation                             | Fix                                   | Size | Impact |
| ------------------------------------- | ------------------------------------- | ---- | ------ |
| Courier New 13 px                     | Fixedsys-like bitmap font (see Fonts) | S    | medium |
| Only vertical scrollbar, modern style | See Scrollbars                        | S    | low    |
| File menu items differ (see Menus)    | Content                               | —    | —      |

### Internet Explorer 5

| Deviation                                                                                                       | Fix                                                                                 | Size | Impact |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---- | ------ |
| No throbber box at the right of the menu bar (about 38x22 px, black, R10)                                       | Add our own animated throbber (Windoes art)                                         | M    | medium |
| Toolbar icons are greyscale HUD PNGs; IE5 shows grey icons that turn colour on hover                            | Note only; icons are out of scope                                                   | —    | —      |
| Address bar has an italic text "e" glyph and no drop button; Go button lacks its arrow; no "Links »" band (R10) | Use the IE page icon, add the combo drop button and a Go arrow; Links band optional | S    | low    |
| Status bar has two panels; IE5 has several (R10)                                                                | Add the empty middle panels                                                         | S    | low    |
| Toolbar label 10 px (see Fonts)                                                                                 | —                                                                                   | —    | —      |

### Boot screen

| Deviation                                                                                                                                                                                                             | Fix                                                                                                                                                          | Size | Impact |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ------ |
| Splash is a 400 px image with 8 px rounded corners on black, plus a blue progress bar and status text (`02-boot-splash`); 98 shows a full-screen image with a scrolling colour band along the bottom and no text (R5) | Full-screen `object-fit` image, no radius; replace bar and status text with a 10 px animated colour band; keep real preload progress driving the timing only | S    | medium |
| The splash image itself resembles the 98 logo                                                                                                                                                                         | Note only; existing art is out of scope                                                                                                                      | —    | —      |
| BIOS screen uses Courier New on #000 with #AAAAAA text                                                                                                                                                                | Close enough; a VGA-style bitmap font would complete it                                                                                                      | S    | low    |

### Blue screen

| Deviation                                                                                                                                           | Fix                                                                               | Size | Impact |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---- | ------ |
| Text block sits top-left with 40 px padding and 1.6 line height (`30-bsod`); Win9x centres an 80x25 text page and the " Windows " title block (R11) | Lay out a centred 80-column block, 1:1 cell line height, centred title and footer | S    | medium |
| Lucida Console / Courier New at 14 px                                                                                                               | VGA-style 8x16 bitmap font, or the closest monospace at 16 px line height         | S    | medium |
| Body text white; R11 body text is #AAAAAA with white highlights                                                                                     | Use #AAAAAA for body, #FFFFFF for emphasis                                        | S    | low    |

### Behaviour

| Deviation                                                                                                                                                                            | Fix                                           | Size | Impact |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ---- | ------ |
| Submenus open and close with no delay (`08-start-menu-programs-60ms`)                                                                                                                | 400 ms `MenuShowDelay` timer (S4)             | M    | medium |
| No menu animation                                                                                                                                                                    | Optional slide (see Start menu)               | S    | low    |
| No window minimise/restore animation                                                                                                                                                 | Optional zoom outline (see Window chrome)     | M    | low    |
| Only Notepad's File item opens a dropdown; every other menu bar item in Notepad, My Computer and IE does nothing when clicked (`window-renderers.jsx` renders them as plain buttons) | Out of chrome scope; note for a menus feature | —    | —      |

## Proposed tickets, ranked

Ranked by visual gain per unit of work. Each fits one PR. File paths are where the worker starts.

1. **Window title bars and frames match Windows 98** — 18 px caption, #000080 → #1084D0 active and #808080 → #C0C0C0 inactive with #C0C0C0 text, 98 frame bevel order, 2-level caption buttons with our own 1-bit glyphs. S–M. Starts in `windoes/styles/windows-ie.css`, `windoes/styles/dialogs.css` (`.dialog-titlebar`), `windoes/window-manager/window-renderers.jsx`.
2. **Taskbar buttons show 98 active and inactive states** — normal-weight inactive labels, bold and dithered active button, 28 px taskbar, 2-level Start and task button edges. S. Starts in `windoes/styles/taskbar.css`, `windoes/styles/responsive.css`.
3. **Every raised and sunken edge in the shell uses one 98 four-colour bevel** — palette variables and `raised` / `sunken` / `field` / `window` edge rules, applied to buttons, fields, menus, views and the default-button outline with pressed-label offset. M. Starts in `windoes/styles/base.css`, then `dialogs.css`, `menus.css`, `notepad-explorer.css`.
4. **Scrollbars in the shell look like Windows 98 scrollbars** — 16 px, raised arrow buttons, dither track, raised thumb, Firefox colour fallback. M. Starts in `windoes/styles/base.css`.
5. **UI text renders as a crisp 8 pt bitmap-style font** — one openly licensed pixel font, self-hosted, regular and bold, set once in a font variable; licence checked in the PR. M. Starts in `windoes/styles/base.css`, `windoes/public/` (font file). Needs the owner to approve the chosen font and its licence.
6. **Menus look and behave like 98 menus** — menu bar raised/sunken item frames instead of navy, no drop shadow, embossed disabled items, right-aligned drawn arrows, 98 row heights. S–M. Starts in `windoes/styles/menus.css`, `windoes/styles/windows-ie.css` (`.menubar`), `windoes/shell/DesktopContextMenu.jsx`.
7. **The Start menu opens like the 98 Start menu** — 32 px root icons in 36 px rows, tighter submenus, 98 banner colours, 400 ms submenu delay. M. Starts in `windoes/shell/StartMenu.jsx`, `windoes/shell/MenuItems.jsx`, `windoes/styles/menus.css`.
8. **Desktop icons behave like 98 desktop icons** — no label shadow, no hover highlight, tinted selected icon, 75 px grid. S. Starts in `windoes/styles/desktop.css`.
9. **The Shut Down dialog dims the screen and uses 98 radio buttons** — checkerboard backdrop and drawn radios. S. Starts in `windoes/shell/StartMenu.jsx` (shutdown dialog), `windoes/styles/dialogs.css`.
10. **The blue screen is laid out like a Win9x text-mode screen** — centred 80-column block, centred title and footer, VGA-like font, #AAAAAA body. S. Starts in `windoes/styles/base.css` (`.bsod`), `windoes/bsod.jsx`, `windoes/shell/BootScreens.jsx`.
11. **The boot splash fills the screen with a scrolling colour band** — no rounded image, no progress bar or status text. S. Starts in `windoes/shell/BootScreens.jsx`, `windoes/styles/base.css`, `windoes/boot.js`.
12. **Message boxes use Windoes-drawn 98-style icons and 98 layout** — our own 32x32 error, warning and info icons, content-fit width, right-aligned Run buttons. M. Starts in `windoes/styles/dialogs.css`, `windoes/shell/ErrorDialog.jsx`, `windoes/shell/RunDialog.jsx`.

Not ranked: Explorer Web view pane (L), IE5 throbber and address combo (M), window zoom animation (M), mnemonic underlines (M). Each is worth less than its cost today.

## Notes for the workers

- `windoes/styles/responsive.css` overrides title bar, caption button, taskbar and menu sizes under 700 px for touch. Keep those overrides; the 98 geometry applies above 700 px.
- Rerun `capture.mjs` after each ticket and compare the same file names; `metrics.json` gives the before and after sizes.
- Owner decision, if wanted: the shell mixes 98 and Me. This report assumes 98 SE. Choosing Me changes the desktop colour (#3A6EA5), the Shut Down dialog (dropdown, R7) and the Start banner text, and nothing else in the ranked list.
