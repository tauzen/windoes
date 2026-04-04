const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium, firefox, webkit } = require('playwright');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.mp3':  'audio/mpeg',
    '.wav':  'audio/wav',
    '.ico':  'image/x-icon',
};

/**
 * Start a simple static file server for the windoes directory.
 * Returns { server, baseUrl } where baseUrl is like 'http://localhost:PORT'.
 */
function startStaticServer(rootDir) {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            let urlPath = decodeURIComponent(req.url.split('?')[0]);
            if (urlPath.endsWith('/')) urlPath += 'index.html';

            const filePath = path.join(rootDir, urlPath);

            // Prevent directory traversal
            if (!filePath.startsWith(rootDir)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('Not Found');
                    return;
                }
                const ext = path.extname(filePath).toLowerCase();
                const mime = MIME_TYPES[ext] || 'application/octet-stream';
                res.writeHead(200, { 'Content-Type': mime });
                res.end(data);
            });
        });

        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
        });

        server.on('error', reject);
    });
}

async function launchBrowser() {
    // Try to find an existing chromium installation that may not match the exact Playwright version
    const msPlaywrightDir = path.join(process.env.HOME || '', '.cache', 'ms-playwright');
    let existingChromiumPath = null;
    try {
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

module.exports = { launchBrowser, startStaticServer };
