// ══════════════════════════════════════════════
// Window Dragging
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { DRAG_MIN_VISIBLE_PX, TASKBAR_DRAG_RESERVE_PX } from './constants.js';

export function makeDraggable(titlebarEl, windowEl) {
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
        const sourceId = windowEl.dataset.windowId || windowEl.id;

        WindoesApp.state.dispatch({
            type: 'WINDOW_INTERACTION_DISPATCH',
            command: { type: 'BRING_TO_FRONT', id: sourceId },
        });

        WindoesApp.state.dispatch({
            type: 'DRAG_START',
            sourceId,
            startX,
            startY,
            origLeft,
            origTop,
        });

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

        // Keep the window reachable
        newLeft = Math.max(-windowEl.offsetWidth + DRAG_MIN_VISIBLE_PX, Math.min(newLeft, window.innerWidth - DRAG_MIN_VISIBLE_PX));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - TASKBAR_DRAG_RESERVE_PX));

        WindoesApp.state.dispatch({
            type: 'DRAG_MOVE',
            sourceId: windowEl.dataset.windowId || windowEl.id,
            left: newLeft,
            top: newTop,
        });
    }

    function pointerUp() {
        if (!isDragging) return;
        isDragging = false;
        WindoesApp.state.dispatch({ type: 'DRAG_END' });
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
