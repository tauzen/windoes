import WindoesApp from '../app-state.js';

export default function DragOverlay() {
    const isActive = WindoesApp.state.use((s) => !!(s.drag && s.drag.active));

    return <div id="dragOverlay" className={isActive ? 'active' : ''}></div>;
}
