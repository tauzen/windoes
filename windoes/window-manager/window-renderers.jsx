import WindoesApp from '../app-state.js';
import { renderIntoSync } from '../react-view.js';

function WindowTitlebar({ windowId, template }) {
  const isActive = WindoesApp.state.use((s) => {
    const win = s.windows?.byId?.[windowId];
    return !!(win && win.focused && win.open && !win.minimized);
  });

  const hasMaxBtn = template.maximizeBtn || template.maximizeBtnId;

  return (
    <div
      className={isActive ? 'titlebar' : 'titlebar inactive'}
      {...(template.titlebarId ? { id: template.titlebarId } : {})}
    >
      <div className="title-left">
        {(template.titleIcon || template.titleLogoClass) && (
          <span
            className={template.titleLogoClass || 'app-title-logo ' + (template.titleIcon || '')}
            aria-hidden={true}
          ></span>
        )}
        <span {...(template.titleSpanId ? { id: template.titleSpanId } : {})}>
          {template.title}
        </span>
      </div>
      <div className="window-controls">
        {template.minimizeBtnId && (
          <button
            className="ctrl-btn"
            id={template.minimizeBtnId}
            aria-label="Minimize"
            type="button"
          >
            _
          </button>
        )}
        {hasMaxBtn && (
          <button
            className="ctrl-btn ctrl-max"
            type="button"
            aria-label="Maximize"
            {...(template.maximizeBtnId ? { id: template.maximizeBtnId } : {})}
          >
            □
          </button>
        )}
        {template.closeBtnId && (
          <button className="ctrl-btn" id={template.closeBtnId} aria-label="Close" type="button">
            ×
          </button>
        )}
      </div>
    </div>
  );
}

function WindowShell({ windowId, template }) {
  const viewStyle = template.viewStyle;
  const notepadFileMenuOpen = WindoesApp.state.use((s) => !!s.notepad?.fileMenuOpen);

  return (
    <>
      <WindowTitlebar windowId={windowId} template={template} />

      {template.menubar && (
        <div className="menubar" role="menubar" aria-label={`${template.title} menu`}>
          {template.menubar.map((item, index) => {
            if (typeof item === 'string') {
              return (
                <button
                  key={`menu-${index}`}
                  type="button"
                  role="menuitem"
                  className="menubar-item"
                >
                  {item}
                </button>
              );
            }
            return (
              <button
                key={`menu-${item.id || index}`}
                type="button"
                role="menuitem"
                className="menubar-item"
                {...(item.id ? { id: item.id } : {})}
                {...(item.id === 'notepadFileMenu' ? { 'aria-haspopup': 'menu' } : {})}
                {...(item.id === 'notepadFileMenu'
                  ? { 'aria-controls': 'notepadFileDropdown' }
                  : {})}
                {...(item.id === 'notepadFileMenu'
                  ? { 'aria-expanded': notepadFileMenuOpen ? 'true' : 'false' }
                  : {})}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {template.toolbar && <div>{template.toolbar}</div>}

      {template.view !== undefined && (
        <div className="view" {...(viewStyle ? { style: viewStyle } : {})}>
          {template.view}
        </div>
      )}

      {template.statusBar && <div className="status">{template.statusBar}</div>}
    </>
  );
}

export function buildHeadlessEl(tmpl) {
  const section = document.createElement('section');
  section.className =
    'window window-headless hidden' + (tmpl.className ? ' ' + tmpl.className : '');
  section.id = tmpl.id;
  section.setAttribute('aria-label', tmpl.ariaLabel || tmpl.title);
  if (tmpl.style) section.style.cssText = tmpl.style;
  if (tmpl.useSharedWindowComponent) {
    section.dataset.windowComponent = 'true';
  }

  renderIntoSync(section, <>{tmpl.view || null}</>);

  return section;
}

export function buildWindowEl(tmpl, windowId) {
  const section = document.createElement('section');
  section.className = 'window hidden' + (tmpl.className ? ' ' + tmpl.className : '');
  section.id = tmpl.id;
  section.setAttribute('aria-label', tmpl.ariaLabel || tmpl.title);
  if (tmpl.style) section.style.cssText = tmpl.style;
  if (tmpl.useSharedWindowComponent) {
    section.dataset.windowComponent = 'true';
  }

  renderIntoSync(section, <WindowShell windowId={windowId} template={tmpl} />);

  return section;
}

export function buildTaskBtn(cfg) {
  const btn = document.createElement('button');
  btn.className = 'task-button';
  btn.style.display = 'none';
  if (cfg.id) btn.id = cfg.id;

  renderIntoSync(
    btn,
    <>
      <span className={`task-icon ${cfg.icon}`} aria-hidden={true}></span>
      <span {...(cfg.labelId ? { id: cfg.labelId } : {})}>{cfg.label}</span>
    </>
  );

  return btn;
}
