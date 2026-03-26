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
        // Don't drag maximized windows
        if (windowEl.classList.contains('maximized')) return;

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

// Register on shared namespace
WindoesApp.helpers.makeDraggable = makeDraggable;

// Note: makeDraggable calls are now handled by WindowManager.register()
// via the draggable config option (default: true).
