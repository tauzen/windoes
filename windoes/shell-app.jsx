import { useEffect, useRef } from 'react';
import WindoesApp from './app-state.js';
import { RenderRegistryPortals } from './react-view.js';

export default function ShellApp() {
    const boot = WindoesApp.state.use((s) => s.boot);
    const startButtonRef = useRef(null);
    const desktopRef = useRef(null);
    const taskbarRef = useRef(null);

    useEffect(() => {
        WindoesApp.dom.startButton = startButtonRef.current;
        WindoesApp.dom.theDesktop = desktopRef.current;
        WindoesApp.dom.theTaskbar = taskbarRef.current;
    }, []);

    const bootBiosClass = `boot-bios${boot.phase !== 'bios' ? ' hidden' : ''}`;
    const bootScreenClass = `boot-screen${boot.phase === 'splash' ? '' : ' hidden'}`;

    return (
        <>
            <div className={bootBiosClass} id="bootBios">
                {'Award Modular BIOS v6.00PG, An Energy Star Ally\nCopyright (C) 1984-2000, Award Software, Inc.\n\nIntel Pentium III 800MHz Processor\nMemory Test: '}
                <span id="biosMemory">{boot.biosMemory}</span>
                {'K OK\n\nDetecting Primary Master... WDC AC310200R\nDetecting Primary Slave... GENERIC CD-ROM\nDetecting Secondary Master... None\nDetecting Secondary Slave... None\n\n'}
                <span id="biosStatus">{boot.biosStatus}</span>
            </div>

            <div className={bootScreenClass} id="bootScreen">
                <div className="boot-logo">
                    <img src="img/boot.png" alt="Windoes XD" className="boot-image" />
                    <div className="boot-progress-container">
                        <div className="boot-progress-bar" id="bootProgress" style={{ width: `${boot.splashProgress}%` }}></div>
                    </div>
                    <div className="boot-status" id="bootStatus">{boot.splashStatus}</div>
                </div>
            </div>

            <div className="bsod" id="bsod">
                <span className="bsod-header"> Windoes </span>
                <pre id="bsodText"></pre>
            </div>

            <div ref={desktopRef} className="desktop" id="theDesktop" style={{ display: boot.done ? '' : 'none' }}>
                <div className="desktop-icons" id="desktopIcons"></div>
            </div>

            <div ref={taskbarRef} className="taskbar" id="theTaskbar" style={{ display: boot.done ? '' : 'none' }}>
                <button ref={startButtonRef} className="start-btn" id="startButton">
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

            <RenderRegistryPortals />
        </>
    );
}
