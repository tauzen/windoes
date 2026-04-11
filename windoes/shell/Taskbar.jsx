import WindoesApp from '../app-state.js';

export default function Taskbar({ taskbarRef, startButtonRef }) {
    const bootDone = WindoesApp.state.use((s) => s.boot.done);

    return (
        <div ref={taskbarRef} className="taskbar" id="theTaskbar" style={{ display: bootDone ? '' : 'none' }}>
            <button
                ref={startButtonRef}
                className="start-btn"
                id="startButton"
                onClick={() => {
                    if (typeof WindoesApp.menu.toggleStartMenu === 'function') {
                        WindoesApp.menu.toggleStartMenu();
                    }
                }}
            >
                <span className="start-flag"><span className="f1"></span><span className="f2"></span><span className="f3"></span><span className="f4"></span></span>
                Start
            </button>
            <div className="quick-launch">
                <span className="ql-btn ql-ie" id="qlIE" title="Launch Internet Explorer"></span>
                <span className="ql-btn ql-desktop" title="Show Desktop"></span>
            </div>
            <div className="task-divider"></div>
            <div className="task-area" id="taskArea"></div>
            <div className="tray">
                <span className="tray-volume" aria-label="Volume" id="trayVolume"></span>
                <span id="clock">12:00 PM</span>
            </div>
        </div>
    );
}
