import WindoesApp from '../app-state.js';

export default function Desktop({ desktopRef }) {
    const bootDone = WindoesApp.state.use((s) => s.boot.done);

    return (
        <div ref={desktopRef} className="desktop" id="theDesktop" style={{ display: bootDone ? '' : 'none' }}>
            <div className="desktop-icons" id="desktopIcons"></div>
        </div>
    );
}
