/**
 * VirtualBoks — a VirtualBox-shaped front end for the v86 PC emulator.
 *
 * The emulator core, its WebAssembly CPU and the firmware blobs live in
 * `vendor/` and are staged by `scripts/fetch-vm-assets.mjs` at install time.
 * Guest images are far too large to ship, so a machine points either at a URL
 * or at a file the user picks from their own disk.
 *
 * The manager UI deliberately works with no emulator present: `vendor/` may be
 * missing (a checkout that skipped `postinstall`) and every guest image is a
 * network fetch that can fail. Those cases surface in the status bar instead of
 * leaving a blank window.
 */
(function () {
  'use strict';

  var VENDOR = './vendor/';
  var ENGINE_SRC = VENDOR + 'libv86.js';
  var STORAGE_KEY = 'virtualboks.machines.v1';

  var ENGINE_MISSING =
    'Emulator core not found in applications/virtualboks/vendor/. ' +
    'Run `npm run assets:vm` to download it, then reopen VirtualBoks.';

  // ── Built-in machines ────────────────────────────────────────────────
  // The guest images come from the host the v86 project documents for its own
  // demos. They are third-party downloads: a machine only reaches the network
  // when it is started, and a failure is reported in the status bar.
  var IMAGE_HOST = 'https://i.copy.sh/';

  var BUILT_INS = [
    {
      id: 'builtin-linux26',
      name: 'Linux 2.6',
      os: 'Buildroot Linux (live CD)',
      memoryMB: 128,
      media: { kind: 'cdrom', source: 'url', url: IMAGE_HOST + 'linux.iso' },
      consoleTab: 'display',
      note: 'About 5 MB. Boots to a BusyBox shell on the VGA console.',
    },
    {
      id: 'builtin-buildroot',
      name: 'Buildroot 6.8',
      os: 'Linux 6.8 kernel + initramfs',
      memoryMB: 128,
      media: { kind: 'bzimage', source: 'url', url: IMAGE_HOST + 'buildroot-bzimage68.bin' },
      cmdline: 'tsc=reliable mitigations=off random.trust_cpu=on console=ttyS0',
      consoleTab: 'serial',
      note: 'About 5 MB. The kernel is booted directly and talks to the serial console.',
    },
    {
      id: 'builtin-tinycore',
      name: 'Tiny Core 11',
      os: 'Tiny Core Linux (live CD)',
      memoryMB: 256,
      media: { kind: 'cdrom', source: 'url', url: IMAGE_HOST + 'TinyCore-11.0.iso' },
      consoleTab: 'display',
      note: 'About 19 MB. Boots to a graphical desktop, so give it a moment.',
    },
    {
      id: 'builtin-freedos',
      name: 'FreeDOS',
      os: 'FreeDOS on a 720K floppy',
      memoryMB: 32,
      media: { kind: 'fda', source: 'url', url: IMAGE_HOST + 'freedos722.img' },
      consoleTab: 'display',
      note: 'About 720 KB. Not Linux, but it boots in a couple of seconds.',
    },
    {
      id: 'builtin-selftest',
      name: 'Self-Test',
      os: 'Boot sector generated in this page',
      memoryMB: 32,
      media: { kind: 'selftest' },
      consoleTab: 'display',
      note: 'Downloads nothing. Boots a 13-byte message to prove the emulator works.',
    },
  ];

  var SELF_TEST_MESSAGE = 'WINDOES VM OK';

  /**
   * Assemble a bootable 1.44 MB floppy whose boot sector prints a marker with
   * the BIOS teletype call. Hand-assembled because it has to be exactly the
   * 512 bytes the BIOS loads at 0x7c00; the geometry of a real floppy is what
   * makes SeaBIOS willing to boot it at all.
   */
  function buildSelfTestFloppy() {
    var image = new Uint8Array(1474560);
    // prettier-ignore
    var code = [
      0xfa,             // cli
      0x31, 0xc0,       // xor ax, ax
      0x8e, 0xd8,       // mov ds, ax
      0xbe, 0x19, 0x7c, // mov si, 0x7c19  (message)
                        // print:
      0xac,             // lodsb
      0x84, 0xc0,       // test al, al
      0x74, 0x09,       // jz   halt
      0xb4, 0x0e,       // mov ah, 0x0e    (teletype)
      0xbb, 0x07, 0x00, // mov bx, 0x0007  (page 0, light grey)
      0xcd, 0x10,       // int 0x10
      0xeb, 0xf2,       // jmp  print
                        // halt:
      0xf4,             // hlt
      0xeb, 0xfd,       // jmp  halt
    ];
    image.set(code, 0);
    for (var i = 0; i < SELF_TEST_MESSAGE.length; i++) {
      image[0x19 + i] = SELF_TEST_MESSAGE.charCodeAt(i);
    }
    image[0x19 + SELF_TEST_MESSAGE.length] = 0x00;
    image[510] = 0x55; // boot signature
    image[511] = 0xaa;
    return image.buffer;
  }

  // ── DOM ──────────────────────────────────────────────────────────────
  var el = {
    list: document.getElementById('vmList'),
    details: document.getElementById('detailsPane'),
    console: document.getElementById('consolePane'),
    consoleBody: document.getElementById('consoleBody'),
    consoleHint: document.getElementById('consoleHint'),
    screen: document.getElementById('vmScreen'),
    screenHost: document.getElementById('screenHost'),
    serial: document.getElementById('vmSerial'),
    tabDisplay: document.getElementById('tabDisplay'),
    tabSerial: document.getElementById('tabSerial'),
    status: document.getElementById('statusText'),
    progress: document.getElementById('progress'),
    progressBar: document.getElementById('progressBar'),
    btnNew: document.getElementById('btnNew'),
    btnSettings: document.getElementById('btnSettings'),
    btnRemove: document.getElementById('btnRemove'),
    btnStart: document.getElementById('btnStart'),
    btnPowerOff: document.getElementById('btnPowerOff'),
    btnReset: document.getElementById('btnReset'),
    btnCad: document.getElementById('btnCad'),
    btnScreenshot: document.getElementById('btnScreenshot'),
    backdrop: document.getElementById('dialogBackdrop'),
    dialogTitle: document.getElementById('dialogTitle'),
    dialogClose: document.getElementById('dialogClose'),
    form: document.getElementById('vmForm'),
    fName: document.getElementById('fName'),
    fMemory: document.getElementById('fMemory'),
    fKind: document.getElementById('fKind'),
    fSource: document.getElementById('fSource'),
    fUrl: document.getElementById('fUrl'),
    fFile: document.getElementById('fFile'),
    fCmdline: document.getElementById('fCmdline'),
    lblUrl: document.getElementById('lblUrl'),
    lblFile: document.getElementById('lblFile'),
    lblCmdline: document.getElementById('lblCmdline'),
    formError: document.getElementById('formError'),
    formCancel: document.getElementById('formCancel'),
  };

  var MEDIA_LABELS = {
    cdrom: 'CD-ROM',
    fda: 'Floppy',
    hda: 'Hard disk',
    bzimage: 'Linux kernel',
    selftest: 'Built-in boot sector',
  };

  // ── State ────────────────────────────────────────────────────────────
  var userMachines = loadMachines();
  var selectedId = BUILT_INS[0].id;
  var consoleTab = 'display';

  /** The running guest, or null. Files picked from disk live only in memory. */
  var session = null;
  var attachedFiles = Object.create(null);
  var enginePromise = null;

  function allMachines() {
    return BUILT_INS.concat(userMachines);
  }

  function findMachine(id) {
    var machines = allMachines();
    for (var i = 0; i < machines.length; i++) {
      if (machines[i].id === id) return machines[i];
    }
    return null;
  }

  function isBuiltIn(machine) {
    return Boolean(machine) && BUILT_INS.indexOf(machine) !== -1;
  }

  function selectedMachine() {
    return findMachine(selectedId);
  }

  function runningId() {
    return session ? session.machineId : null;
  }

  // ── Persistence ──────────────────────────────────────────────────────
  function loadMachines() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isUsableMachine) : [];
    } catch {
      return [];
    }
  }

  function isUsableMachine(machine) {
    return Boolean(machine) && typeof machine.id === 'string' && typeof machine.name === 'string';
  }

  function saveMachines() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userMachines));
    } catch {
      setStatus('Machines could not be saved — this browser is blocking storage.');
    }
  }

  // ── Status bar ───────────────────────────────────────────────────────
  function setStatus(message) {
    el.status.textContent = message;
    el.status.title = message;
  }

  function setProgress(fraction) {
    if (fraction === null) {
      el.progress.dataset.active = 'false';
      el.progressBar.style.width = '0';
      return;
    }
    el.progress.dataset.active = 'true';
    el.progressBar.style.width = Math.max(0, Math.min(1, fraction)) * 100 + '%';
  }

  function formatBytes(bytes) {
    if (!bytes) return '';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
  }

  // ── Rendering ────────────────────────────────────────────────────────
  function render() {
    renderList();
    renderMainPane();
    syncToolbar();
  }

  function renderList() {
    el.list.textContent = '';
    allMachines().forEach(function (machine) {
      var item = document.createElement('li');
      item.className = 'vm-item';
      item.id = 'vm-' + machine.id;
      item.dataset.machineId = machine.id;
      item.dataset.state = machineState(machine);
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(machine.id === selectedId));
      item.tabIndex = machine.id === selectedId ? 0 : -1;

      var dot = document.createElement('span');
      dot.className = 'vm-state-dot';
      dot.setAttribute('aria-hidden', 'true');

      var name = document.createElement('span');
      name.className = 'vm-name';
      name.textContent = machine.name;

      item.appendChild(dot);
      item.appendChild(name);
      el.list.appendChild(item);
    });
  }

  function machineState(machine) {
    if (runningId() !== machine.id) return 'off';
    return session.failed ? 'error' : 'running';
  }

  function renderMainPane() {
    var showConsole = runningId() === selectedId && session !== null;
    el.console.hidden = !showConsole;
    el.details.hidden = showConsole;
    if (showConsole) {
      applyConsoleTab();
    } else {
      renderDetails();
    }
  }

  function addRow(parent, term, value) {
    var row = document.createElement('div');
    row.className = 'detail-row';
    var dt = document.createElement('dt');
    dt.textContent = term;
    var dd = document.createElement('dd');
    dd.textContent = value;
    row.appendChild(dt);
    row.appendChild(dd);
    parent.appendChild(row);
  }

  function renderDetails() {
    el.details.textContent = '';
    var machine = selectedMachine();
    if (!machine) {
      var empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'No machine selected.';
      el.details.appendChild(empty);
      return;
    }

    var general = document.createElement('section');
    var generalHeading = document.createElement('h2');
    generalHeading.textContent = 'General';
    general.appendChild(generalHeading);
    var generalList = document.createElement('dl');
    addRow(generalList, 'Name', machine.name);
    addRow(generalList, 'Guest', machine.os || 'Unknown');
    addRow(generalList, 'State', runningId() === machine.id ? 'Running' : 'Powered off');
    general.appendChild(generalList);
    el.details.appendChild(general);

    var system = document.createElement('section');
    var systemHeading = document.createElement('h2');
    systemHeading.textContent = 'System';
    system.appendChild(systemHeading);
    var systemList = document.createElement('dl');
    addRow(systemList, 'Base memory', machine.memoryMB + ' MB');
    addRow(systemList, 'Processor', '1 x emulated x86 (v86)');
    if (machine.cmdline) addRow(systemList, 'Kernel args', machine.cmdline);
    system.appendChild(systemList);
    el.details.appendChild(system);

    var storage = document.createElement('section');
    var storageHeading = document.createElement('h2');
    storageHeading.textContent = 'Storage';
    storage.appendChild(storageHeading);
    var storageList = document.createElement('dl');
    var media = machine.media || {};
    addRow(storageList, 'Attached as', MEDIA_LABELS[media.kind] || media.kind || 'None');
    if (media.source === 'url') {
      addRow(storageList, 'Image', media.url);
    } else if (media.source === 'file') {
      var file = attachedFiles[machine.id];
      addRow(
        storageList,
        'Image',
        file ? media.fileName + ' (' + formatBytes(file.byteLength) + ')' : media.fileName || 'None'
      );
      if (!file) {
        addRow(storageList, 'Note', 'Re-attach this file with Settings before starting.');
      }
    } else if (media.kind === 'selftest') {
      addRow(storageList, 'Image', 'Generated in this page');
    }
    storage.appendChild(storageList);
    el.details.appendChild(storage);

    if (machine.note) {
      var note = document.createElement('p');
      note.className = 'note';
      note.textContent = machine.note;
      el.details.appendChild(note);
    }
  }

  function syncToolbar() {
    var machine = selectedMachine();
    var running = Boolean(machine) && runningId() === machine.id;
    var busy = Boolean(session) && session.starting;

    el.btnStart.disabled = !machine || running || busy;
    el.btnPowerOff.disabled = !running;
    el.btnReset.disabled = !running || busy;
    el.btnCad.disabled = !running || busy;
    el.btnScreenshot.disabled = !running || busy;
    el.btnSettings.disabled = !machine || isBuiltIn(machine);
    el.btnRemove.disabled = !machine || isBuiltIn(machine) || running;
  }

  function applyConsoleTab() {
    var serial = consoleTab === 'serial';
    el.tabDisplay.setAttribute('aria-selected', String(!serial));
    el.tabSerial.setAttribute('aria-selected', String(serial));
    el.screenHost.hidden = serial;
    el.serial.hidden = !serial;
  }

  // ── Emulator ─────────────────────────────────────────────────────────
  function loadEngine() {
    if (enginePromise) return enginePromise;

    enginePromise = new Promise(function (resolve, reject) {
      if (window.V86) {
        resolve(window.V86);
        return;
      }
      var script = document.createElement('script');
      script.src = ENGINE_SRC;
      script.addEventListener('load', function () {
        if (window.V86) resolve(window.V86);
        else reject(new Error(ENGINE_MISSING));
      });
      script.addEventListener('error', function () {
        reject(new Error(ENGINE_MISSING));
      });
      document.head.appendChild(script);
    });

    enginePromise.catch(function () {
      // Let a later Start retry the download rather than caching the failure.
      enginePromise = null;
    });

    return enginePromise;
  }

  /** Translate a machine's media into the v86 option that carries it. */
  function mediaOptions(machine) {
    var media = machine.media || {};

    if (media.kind === 'selftest') {
      return { fda: { buffer: buildSelfTestFloppy() }, boot_order: 0x321 };
    }

    var image;
    if (media.source === 'file') {
      var buffer = attachedFiles[machine.id];
      if (!buffer) {
        throw new Error(
          'No image attached. Open Settings and pick "' +
            (media.fileName || 'an image file') +
            '" again — files chosen from disk are not remembered between sessions.'
        );
      }
      image = { buffer: buffer };
    } else {
      if (!media.url) throw new Error('This machine has no image URL.');
      image = { url: media.url };
    }

    var options = {};
    options[media.kind] = image;
    if (media.kind === 'fda') options.boot_order = 0x321;
    if (media.kind === 'cdrom') options.boot_order = 0x213;
    return options;
  }

  function startMachine() {
    var machine = selectedMachine();
    if (!machine || runningId() === machine.id) return;

    var options;
    try {
      options = mediaOptions(machine);
    } catch (error) {
      setStatus(error.message);
      return;
    }

    powerOff();

    consoleTab = machine.consoleTab === 'serial' ? 'serial' : 'display';
    session = { machineId: machine.id, emulator: null, starting: true, failed: false };
    el.serial.value = '';
    render();
    setStatus('Starting ' + machine.name + '…');
    setProgress(0);

    var startedFor = machine.id;

    loadEngine()
      .then(function (V86) {
        // A second Start (or a Power Off) while the engine was loading wins.
        if (!session || session.machineId !== startedFor) return;

        var config = {
          wasm_path: VENDOR + 'v86.wasm',
          bios: { url: VENDOR + 'seabios.bin' },
          vga_bios: { url: VENDOR + 'vgabios.bin' },
          memory_size: machine.memoryMB * 1024 * 1024,
          vga_memory_size: 8 * 1024 * 1024,
          screen_container: el.screen,
          serial_container: el.serial,
          autostart: true,
        };
        if (machine.cmdline) config.cmdline = machine.cmdline;
        Object.keys(options).forEach(function (key) {
          config[key] = options[key];
        });

        var emulator = new V86(config);
        session.emulator = emulator;
        wireEmulatorEvents(emulator, machine);
      })
      .catch(function (error) {
        if (!session || session.machineId !== startedFor) return;
        session.starting = false;
        session.failed = true;
        setProgress(null);
        setStatus(error.message || String(error));
        render();
      });
  }

  function wireEmulatorEvents(emulator, machine) {
    emulator.add_listener('download-progress', function (event) {
      if (!session || session.machineId !== machine.id) return;
      var name = String(event.file_name || '')
        .split('/')
        .pop();
      if (event.lengthComputable && event.total) {
        setProgress(event.loaded / event.total);
        setStatus(
          'Downloading ' +
            name +
            ' — ' +
            formatBytes(event.loaded) +
            ' of ' +
            formatBytes(event.total)
        );
      } else {
        setProgress(null);
        setStatus('Downloading ' + name + '…');
      }
    });

    emulator.add_listener('download-error', function (event) {
      if (!session || session.machineId !== machine.id) return;
      session.starting = false;
      session.failed = true;
      setProgress(null);
      setStatus(
        'Could not download ' +
          String(event.file_name || 'the guest image') +
          '. The host may be unreachable or may not allow cross-origin requests.'
      );
      render();
    });

    emulator.add_listener('emulator-started', function () {
      if (!session || session.machineId !== machine.id) return;
      session.starting = false;
      setProgress(null);
      setStatus(machine.name + ' is running.');
      render();
    });

    emulator.add_listener('emulator-stopped', function () {
      if (!session || session.machineId !== machine.id) return;
      setStatus(machine.name + ' stopped.');
    });
  }

  function powerOff() {
    if (!session) return;
    var emulator = session.emulator;
    var name = (findMachine(session.machineId) || {}).name || 'The machine';
    session = null;

    if (emulator) {
      try {
        emulator.destroy();
      } catch {
        // A guest that never finished starting has nothing to tear down.
      }
    }

    // v86 renders straight into these nodes, so clear both for the next guest:
    // the <div> carries text mode, the <canvas> carries graphical mode.
    el.screen.firstElementChild.textContent = '';
    var canvas = el.screen.lastElementChild;
    var context = canvas.getContext('2d');
    if (context) context.clearRect(0, 0, canvas.width, canvas.height);

    setProgress(null);
    setStatus(name + ' powered off.');
    render();
  }

  function resetMachine() {
    if (!session || !session.emulator) return;
    session.emulator.restart();
    setStatus('Reset signal sent.');
  }

  function sendCtrlAltDelete() {
    if (!session || !session.emulator) return;
    session.emulator.keyboard_send_scancodes([0x1d, 0x38, 0x53, 0xd3, 0xb8, 0x9d]);
    setStatus('Ctrl+Alt+Del sent.');
  }

  function takeScreenshot() {
    if (!session || !session.emulator) return;
    try {
      session.emulator.screen_make_screenshot();
      setStatus('Screenshot saved.');
    } catch {
      setStatus('This browser would not let the screenshot be downloaded.');
    }
  }

  // ── Dialog ───────────────────────────────────────────────────────────
  var editingId = null;

  function syncFormFields() {
    var usesFile = el.fSource.value === 'file';
    var isKernel = el.fKind.value === 'bzimage';
    el.lblUrl.hidden = usesFile;
    el.fUrl.hidden = usesFile;
    el.lblFile.hidden = !usesFile;
    el.fFile.hidden = !usesFile;
    el.lblCmdline.hidden = !isKernel;
    el.fCmdline.hidden = !isKernel;
  }

  function openDialog(machine) {
    editingId = machine ? machine.id : null;
    el.dialogTitle.textContent = machine ? 'Settings — ' + machine.name : 'New Virtual Machine';
    el.formError.textContent = '';

    var media = (machine && machine.media) || {};
    el.fName.value = machine ? machine.name : 'New Machine';
    el.fMemory.value = String((machine && machine.memoryMB) || 128);
    el.fKind.value = media.kind && media.kind !== 'selftest' ? media.kind : 'cdrom';
    el.fSource.value = media.source === 'file' ? 'file' : 'url';
    el.fUrl.value = media.url || '';
    el.fCmdline.value = (machine && machine.cmdline) || '';
    el.fFile.value = '';

    syncFormFields();
    el.backdrop.hidden = false;
    el.fName.focus();
    el.fName.select();
  }

  function closeDialog() {
    el.backdrop.hidden = true;
    editingId = null;
  }

  function submitForm(event) {
    event.preventDefault();

    var name = el.fName.value.trim();
    if (!name) {
      el.formError.textContent = 'Give the machine a name.';
      return;
    }

    var kind = el.fKind.value;
    var source = el.fSource.value;
    var url = el.fUrl.value.trim();
    var file = el.fFile.files && el.fFile.files[0];
    var existing = editingId ? findMachine(editingId) : null;
    var keepsFile = existing && existing.media.source === 'file' && attachedFiles[existing.id];

    if (source === 'url' && !url) {
      el.formError.textContent = 'Enter the URL of a disk image.';
      return;
    }
    if (source === 'file' && !file && !keepsFile) {
      el.formError.textContent = 'Choose an image file.';
      return;
    }

    var id = editingId || 'vm-' + Date.now().toString(36);
    var machine = {
      id: id,
      name: name,
      os: 'Custom machine',
      memoryMB: Number(el.fMemory.value) || 128,
      cmdline: kind === 'bzimage' ? el.fCmdline.value.trim() : '',
      consoleTab: kind === 'bzimage' ? 'serial' : 'display',
      media:
        source === 'file'
          ? { kind: kind, source: 'file', fileName: file ? file.name : existing.media.fileName }
          : { kind: kind, source: 'url', url: url },
    };

    if (source !== 'file') delete attachedFiles[id];

    var index = indexOfUserMachine(id);
    if (index === -1) userMachines.push(machine);
    else userMachines[index] = machine;
    saveMachines();

    selectedId = id;
    closeDialog();
    render();

    if (source === 'file' && file) {
      setStatus('Reading ' + file.name + '…');
      file
        .arrayBuffer()
        .then(function (buffer) {
          attachedFiles[id] = buffer;
          setStatus(
            file.name + ' attached (' + formatBytes(buffer.byteLength) + '). Ready to start.'
          );
          render();
        })
        .catch(function () {
          setStatus('Could not read ' + file.name + '.');
        });
    } else {
      setStatus('Saved ' + name + '.');
    }
  }

  function indexOfUserMachine(id) {
    for (var i = 0; i < userMachines.length; i++) {
      if (userMachines[i].id === id) return i;
    }
    return -1;
  }

  function removeSelected() {
    var machine = selectedMachine();
    if (!machine || isBuiltIn(machine)) return;
    var index = indexOfUserMachine(machine.id);
    if (index === -1) return;

    userMachines.splice(index, 1);
    delete attachedFiles[machine.id];
    saveMachines();
    selectedId = BUILT_INS[0].id;
    render();
    setStatus('Removed ' + machine.name + '.');
  }

  // ── Events ───────────────────────────────────────────────────────────
  function selectMachine(id) {
    if (!id || id === selectedId) return;
    selectedId = id;
    render();
  }

  el.list.addEventListener('click', function (event) {
    var item = event.target.closest('.vm-item');
    if (item) selectMachine(item.dataset.machineId);
  });

  el.list.addEventListener('dblclick', function (event) {
    var item = event.target.closest('.vm-item');
    if (!item) return;
    selectMachine(item.dataset.machineId);
    startMachine();
  });

  el.list.addEventListener('keydown', function (event) {
    var machines = allMachines();
    var index = machines.findIndex(function (machine) {
      return machine.id === selectedId;
    });
    if (index === -1) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      var next = index + (event.key === 'ArrowDown' ? 1 : -1);
      if (next < 0 || next >= machines.length) return;
      selectMachine(machines[next].id);
      var selected = el.list.querySelector('[aria-selected="true"]');
      if (selected) selected.focus();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      startMachine();
    }
  });

  el.btnNew.addEventListener('click', function () {
    openDialog(null);
  });
  el.btnSettings.addEventListener('click', function () {
    var machine = selectedMachine();
    if (machine && !isBuiltIn(machine)) openDialog(machine);
  });
  el.btnRemove.addEventListener('click', removeSelected);
  el.btnStart.addEventListener('click', startMachine);
  el.btnPowerOff.addEventListener('click', powerOff);
  el.btnReset.addEventListener('click', resetMachine);
  el.btnCad.addEventListener('click', sendCtrlAltDelete);
  el.btnScreenshot.addEventListener('click', takeScreenshot);

  el.tabDisplay.addEventListener('click', function () {
    consoleTab = 'display';
    applyConsoleTab();
  });
  el.tabSerial.addEventListener('click', function () {
    consoleTab = 'serial';
    applyConsoleTab();
    el.serial.focus();
  });

  el.consoleBody.addEventListener('mousedown', function () {
    el.consoleHint.textContent = 'The virtual machine has the keyboard.';
  });

  el.form.addEventListener('submit', submitForm);
  el.fSource.addEventListener('change', syncFormFields);
  el.fKind.addEventListener('change', syncFormFields);
  el.formCancel.addEventListener('click', closeDialog);
  el.dialogClose.addEventListener('click', closeDialog);
  el.backdrop.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeDialog();
  });

  window.addEventListener('pagehide', powerOff);

  // ── Boot the manager ─────────────────────────────────────────────────
  render();
  setStatus('Select a machine and press Start.');
})();
