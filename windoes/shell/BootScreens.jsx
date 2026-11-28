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
        <img src="img/boot.png" alt="Windoes XD" className="boot-image" />
        <div className="boot-band" id="bootBand" aria-hidden="true"></div>
      </div>

      <div className="bsod" id="bsod">
        <div className="bsod-page">
          <div className="bsod-title">
            <span className="bsod-header"> Windoes </span>
          </div>
          <pre className="bsod-body" id="bsodText"></pre>
          <div className="bsod-footer" id="bsodFooter"></div>
        </div>
      </div>
    </>
  );
}
