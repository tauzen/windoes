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

            <div className="context-menu" id="contextMenu">
                <div className="context-menu-item" data-action="arrange">Arrange Icons</div>
                <div className="context-menu-item" data-action="lineup">Line Up Icons</div>
                <div className="context-menu-sep"></div>
                <div className="context-menu-item" data-action="refresh">Refresh</div>
                <div className="context-menu-sep"></div>
                <div className="context-menu-item disabled" data-action="paste">Paste</div>
                <div className="context-menu-item disabled" data-action="paste-shortcut">Paste Shortcut</div>
                <div className="context-menu-sep"></div>
                <div className="context-menu-item" data-action="new">New         ▶</div>
                <div className="context-menu-sep"></div>
                <div className="context-menu-item" data-action="properties">Properties</div>
            </div>

            <div className="dialog-overlay run-dialog" id="runDialog">
                <div className="dialog-box" style={{ minWidth: '380px' }}>
                    <div className="dialog-titlebar">
                        <span>Run</span>
                        <button className="ctrl-btn" id="runCloseBtn" aria-label="Close">×</button>
                    </div>
                    <div className="dialog-body">
                        <div className="run-icon-area">
                            <div className="dialog-icon" style={{ background: '#C0C0C0', border: '2px solid #808080', borderRadius: '2px' }}>
                                <div style={{ position: 'absolute', top: '4px', left: '4px', right: '4px', height: '10px', background: '#000080' }}></div>
                                <div style={{ position: 'absolute', bottom: '4px', left: '4px', width: '12px', height: '8px', background: '#fff', border: '1px solid #808080' }}></div>
                            </div>
                            <div className="dialog-text">Type the name of a program, folder, document, or Internet resource, and Windoes will open it for you.</div>
                        </div>
                        <div className="run-row">
                            <label>Open:</label>
                            <input type="text" id="runInput" />
                        </div>
                    </div>
                    <div className="dialog-buttons">
                        <button className="dialog-btn" id="runOkBtn">OK</button>
                        <button className="dialog-btn" id="runCancelBtn">Cancel</button>
                        <button className="dialog-btn">Browse...</button>
                    </div>
                </div>
            </div>

            <div className="clock-tooltip" id="clockTooltip"></div>

            <RenderRegistryPortals />
        </>
    );
}
