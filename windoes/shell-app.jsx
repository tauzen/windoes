import { useRef } from 'react';
import { RenderRegistryPortals } from './react-view.js';
import BootScreens from './shell/BootScreens.jsx';
import Desktop from './shell/Desktop.jsx';
import Taskbar from './shell/Taskbar.jsx';
import StartMenu from './shell/StartMenu.jsx';
import DesktopContextMenu from './shell/DesktopContextMenu.jsx';
import RunDialog from './shell/RunDialog.jsx';
import ErrorDialog from './shell/ErrorDialog.jsx';
import NotepadDialogs from './shell/NotepadDialogs.jsx';
import ExplorerContextMenu from './shell/ExplorerContextMenu.jsx';
import DragOverlay from './shell/DragOverlay.jsx';

export default function ShellApp() {
  const startButtonRef = useRef(null);
  const desktopRef = useRef(null);
  const taskbarRef = useRef(null);

  return (
    <>
      <BootScreens />
      <Desktop desktopRef={desktopRef} />
      <Taskbar taskbarRef={taskbarRef} startButtonRef={startButtonRef} />
      <StartMenu startButtonRef={startButtonRef} />
      <DesktopContextMenu />
      <RunDialog />
      <ErrorDialog />
      <NotepadDialogs />
      <ExplorerContextMenu />
      <DragOverlay />
      <RenderRegistryPortals />
    </>
  );
}
