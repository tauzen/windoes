import WindoesApp from '../app-state.js';

export default function BootScreens() {
  const boot = WindoesApp.state.use((s) => s.boot);

  const bootBiosClass = `boot-bios${boot.phase !== 'bios' ? ' hidden' : ''}`;
  const bootScreenClass = `boot-screen${boot.phase === 'splash' ? '' : ' hidden'}`;

  return (
    <>
      <div className={bootBiosClass} id="bootBios">
        {
          'Award Modular BIOS v6.00PG, An Energy Star Ally\nCopyright (C) 1984-2000, Award Software, Inc.\n\nIntel Pentium III 800MHz Processor\nMemory Test: '
        }
        <span id="biosMemory">{boot.biosMemory}</span>
        {
          'K OK\n\nDetecting Primary Master... WDC AC310200R\nDetecting Primary Slave... GENERIC CD-ROM\nDetecting Secondary Master... None\nDetecting Secondary Slave... None\n\n'
        }
        <span id="biosStatus">{boot.biosStatus}</span>
      </div>

      <div className={bootScreenClass} id="bootScreen">
        <div className="boot-logo">
          <img src="img/boot.png" alt="Windoes XD" className="boot-image" />
          <div className="boot-progress-container">
            <div
              className="boot-progress-bar"
              id="bootProgress"
              style={{ width: `${boot.splashProgress}%` }}
            ></div>
          </div>
          <div className="boot-status" id="bootStatus">
            {boot.splashStatus}
          </div>
        </div>
      </div>

      <div className="bsod" id="bsod">
        <span className="bsod-header"> Windoes </span>
        <pre id="bsodText"></pre>
      </div>
    </>
  );
}
