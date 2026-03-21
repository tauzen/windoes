        const simulatorConfig = window.WIN_ME_SIMULATOR_CONFIG || {};

        // ══════════════════════════════════════════════
        // Sound System (Web Audio API)
        // ══════════════════════════════════════════════
        const {
            ensureAudio,
            playBeep,
            playStartupSound,
            playErrorSound,
            playClickSound,
        } = window.createAudioSystem();

        // ══════════════════════════════════════════════
        // Boot Sequence
        // ══════════════════════════════════════════════
        const bootState = window.initBootSequence({
            simulatorConfig,
            playStartupSound,
            onBootFinished: () => {
                // Schedule random events
                scheduleRandomBSOD();
                scheduleRandomError();
            },
        });

        // ══════════════════════════════════════════════
        // BSOD System
        // ══════════════════════════════════════════════
        const bsod = document.getElementById('bsod');
        const bsodText = document.getElementById('bsodText');

        const bsodMessages = simulatorConfig.bsodMessages || [
            'An exception 0E has occurred at 0028:C0011E36 in VxD VMM(01) +\n00010E36. This was called from 0028:C001747B in VxD VMM(01) +\n0001647B. It may be possible to continue normally.\n\n* Press any key to attempt to continue.\n* Press CTRL+ALT+DEL to restart your computer. You will\n  lose any unsaved information in all applications.\n\nPress any key to continue _',
            'A fatal exception 0D has occurred at 0028:C0034B80 in VxD VWIN32(05) +\n00002E80. The current application will be terminated.\n\n* Press any key to terminate the current application.\n* Press CTRL+ALT+DEL to restart your computer. You will\n  lose any unsaved information in all applications.\n\nPress any key to continue _',
            'EXPLORER caused an invalid page fault in\nmodule KERNEL32.DLL at 0177:BFF9DB61.\n\nRegisters:\nEAX=C0045200 CS=0177 EIP=BFF9DB61 EFLGS=00010216\nEBX=007D4E38 SS=017F ESP=006DF3FC EBP=006DF42C\nECX=006DF4B0 DS=017F ESI=816BD210 FS=455F\nEDX=006DF440 ES=017F EDI=006DF4B0 GS=0000\n\nPress any key to continue _',
            'Windows protection error. You need to restart\nyour computer.\n\nSystem halted.',
            'MSGSRV32 caused a General Protection Fault in\nmodule USER.EXE at 0004:00003FFC.\n\n* Press any key to terminate the current application.\n* Press CTRL+ALT+DEL to restart your computer.\n\nPress any key to continue _'
        ];
        let bsodActive = false;

        function triggerBSOD() {
            if (bsodActive) return;
            bsodActive = true;
            bsodText.textContent = bsodMessages[Math.floor(Math.random() * bsodMessages.length)];
            bsod.classList.add('active');
            playBeep(200, 0.5, 'sawtooth');
        }

        function dismissBSOD() {
            bsod.classList.remove('active');
            bsodActive = false;
            scheduleRandomBSOD();
        }

        document.addEventListener('keydown', (e) => {
            if (bsodActive) { dismissBSOD(); }
        });
        bsod.addEventListener('click', dismissBSOD);

        function scheduleRandomBSOD() {
            // Random BSOD every 2-6 minutes
            const delay = (120 + Math.random() * 240) * 1000;
            setTimeout(() => {
                if (bootState.isBootDone() && !bsodActive) triggerBSOD();
            }, delay);
        }

        // ══════════════════════════════════════════════
        // Random Error Dialogs
        // ══════════════════════════════════════════════
        const errorDialog = document.getElementById('errorDialog');
        const errorDialogTitle = document.getElementById('errorDialogTitle');
        const errorDialogText = document.getElementById('errorDialogText');
        const errorDialogIcon = document.getElementById('errorDialogIcon');

        const randomErrors = simulatorConfig.randomErrors || [
            { title: 'Explorer', text: 'This program has performed an illegal operation and will be shut down. If the problem persists, contact the program vendor.', icon: 'error' },
            { title: 'Windows', text: 'Not enough memory to complete this operation. Close some programs and try again.', icon: 'warning' },
            { title: 'RUNDLL32', text: 'Error in MMSYSTEM.DLL. Missing entry: SndPlaySoundA', icon: 'error' },
            { title: 'DrWatson Postmortem Debugger', text: 'An application error has occurred and an application error log is being generated.\n\nException: access violation (0xc0000005), Address: 0x77f9f3d1', icon: 'error' },
            { title: 'Windows Update', text: 'Windows Update has encountered an error and needs to close. We are sorry for the inconvenience. Error code: 0x80072EFD', icon: 'warning' },
            { title: 'System Resources', text: 'Warning: Your system is running low on system resources. To correct this, close some windows.', icon: 'warning' },
            { title: 'Internet Explorer', text: 'Internet Explorer has encountered a problem and needs to close. We are sorry for the inconvenience.', icon: 'error' },
            { title: 'Disk Cleanup', text: 'The disk cleanup utility could not free any space. Your hard drive may be full.', icon: 'info' }
        ];
        function showErrorDialog(err) {
            errorDialogTitle.textContent = err.title;
            errorDialogText.textContent = err.text;
            errorDialogIcon.className = 'dialog-icon dialog-icon-' + err.icon;
            errorDialog.classList.add('active');
            playErrorSound();
        }

        function closeErrorDialog() {
            errorDialog.classList.remove('active');
        }

        document.getElementById('errorOkBtn').addEventListener('click', closeErrorDialog);
        document.getElementById('errorCloseBtn').addEventListener('click', closeErrorDialog);

        function scheduleRandomError() {
            const delay = (60 + Math.random() * 180) * 1000;
            setTimeout(() => {
                if (bootState.isBootDone() && !bsodActive && !errorDialog.classList.contains('active')) {
                    const err = randomErrors[Math.floor(Math.random() * randomErrors.length)];
                    showErrorDialog(err);
                }
                scheduleRandomError();
            }, delay);
        }

        // ══════════════════════════════════════════════
        // Window Manager
        // ══════════════════════════════════════════════
        const WindowManager = window.createWindowManager();

        // Legacy helper for any code still calling bringToFront(el)
        function bringToFront(windowEl) {
            // Find the registered id for this element
            const entry = Object.values(WindowManager._windows).find(w => w.el === windowEl);
            if (entry) {
                WindowManager.bringToFront(entry.id);
            } else {
                // Fallback for unregistered windows (dialogs etc.)
                const maxZ = WindowManager._baseZ + WindowManager._stack.length + 1;
                windowEl.style.zIndex = maxZ;
            }
        }

        // ══════════════════════════════════════════════
        // Window Dragging
        // ══════════════════════════════════════════════

        // Shared overlay to prevent iframes from stealing pointer events during drag
        const dragOverlay = document.createElement('div');
        dragOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;display:none;cursor:move;';
        document.body.appendChild(dragOverlay);

        function makeDraggable(titlebarEl, windowEl) {
            let isDragging = false;
            let startX, startY, origLeft, origTop;

            function pointerDown(e) {
                // Ignore control-button clicks
                if (e.target.classList.contains('ctrl-btn')) return;

                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;

                isDragging = true;
                startX = clientX;
                startY = clientY;
                const rect = windowEl.getBoundingClientRect();
                origLeft = rect.left;
                origTop = rect.top;
                bringToFront(windowEl);
                dragOverlay.style.display = 'block';
                e.preventDefault();
            }

            function pointerMove(e) {
                if (!isDragging) return;

                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;

                const dx = clientX - startX;
                const dy = clientY - startY;

                let newLeft = origLeft + dx;
                let newTop = origTop + dy;

                // Keep the window reachable: at least 60px visible horizontally,
                // titlebar can't go above viewport or below taskbar area
                const minVisible = 60;
                const taskbarHeight = 36;
                newLeft = Math.max(-windowEl.offsetWidth + minVisible, Math.min(newLeft, window.innerWidth - minVisible));
                newTop = Math.max(0, Math.min(newTop, window.innerHeight - taskbarHeight));

                windowEl.style.left = newLeft + 'px';
                windowEl.style.top = newTop + 'px';
            }

            function pointerUp() {
                if (!isDragging) return;
                isDragging = false;
                dragOverlay.style.display = 'none';
            }

            // Mouse events
            titlebarEl.addEventListener('mousedown', pointerDown);
            document.addEventListener('mousemove', pointerMove);
            document.addEventListener('mouseup', pointerUp);

            // Touch events
            titlebarEl.addEventListener('touchstart', pointerDown, { passive: false });
            document.addEventListener('touchmove', pointerMove, { passive: false });
            document.addEventListener('touchend', pointerUp);
            document.addEventListener('touchcancel', pointerUp);
        }

        // Make all windows draggable
        makeDraggable(document.getElementById('titlebar'), document.getElementById('ieWindow'));
        makeDraggable(document.getElementById('appTitlebar'), document.getElementById('appWindow'));
        makeDraggable(document.getElementById('myComputerTitlebar'), document.getElementById('myComputerWindow'));
        makeDraggable(document.getElementById('notepadTitlebar'), document.getElementById('notepadWindow'));
        makeDraggable(document.getElementById('recycleBinTitlebar'), document.getElementById('recycleBinWindow'));

        // ══════════════════════════════════════════════
        // IE Window
        // ══════════════════════════════════════════════
        const frame = document.getElementById('browserFrame');
        const ieWindow = document.getElementById('ieWindow');
        const addressInput = document.getElementById('addressInput');
        const statusText = document.getElementById('statusText');
        const windowTitle = document.getElementById('windowTitle');
        const startButton = document.getElementById('startButton');
        const startMenu = document.getElementById('startMenu');
        const clock = document.getElementById('clock');
        const internetExplorerIcon = document.getElementById('internetExplorerIcon');
        const closeWindowBtn = document.getElementById('closeWindowBtn');
        const minimizeBtn = document.getElementById('minimizeBtn');
        const taskButton = document.getElementById('taskButton');
        const taskButtonLabel = taskButton.querySelector('span:last-child');

        // Register IE with WindowManager (iframe managed manually — IE keeps its own nav state)
        WindowManager.register('ie', {
            el: ieWindow,
            taskBtn: taskButton,
            iframe: null,       // IE manages its own iframe/navigation
            iframeSrc: null,
            hasChrome: true,
        });

        const historyStack = [];
        let historyIndex = -1;
        const homePage = 'https://example.com';

        function normalizeUrl(raw) {
            const trimmed = raw.trim();
            if (!trimmed) return homePage;
            if (trimmed === 'about:blank') return trimmed;
            if (/^https?:\/\//i.test(trimmed)) return trimmed;
            return 'https://' + trimmed;
        }

        function truncateTitle(url) {
            return url + ' - Microsoft Internet Explorer';
        }

        function navigate(url, pushHistory = true) {
            const finalUrl = normalizeUrl(url);
            statusText.textContent = 'Opening page...';
            body_loading(true);

            if (finalUrl === 'about:blank') {
                frame.src = '';
                frame.removeAttribute('src');
            } else {
                frame.src = finalUrl;
            }

            addressInput.value = finalUrl;
            const title = truncateTitle(finalUrl);
            windowTitle.textContent = title;

            const shortTitle = title.length > 30 ? title.substring(0, 28) + '...' : title;
            taskButtonLabel.textContent = shortTitle;

            if (pushHistory) {
                historyStack.splice(historyIndex + 1);
                historyStack.push(finalUrl);
                historyIndex = historyStack.length - 1;
            }
        }

        function body_loading(on) {
            if (on) {
                document.body.classList.add('loading');
                setTimeout(() => document.body.classList.remove('loading'), 2000);
            } else {
                document.body.classList.remove('loading');
            }
        }

        function openInternetExplorer() {
            WindowManager.open('ie');
            startMenu.classList.remove('open');
            startButton.classList.remove('pressed');
            playClickSound();

            if (!frame.src || frame.src === 'about:blank' || frame.src === '') {
                if (historyStack.length === 0) {
                    navigate('about:blank');
                }
            }
        }

        function closeInternetExplorer() {
            WindowManager.close('ie');
        }

        function updateClock() {
            const now = new Date();
            clock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }

        // Navigation buttons
        document.getElementById('goBtn').addEventListener('click', () => navigate(addressInput.value));
        addressInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') navigate(addressInput.value); });

        document.getElementById('homeBtn').addEventListener('click', () => navigate(homePage));
        document.getElementById('refreshBtn').addEventListener('click', () => {
            statusText.textContent = 'Refreshing...';
            if (addressInput.value && addressInput.value !== 'about:blank') {
                frame.src = addressInput.value;
            }
        });
        document.getElementById('stopBtn').addEventListener('click', () => {
            window.stop();
            statusText.textContent = 'Stopped';
        });

        document.getElementById('searchBtn').addEventListener('click', () => {
            navigate('https://www.google.com');
        });

        document.getElementById('favoritesBtn').addEventListener('click', () => {
            alert('Favorites\n\n\u2022 https://example.com\n\u2022 https://archive.org\n\u2022 https://wikipedia.org');
        });

        document.getElementById('historyBtn').addEventListener('click', () => {
            if (historyStack.length === 0) {
                alert('History is empty.');
            } else {
                alert('History\n\n' + historyStack.map((u, i) => (i === historyIndex ? '\u25b6 ' : '  ') + u).join('\n'));
            }
        });

        document.getElementById('backBtn').addEventListener('click', () => {
            if (historyIndex > 0) {
                historyIndex -= 1;
                navigate(historyStack[historyIndex], false);
            }
        });

        document.getElementById('forwardBtn').addEventListener('click', () => {
            if (historyIndex < historyStack.length - 1) {
                historyIndex += 1;
                navigate(historyStack[historyIndex], false);
            }
        });

        frame.addEventListener('load', () => {
            statusText.textContent = 'Done';
            body_loading(false);
        });

        // ══════════════════════════════════════════════
        // App Window (experiment apps)
        // ══════════════════════════════════════════════
        const appWindow = document.getElementById('appWindow');
        const appFrame = document.getElementById('appFrame');
        const appWindowTitle = document.getElementById('appWindowTitle');
        const appStatusText = document.getElementById('appStatusText');
        const appMinimizeBtn = document.getElementById('appMinimizeBtn');
        const appCloseBtn = document.getElementById('appCloseBtn');
        const appTaskButton = document.getElementById('appTaskButton');
        const appTaskLabel = document.getElementById('appTaskLabel');

        // App window: iframe src is dynamic, managed manually in openApp
        WindowManager.register('app', {
            el: appWindow,
            taskBtn: appTaskButton,
            iframe: appFrame,
            iframeSrc: null,  // set dynamically per openApp call
            hasChrome: true,
        });

        function openApp(title, url) {
            appWindowTitle.textContent = title;
            appStatusText.textContent = 'Opening...';
            appTaskLabel.textContent = title.length > 22 ? title.substring(0, 20) + '...' : title;
            // Set dynamic iframe src before opening
            WindowManager.get('app').iframeSrc = url;
            appFrame.src = url;
            WindowManager.open('app');
            startMenu.classList.remove('open');
            startButton.classList.remove('pressed');
            closeProgramsSubmenu();
            body_loading(true);
            playClickSound();
        }

        // ══════════════════════════════════════════════
        // Winamp Window
        // ══════════════════════════════════════════════
        const winampWindow = document.getElementById('winampWindow');
        const winampFrame = document.getElementById('winampFrame');
        const winampTaskBtn = document.getElementById('winampTaskBtn');

        WindowManager.register('winamp', {
            el: winampWindow,
            taskBtn: winampTaskBtn,
            iframe: winampFrame,
            iframeSrc: './applications/winamp-player/index.html',
            hasChrome: false,
        });

        function openWinamp() {
            WindowManager.open('winamp');
            startMenu.classList.remove('open');
            startButton.classList.remove('pressed');
            closeProgramsSubmenu();
            playClickSound();
        }

        function closeWinamp() {
            WindowManager.close('winamp');
        }

        document.getElementById('winampMinBtn').addEventListener('click', () => WindowManager.minimize('winamp'));
        document.getElementById('winampCloseBtn').addEventListener('click', closeWinamp);
        winampTaskBtn.addEventListener('click', () => WindowManager.toggleFromTaskbar('winamp'));
        makeDraggable(document.getElementById('winampTitlebar'), winampWindow);

        // ══════════════════════════════════════════════
        // Minesweeper Window
        // ══════════════════════════════════════════════
        const minesweeperWindow = document.getElementById('minesweeperWindow');
        const minesweeperFrame = document.getElementById('minesweeperFrame');
        const minesweeperTaskBtn = document.getElementById('minesweeperTaskBtn');

        WindowManager.register('minesweeper', {
            el: minesweeperWindow,
            taskBtn: minesweeperTaskBtn,
            iframe: minesweeperFrame,
            iframeSrc: './applications/minesweeper/index.html',
            hasChrome: false,
        });

        function openMinesweeper() {
            WindowManager.open('minesweeper');
            startMenu.classList.remove('open');
            startButton.classList.remove('pressed');
            closeProgramsSubmenu();
            playClickSound();
        }

        function closeMinesweeper() {
            WindowManager.close('minesweeper');
        }

        document.getElementById('minesweeperMinBtn').addEventListener('click', () => WindowManager.minimize('minesweeper'));
        document.getElementById('minesweeperCloseBtn').addEventListener('click', closeMinesweeper);
        minesweeperTaskBtn.addEventListener('click', () => WindowManager.toggleFromTaskbar('minesweeper'));
        makeDraggable(document.getElementById('minesweeperTitlebar'), minesweeperWindow);

        // Listen for minesweeper resize messages
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'minesweeper-resize') {
                const titlebarHeight = document.getElementById('minesweeperTitlebar').offsetHeight;
                const viewBorder = 4; // 2px inset border on .view
                minesweeperWindow.style.width = (e.data.width + viewBorder) + 'px';
                minesweeperWindow.style.height = (e.data.height + titlebarHeight + viewBorder) + 'px';
            }
        });

        function closeApp() {
            WindowManager.close('app');
        }

        appFrame.addEventListener('load', () => {
            appStatusText.textContent = 'Done';
            body_loading(false);
        });

        appMinimizeBtn.addEventListener('click', () => WindowManager.minimize('app'));
        appCloseBtn.addEventListener('click', closeApp);
        appTaskButton.addEventListener('click', () => WindowManager.toggleFromTaskbar('app'));

        // ══════════════════════════════════════════════
        // My Computer Window
        // ══════════════════════════════════════════════
        const myComputerWindow = document.getElementById('myComputerWindow');
        const myComputerTaskBtn = document.getElementById('myComputerTaskBtn');

        WindowManager.register('myComputer', {
            el: myComputerWindow,
            taskBtn: myComputerTaskBtn,
            iframe: null,
            iframeSrc: null,
            hasChrome: true,
        });

        function openMyComputer() {
            WindowManager.open('myComputer');
            startMenu.classList.remove('open');
            startButton.classList.remove('pressed');
            playClickSound();
        }

        function closeMyComputer() {
            WindowManager.close('myComputer');
        }

        document.getElementById('myComputerCloseBtn').addEventListener('click', closeMyComputer);
        document.getElementById('myComputerMinBtn').addEventListener('click', () => WindowManager.minimize('myComputer'));
        myComputerTaskBtn.addEventListener('click', () => WindowManager.toggleFromTaskbar('myComputer'));

        // Drive click actions
        document.getElementById('driveA').addEventListener('dblclick', () => {
            showErrorDialog({ title: 'A:\\', text: 'A:\\ is not accessible.\n\nThe device is not ready.', icon: 'error' });
        });
        document.getElementById('driveC').addEventListener('dblclick', () => {
            showErrorDialog({ title: 'Local Disk (C:)', text: 'Access to C:\\ is restricted by system policy.\n\nContact your system administrator.', icon: 'warning' });
        });
        document.getElementById('driveD').addEventListener('dblclick', () => {
            showErrorDialog({ title: 'D:\\', text: 'D:\\ is not accessible.\n\nPlease insert a disc into drive D:.', icon: 'error' });
        });

        // ══════════════════════════════════════════════
        // Notepad
        // ══════════════════════════════════════════════
        const notepadWindow = document.getElementById('notepadWindow');
        const notepadTaskBtn = document.getElementById('notepadTaskBtn');
        const notepadText = document.getElementById('notepadText');

        WindowManager.register('notepad', {
            el: notepadWindow,
            taskBtn: notepadTaskBtn,
            iframe: null,
            iframeSrc: null,
            hasChrome: true,
            onOpen: () => notepadText.focus(),
        });

        function openNotepad() {
            WindowManager.open('notepad');
            startMenu.classList.remove('open');
            startButton.classList.remove('pressed');
            closeProgramsSubmenu();
            playClickSound();
        }

        function closeNotepad() {
            WindowManager.close('notepad');
        }

        document.getElementById('notepadCloseBtn').addEventListener('click', closeNotepad);
        document.getElementById('notepadMinBtn').addEventListener('click', () => WindowManager.minimize('notepad'));
        notepadTaskBtn.addEventListener('click', () => WindowManager.toggleFromTaskbar('notepad'));

        // ══════════════════════════════════════════════
        // Recycle Bin
        // ══════════════════════════════════════════════
        const recycleBinWindow = document.getElementById('recycleBinWindow');
        const recycleBinTaskBtn = document.getElementById('recycleBinTaskBtn');

        WindowManager.register('recycleBin', {
            el: recycleBinWindow,
            taskBtn: recycleBinTaskBtn,
            iframe: null,
            iframeSrc: null,
            hasChrome: true,
        });

        function openRecycleBin() {
            WindowManager.open('recycleBin');
            startMenu.classList.remove('open');
            startButton.classList.remove('pressed');
            playClickSound();
        }

        function closeRecycleBin() {
            WindowManager.close('recycleBin');
        }

        document.getElementById('recycleBinCloseBtn').addEventListener('click', closeRecycleBin);
        document.getElementById('recycleBinMinBtn').addEventListener('click', () => WindowManager.minimize('recycleBin'));
        recycleBinTaskBtn.addEventListener('click', () => WindowManager.toggleFromTaskbar('recycleBin'));

        // ══════════════════════════════════════════════
        // Desktop Icons - open on double-click (or tap)
        // ══════════════════════════════════════════════
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const appEventType = isTouchDevice ? 'click' : 'dblclick';

        if (isTouchDevice) {
            internetExplorerIcon.addEventListener('click', openInternetExplorer);
        } else {
            internetExplorerIcon.addEventListener('dblclick', openInternetExplorer);
        }

        document.getElementById('iconMyComputer').addEventListener(appEventType, openMyComputer);
        document.getElementById('iconRecycleBin').addEventListener(appEventType, openRecycleBin);
        document.getElementById('qlIE').addEventListener('click', openInternetExplorer);

        // Experiment app icons
        const experimentApps = simulatorConfig.experimentApps || [
            { id: 'iconAsciiRunner',     title: 'ASCII Runner',      url: './applications/ascii-runner/index.html' },
        ];

        experimentApps.forEach(({ id, title, url }) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(appEventType, () => openApp(title, url));
        });

        // Dedicated icon handlers for Winamp and Minesweeper.
        // These icons have their own windows and must never go through openApp(),
        // so register them after the experimentApps loop and guard against duplicates.
        const dedicatedIcons = { iconWinamp: openWinamp, iconMinesweeper: openMinesweeper };
        Object.entries(dedicatedIcons).forEach(([id, handler]) => {
            const el = document.getElementById(id);
            if (!el) return;
            // Remove any openApp listener that the experimentApps loop may have added
            // (defensive: in case config accidentally includes these ids)
            const clone = el.cloneNode(true);
            el.parentNode.replaceChild(clone, el);
            clone.addEventListener(appEventType, handler);
        });

        // Minimize / close IE
        minimizeBtn.addEventListener('click', () => WindowManager.minimize('ie'));
        taskButton.addEventListener('click', () => WindowManager.toggleFromTaskbar('ie'));
        closeWindowBtn.addEventListener('click', closeInternetExplorer);

        // Desktop icon selection
        document.querySelectorAll('.icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                document.querySelectorAll('.icon').forEach(i => i.classList.remove('selected'));
                icon.classList.add('selected');
            });
        });

        // Click desktop to deselect
        document.querySelector('.desktop').addEventListener('click', (e) => {
            if (e.target === e.currentTarget || e.target.classList.contains('desktop-icons')) {
                document.querySelectorAll('.icon').forEach(i => i.classList.remove('selected'));
            }
        });

        // ══════════════════════════════════════════════
        // Start Menu & Submenus
        // ══════════════════════════════════════════════
        const programsSubmenu = document.getElementById('programsSubmenu');

        startButton.addEventListener('click', (e) => {
            e.stopPropagation();
            startMenu.classList.toggle('open');
            startButton.classList.toggle('pressed', startMenu.classList.contains('open'));
            if (!startMenu.classList.contains('open')) {
                closeProgramsSubmenu();
            }
            playClickSound();
        });

        document.addEventListener('click', (e) => {
            if (!startButton.contains(e.target) && !startMenu.contains(e.target) && !programsSubmenu.contains(e.target)) {
                startMenu.classList.remove('open');
                startButton.classList.remove('pressed');
                closeProgramsSubmenu();
            }
        });

        // Programs submenu
        const menuPrograms = document.getElementById('menuPrograms');
        menuPrograms.addEventListener('mouseenter', () => {
            const rect = menuPrograms.getBoundingClientRect();
            programsSubmenu.style.bottom = (window.innerHeight - rect.top - rect.height) + 'px';
            programsSubmenu.classList.add('open');
        });

        function closeProgramsSubmenu() {
            programsSubmenu.classList.remove('open');
        }

        // Close submenu when leaving the Programs area
        startMenu.addEventListener('mouseleave', (e) => {
            if (!programsSubmenu.contains(e.relatedTarget)) {
                closeProgramsSubmenu();
            }
        });

        programsSubmenu.addEventListener('mouseleave', (e) => {
            if (!startMenu.contains(e.relatedTarget)) {
                closeProgramsSubmenu();
            }
        });

        // Submenu items
        document.getElementById('subIE').addEventListener('click', () => {
            openInternetExplorer();
            closeProgramsSubmenu();
        });

        document.getElementById('subNotepad').addEventListener('click', () => {
            openNotepad();
            closeProgramsSubmenu();
        });

        document.getElementById('subAsciiRunner').addEventListener('click', () => {
            openApp('ASCII Runner', './applications/ascii-runner/index.html');
            closeProgramsSubmenu();
        });

        document.getElementById('subWinamp').addEventListener('click', () => {
            openWinamp();
            closeProgramsSubmenu();
        });

        document.getElementById('subMinesweeper').addEventListener('click', () => {
            openMinesweeper();
            closeProgramsSubmenu();
        });

        document.getElementById('subAccessories').addEventListener('click', () => {
            openNotepad();
        });

        document.getElementById('subGames').addEventListener('click', () => {
            showErrorDialog({ title: 'Games', text: 'Solitaire has encountered an error and needs to close.\n\nWould you like to send an error report?', icon: 'error' });
            closeProgramsSubmenu();
            startMenu.classList.remove('open');
            startButton.classList.remove('pressed');
        });

        // Help menu item
        document.getElementById('menuHelp').addEventListener('click', () => {
            showErrorDialog({ title: 'Windows Help', text: 'Help is not available for this program.\n\nTry searching online at microsoft.com for help topics.', icon: 'info' });
            startMenu.classList.remove('open');
            startButton.classList.remove('pressed');
        });

        // ══════════════════════════════════════════════
        // Run Dialog
        // ══════════════════════════════════════════════
        const runDialog = document.getElementById('runDialog');
        const runInput = document.getElementById('runInput');

        document.getElementById('menuRun').addEventListener('click', () => {
            startMenu.classList.remove('open');
            startButton.classList.remove('pressed');
            runDialog.classList.add('active');
            runInput.value = '';
            runInput.focus();
            playClickSound();
        });

        document.getElementById('runCancelBtn').addEventListener('click', () => {
            runDialog.classList.remove('active');
        });
        document.getElementById('runCloseBtn').addEventListener('click', () => {
            runDialog.classList.remove('active');
        });

        const runActionHandlers = {
            openNotepad,
            openMyComputer,
            openInternetExplorer,
            openWinamp,
            openMinesweeper
        };

        document.getElementById('runOkBtn').addEventListener('click', () => {
            const rawCommand = runInput.value.trim();
            const cmd = rawCommand.toLowerCase();
            runDialog.classList.remove('active');

            if (!cmd) return;

            const actionName = (simulatorConfig.runActions || {})[cmd];
            if (actionName && runActionHandlers[actionName]) {
                runActionHandlers[actionName]();
            } else if (cmd === 'calc' || cmd === 'calc.exe') {
                showErrorDialog({ title: 'Calculator', text: 'Windows cannot find \'calc.exe\'. Make sure you typed the name correctly, and then try again.', icon: 'error' });
            } else if (cmd.startsWith('http://') || cmd.startsWith('https://') || cmd.startsWith('www.')) {
                openInternetExplorer();
                navigate(cmd);
            } else {
                showErrorDialog({ title: 'Run', text: 'Windows cannot find \'' + rawCommand + '\'. Make sure you typed the name correctly, and then try again. To search for a file, click the Start button, and then click Search.', icon: 'error' });
            }
        });
        runInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('runOkBtn').click();
            if (e.key === 'Escape') runDialog.classList.remove('active');
        });

        // ══════════════════════════════════════════════
        // Right-click Context Menu
        // ══════════════════════════════════════════════
        const contextMenu = document.getElementById('contextMenu');

        document.getElementById('theDesktop').addEventListener('contextmenu', (e) => {
            if (e.target.closest('.window') || e.target.closest('.icon')) return;
            e.preventDefault();
            contextMenu.style.left = e.clientX + 'px';
            contextMenu.style.top = e.clientY + 'px';
            contextMenu.classList.add('open');
        });

        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.classList.remove('open');
            }
        });

        contextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            contextMenu.classList.remove('open');
            if (action === 'refresh') {
                body_loading(true);
            } else if (action === 'properties') {
                showErrorDialog({
                    title: 'Display Properties',
                    text: 'Windows Me\nMillennium Edition\n\nVersion 4.90.3000\n\nCopyright \u00A9 Microsoft Corp. 1981-2000\n\nRegistered to: User\nProduct ID: 55274-OEM-0011903-00102',
                    icon: 'info'
                });
            } else if (action === 'new') {
                openNotepad();
            } else if (action === 'arrange') {
                playClickSound();
            }
        });

        // ══════════════════════════════════════════════
        // Shutdown
        // ══════════════════════════════════════════════
        document.getElementById('menuShutdown').addEventListener('click', () => {
            startMenu.classList.remove('open');
            startButton.classList.remove('pressed');
            document.body.style.background = '#000';
            theDesktop.style.display = 'none';
            theTaskbar.style.display = 'none';
            startMenu.style.display = 'none';

            const shutdownMsg = document.createElement('div');
            shutdownMsg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#FF8000;font-size:24px;font-family:"MS Sans Serif",sans-serif;background:#000;z-index:99998;';
            shutdownMsg.innerHTML = 'It\'s now safe to turn off<br>your computer.';
            shutdownMsg.style.textAlign = 'center';
            document.body.appendChild(shutdownMsg);

        });

        // ══════════════════════════════════════════════
        // Show Desktop quick launch
        // ══════════════════════════════════════════════
        document.querySelector('.ql-desktop').addEventListener('click', () => {
            WindowManager.minimizeAll();
        });

        // ══════════════════════════════════════════════
        // Clock + Tooltip
        // ══════════════════════════════════════════════
        const clockEl = document.getElementById('clock');
        const clockTooltip = document.getElementById('clockTooltip');

        clockEl.addEventListener('mouseenter', (e) => {
            const now = new Date();
            clockTooltip.textContent = now.toLocaleDateString(undefined, {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            clockTooltip.style.display = 'block';
            clockTooltip.style.left = (e.clientX - 80) + 'px';
            clockTooltip.style.top = (e.clientY - 24) + 'px';
        });
        clockEl.addEventListener('mouseleave', () => {
            clockTooltip.style.display = 'none';
        });

        // Volume icon click
        document.getElementById('trayVolume').addEventListener('click', () => {
            showErrorDialog({ title: 'Volume Control', text: 'There are no active mixer devices available. To install mixer devices, go to Control Panel, click Printers and Other Hardware, and then click Add Hardware.\n\nThis program will now close.', icon: 'error' });
        });

        setInterval(updateClock, 1000);
        updateClock();
    
