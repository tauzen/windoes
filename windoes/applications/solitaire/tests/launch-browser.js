const path = require('path');
const { chromium, firefox, webkit } = require('playwright');

async function launchBrowser() {
    const msPlaywrightDir = path.join(process.env.HOME || '', '.cache', 'ms-playwright');
    let existingChromiumPath = null;
    try {
        const fs = require('fs');
        const dirs = fs.readdirSync(msPlaywrightDir).filter(d => d.startsWith('chromium-'));
        if (dirs.length > 0) {
            const candidate = path.join(msPlaywrightDir, dirs[dirs.length - 1], 'chrome-linux', 'chrome');
            if (fs.existsSync(candidate)) existingChromiumPath = candidate;
        }
    } catch (_) {}

    const attempts = [
        { label: 'bundled chromium', launcher: chromium, options: { headless: true } },
        ...(existingChromiumPath ? [{ label: 'existing chromium install', launcher: chromium, options: { headless: true, executablePath: existingChromiumPath, args: ['--no-sandbox'] } }] : []),
        { label: 'system chrome channel', launcher: chromium, options: { headless: true, channel: 'chrome' } },
        { label: 'system msedge channel', launcher: chromium, options: { headless: true, channel: 'msedge' } },
        { label: 'bundled firefox', launcher: firefox, options: { headless: true } },
        { label: 'bundled webkit', launcher: webkit, options: { headless: true } },
    ];

    const errors = [];
    for (const attempt of attempts) {
        try {
            const browser = await attempt.launcher.launch(attempt.options);
            console.log(`Using browser: ${attempt.label}`);
            return browser;
        } catch (err) {
            errors.push(`${attempt.label}: ${err.message}`);
        }
    }

    throw new Error(`Could not launch any Playwright browser target. Attempts:\n- ${errors.join('\n- ')}`);
}

module.exports = { launchBrowser };
