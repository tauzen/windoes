import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import ShellApp from './shell-app.jsx';

let bootTimerId = null;

async function bootstrap() {
  const appRoot = document.getElementById('app');
  if (!appRoot) {
    throw new Error('Missing #app root element');
  }

  const root = createRoot(appRoot);
  flushSync(() => {
    root.render(React.createElement(ShellApp));
  });

  await import('./sound.js');
  await import('./window-manager.jsx');
  const { runBootSequence } = await import('./boot.js');
  await import('./bsod.jsx');
  await import('./ie-window.jsx');
  await import('./app-windows.jsx');
  await import('./utility-windows.jsx');

  bootTimerId = window.setTimeout(runBootSequence, 300);
}

bootstrap();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (bootTimerId) {
      window.clearTimeout(bootTimerId);
      bootTimerId = null;
    }
  });
}
