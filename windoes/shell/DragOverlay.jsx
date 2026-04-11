import { useEffect, useRef } from 'react';
import WindoesApp from '../app-state.js';

export default function DragOverlay() {
    const overlayRef = useRef(null);

    useEffect(() => {
        const overlay = overlayRef.current;
        if (!overlay) return;

        function show() {
            overlay.classList.add('active');
        }

        function hide() {
            overlay.classList.remove('active');
        }

        WindoesApp.dragOverlay = { show, hide };

        return () => {
            delete WindoesApp.dragOverlay;
        };
    }, []);

    return <div ref={overlayRef} id="dragOverlay"></div>;
}
