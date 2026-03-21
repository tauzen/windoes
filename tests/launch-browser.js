const { chromium, firefox, webkit } = require('playwright');

async function launchBrowser() {
    const attempts = [
        { label: 'bundled chromium', launcher: chromium, options: { headless: true } },
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
