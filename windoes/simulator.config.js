window.WIN_ME_SIMULATOR_CONFIG = {
    bootMessages: [
        'Loading Windoes...',
        'Loading system files...',
        'Initializing device drivers...',
        'Loading Registry...',
        'Preparing network connections...',
        'Loading your personal settings...',
        'Applying computer settings...'
    ],
    bsodMessages: [
        'An exception 0E has occurred at 0028:C0011E36 in VxD VMM(01) +\n00010E36. This was called from 0028:C001747B in VxD VMM(01) +\n0001647B. It may be possible to continue normally.\n\n* Press any key to attempt to continue.\n* Press CTRL+ALT+DEL to restart your computer. You will\n  lose any unsaved information in all applications.\n\nPress any key to continue _',
        'A fatal exception 0D has occurred at 0028:C0034B80 in VxD VWIN32(05) +\n00002E80. The current application will be terminated.\n\n* Press any key to terminate the current application.\n* Press CTRL+ALT+DEL to restart your computer. You will\n  lose any unsaved information in all applications.\n\nPress any key to continue _',
        'EXPLORER caused an invalid page fault in\nmodule KERNEL32.DLL at 0177:BFF9DB61.\n\nRegisters:\nEAX=C0045200 CS=0177 EIP=BFF9DB61 EFLGS=00010216\nEBX=007D4E38 SS=017F ESP=006DF3FC EBP=006DF42C\nECX=006DF4B0 DS=017F ESI=816BD210 FS=455F\nEDX=006DF440 ES=017F EDI=006DF4B0 GS=0000\n\nPress any key to continue _',
        'Windoes protection error. You need to restart\nyour computer.\n\nSystem halted.',
        'MSGSRV32 caused a General Protection Fault in\nmodule USER.EXE at 0004:00003FFC.\n\n* Press any key to terminate the current application.\n* Press CTRL+ALT+DEL to restart your computer.\n\nPress any key to continue _'
    ],
    randomErrors: [
        { title: 'Explorer', text: 'This program has performed an illegal operation and will be shut down. If the problem persists, contact the program vendor.', icon: 'error' },
        { title: 'Windoes', text: 'Not enough memory to complete this operation. Close some programs and try again.', icon: 'warning' },
        { title: 'RUNDLL32', text: 'Error in MMSYSTEM.DLL. Missing entry: SndPlaySoundA', icon: 'error' },
        { title: 'DrWatson Postmortem Debugger', text: 'An application error has occurred and an application error log is being generated.\n\nException: access violation (0xc0000005), Address: 0x77f9f3d1', icon: 'error' },
        { title: 'Windoes Update', text: 'Windoes Update has encountered an error and needs to close. We are sorry for the inconvenience. Error code: 0x80072EFD', icon: 'warning' },
        { title: 'System Resources', text: 'Warning: Your system is running low on system resources. To correct this, close some windoes.', icon: 'warning' },
        { title: 'Internet Explorer', text: 'Internet Explorer has encountered a problem and needs to close. We are sorry for the inconvenience.', icon: 'error' },
        { title: 'Disk Cleanup', text: 'The disk cleanup utility could not free any space. Your hard drive may be full.', icon: 'info' }
    ],
    experimentApps: [
        { id: 'iconAsciiRunner', title: 'ASCII Runner', url: './applications/ascii-runner/index.html' }
    ],
    runActions: {
        notepad: 'openNotepad',
        'notepad.exe': 'openNotepad',
        explorer: 'openMyComputer',
        'explorer.exe': 'openMyComputer',
        iexplore: 'openInternetExplorer',
        'iexplore.exe': 'openInternetExplorer',
        winamp: 'openWinamp',
        'winamp.exe': 'openWinamp',
        minesweeper: 'openMinesweeper',
        mine: 'openMinesweeper',
        'winmine.exe': 'openMinesweeper',
        solitaire: 'openSolitaire',
        sol: 'openSolitaire',
        'sol.exe': 'openSolitaire'
    }
};
