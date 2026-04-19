/**
 * Playwright tests for the VirtualFS (IndexedDB-backed virtual filesystem).
 *
 * Runs all filesystem operations inside a real browser context so that
 * IndexedDB is available.
 */

const path = require('path');
const { launchBrowser, startStaticServer } = require('./launch-browser');

const WINDOES_DIR = path.resolve(__dirname, '..', 'windoes');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== VirtualFS Tests ===\n');

  const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
  const browser = await launchBrowser();
  const page = await browser.newPage();

  // Navigate to any page so IndexedDB is available
  await page.goto(baseUrl + '/index.html', { waitUntil: 'domcontentloaded' });

  // Inject the VirtualFS module and run tests inside the browser
  const results = await page.evaluate(async () => {
    // Dynamic import of the module
    const mod = await import('./virtual-fs.js');
    const { VirtualFS, normalizePath, parentPath, basename } = mod;

    const results = [];
    function check(condition, msg) {
      results.push({ pass: !!condition, msg });
    }

    async function expectError(fn, errorName, msg) {
      try {
        await fn();
        results.push({ pass: false, msg: msg + ' (no error thrown)' });
      } catch (e) {
        results.push({
          pass: e.constructor.name === errorName || e.name === errorName,
          msg: msg + ` (got ${e.name})`,
        });
      }
    }

    // ── Path utilities ────────────────────────────────────────────────

    check(normalizePath('/') === '/', 'normalizePath root');
    check(normalizePath('/foo/') === '/foo', 'normalizePath strips trailing slash');
    check(normalizePath('/foo//bar') === '/foo/bar', 'normalizePath collapses slashes');
    check(normalizePath('/foo/./bar') === '/foo/bar', 'normalizePath resolves dot');
    check(normalizePath('/foo/bar/../baz') === '/foo/baz', 'normalizePath resolves dotdot');
    check(normalizePath('/foo/bar/../../baz') === '/baz', 'normalizePath resolves multiple dotdot');

    check(parentPath('/foo') === '/', 'parentPath of /foo');
    check(parentPath('/foo/bar') === '/foo', 'parentPath of /foo/bar');
    check(parentPath('/') === null, 'parentPath of root');

    check(basename('/foo/bar') === 'bar', 'basename of /foo/bar');
    check(basename('/foo') === 'foo', 'basename of /foo');
    check(basename('/') === '/', 'basename of root');

    try {
      normalizePath('relative');
      check(false, 'normalizePath rejects relative path');
    } catch {
      check(true, 'normalizePath rejects relative path');
    }

    // ── Init ──────────────────────────────────────────────────────────

    // Use a unique DB name to avoid conflicts
    const fs = new VirtualFS('test-vfs-' + Date.now());

    // Methods should throw before init
    try {
      await fs.mkdir('/test');
      check(false, 'mkdir throws before init');
    } catch (e) {
      check(e.message.includes('not initialized'), 'mkdir throws before init');
    }

    await fs.init();
    check(true, 'init succeeds');

    // Root should exist
    check(await fs.exists('/'), 'root exists after init');

    // ── mkdir ─────────────────────────────────────────────────────────

    await fs.mkdir('/docs');
    check(await fs.exists('/docs'), 'mkdir creates directory');

    await expectError(() => fs.mkdir('/docs'), 'FileExistsError', 'mkdir throws on duplicate');
    await expectError(
      () => fs.mkdir('/nonexistent/child'),
      'FileNotFoundError',
      'mkdir throws if parent missing'
    );

    await fs.mkdir('/docs/sub');
    check(await fs.exists('/docs/sub'), 'mkdir creates nested directory');

    // ── writeFile / readFile ──────────────────────────────────────────

    await fs.writeFile('/docs/hello.txt', 'world');
    const content = await fs.readFile('/docs/hello.txt');
    check(content === 'world', 'writeFile + readFile roundtrip');

    await expectError(
      () => fs.readFile('/nofile'),
      'FileNotFoundError',
      'readFile throws for missing file'
    );
    await expectError(
      () => fs.writeFile('/nonexistent/file.txt', 'x'),
      'FileNotFoundError',
      'writeFile throws if parent missing'
    );

    // Overwrite
    await fs.writeFile('/docs/hello.txt', 'updated');
    check((await fs.readFile('/docs/hello.txt')) === 'updated', 'writeFile overwrites existing');

    // ArrayBuffer support
    const buf = new ArrayBuffer(4);
    new Uint8Array(buf).set([1, 2, 3, 4]);
    await fs.writeFile('/docs/binary.dat', buf);
    const readBuf = await fs.readFile('/docs/binary.dat');
    check(
      readBuf instanceof ArrayBuffer && readBuf.byteLength === 4,
      'writeFile supports ArrayBuffer'
    );

    // Writing to a directory path should throw
    await expectError(
      () => fs.writeFile('/docs', 'bad'),
      'NotADirectoryError',
      'writeFile rejects writing to directory path'
    );

    // ── readdir ───────────────────────────────────────────────────────

    const rootEntries = await fs.readdir('/');
    check(
      rootEntries.some((entry) => entry.name === 'docs' && entry.type === 'directory'),
      'readdir lists directories with type'
    );

    const docsEntries = await fs.readdir('/docs');
    check(
      docsEntries.some((entry) => entry.name === 'hello.txt' && entry.type === 'file'),
      'readdir lists files with type'
    );
    check(
      docsEntries.some((entry) => entry.name === 'sub' && entry.type === 'directory'),
      'readdir lists subdirectories with type'
    );
    check(
      docsEntries.some((entry) => entry.name === 'binary.dat' && entry.type === 'file'),
      'readdir lists binary files with type'
    );

    // Should not list nested descendants
    await fs.writeFile('/docs/sub/deep.txt', 'deep');
    const docsEntries2 = await fs.readdir('/docs');
    check(
      !docsEntries2.some((entry) => entry.name === 'deep.txt'),
      'readdir does not list nested children'
    );

    await expectError(
      () => fs.readdir('/nope'),
      'FileNotFoundError',
      'readdir throws for missing directory'
    );

    // ── stat ──────────────────────────────────────────────────────────

    const fileStat = await fs.stat('/docs/hello.txt');
    check(fileStat.type === 'file', 'stat returns file type');
    check(fileStat.size === 'updated'.length, 'stat returns correct size');
    check(fileStat.createdAt instanceof Date, 'stat returns createdAt Date');
    check(fileStat.modifiedAt instanceof Date, 'stat returns modifiedAt Date');

    const dirStat = await fs.stat('/docs');
    check(dirStat.type === 'directory', 'stat returns directory type');

    await expectError(
      () => fs.stat('/missing'),
      'FileNotFoundError',
      'stat throws for missing path'
    );

    // createdAt preserved on overwrite
    const stat1 = await fs.stat('/docs/hello.txt');
    await fs.writeFile('/docs/hello.txt', 'third');
    const stat2 = await fs.stat('/docs/hello.txt');
    check(
      stat1.createdAt.getTime() === stat2.createdAt.getTime(),
      'createdAt preserved on overwrite'
    );
    check(
      stat2.modifiedAt.getTime() >= stat1.modifiedAt.getTime(),
      'modifiedAt updated on overwrite'
    );

    // ── rename ────────────────────────────────────────────────────────

    // File rename
    await fs.writeFile('/docs/a.txt', 'alpha');
    await fs.rename('/docs/a.txt', '/docs/b.txt');
    check((await fs.readFile('/docs/b.txt')) === 'alpha', 'rename file preserves content');
    check(!(await fs.exists('/docs/a.txt')), 'rename removes old file');

    // Directory rename with descendants
    await fs.rename('/docs', '/files');
    check(await fs.exists('/files'), 'rename moves directory');
    check((await fs.readFile('/files/hello.txt')) === 'third', 'rename moves descendant files');
    check(await fs.exists('/files/sub/deep.txt'), 'rename moves nested descendants');
    check(!(await fs.exists('/docs')), 'rename removes old directory');

    await expectError(
      () => fs.rename('/nope', '/somewhere'),
      'FileNotFoundError',
      'rename throws if source missing'
    );

    // Rename to existing path should fail
    await fs.mkdir('/other');
    await expectError(
      () => fs.rename('/files', '/other'),
      'FileExistsError',
      'rename throws if target exists'
    );
    await fs.rm('/other');

    // Rename to path with missing parent
    await expectError(
      () => fs.rename('/files', '/missing/files'),
      'FileNotFoundError',
      'rename throws if new parent missing'
    );

    await expectError(
      () => fs.rename('/files', '/files/sub/files-again'),
      'Error',
      'rename rejects moving directory into its own child'
    );

    // Concurrent writeFile: last writer wins, operation stays consistent
    const concurrentWrites = await Promise.allSettled([
      fs.writeFile('/files/concurrent.txt', 'v1'),
      fs.writeFile('/files/concurrent.txt', 'v2'),
      fs.writeFile('/files/concurrent.txt', 'v3'),
      fs.writeFile('/files/concurrent.txt', 'v4'),
    ]);
    check(
      concurrentWrites.every((result) => result.status === 'fulfilled'),
      'concurrent writeFile operations all succeed'
    );
    const concurrentContent = await fs.readFile('/files/concurrent.txt');
    check(
      ['v1', 'v2', 'v3', 'v4'].includes(concurrentContent),
      'concurrent writeFile leaves one valid final payload'
    );

    // Race: recursive delete in parallel with rename should leave consistent state
    await fs.mkdir('/race');
    await fs.mkdir('/race/sub');
    await fs.writeFile('/race/sub/file.txt', 'r');
    const raceResults = await Promise.allSettled([
      fs.rename('/race', '/race-renamed'),
      fs.rm('/race', { recursive: true }),
    ]);
    check(
      raceResults.some((result) => result.status === 'fulfilled'),
      'rename/rm race has at least one successful operation'
    );
    const raceOldExists = await fs.exists('/race');
    const raceNewExists = await fs.exists('/race-renamed');
    check(!(raceOldExists && raceNewExists), 'rename/rm race leaves only one root path visible');

    // ── rm ────────────────────────────────────────────────────────────

    // Remove file
    await fs.writeFile('/tmp.txt', 'temp');
    await fs.rm('/tmp.txt');
    check(!(await fs.exists('/tmp.txt')), 'rm deletes file');

    // Remove empty directory
    await fs.mkdir('/emptydir');
    await fs.rm('/emptydir');
    check(!(await fs.exists('/emptydir')), 'rm deletes empty directory');

    // Remove non-empty directory without recursive should fail
    await expectError(
      () => fs.rm('/files'),
      'DirectoryNotEmptyError',
      'rm throws on non-empty dir without recursive'
    );

    // Recursive delete
    await fs.rm('/files', { recursive: true });
    check(!(await fs.exists('/files')), 'rm recursive deletes directory');
    check(!(await fs.exists('/files/hello.txt')), 'rm recursive deletes descendant files');
    check(!(await fs.exists('/files/sub')), 'rm recursive deletes descendant dirs');

    // Cannot delete root
    try {
      await fs.rm('/');
      check(false, 'rm rejects deleting root');
    } catch {
      check(true, 'rm rejects deleting root');
    }

    await expectError(
      () => fs.rm('/nonexistent'),
      'FileNotFoundError',
      'rm throws for missing path'
    );

    // ── exists ────────────────────────────────────────────────────────

    check((await fs.exists('/')) === true, 'exists returns true for root');
    check((await fs.exists('/nothing')) === false, 'exists returns false for missing');

    // ── Full scenario from spec ───────────────────────────────────────

    const fs2 = new VirtualFS('test-vfs-scenario-' + Date.now());
    await fs2.init();

    await fs2.mkdir('/docs');
    await fs2.writeFile('/docs/hello.txt', 'world');
    const r1 = await fs2.readdir('/');
    check(
      JSON.stringify(r1) === JSON.stringify([{ name: 'docs', type: 'directory' }]),
      'scenario: readdir / = [{name:"docs",type:"directory"}]'
    );
    const r2 = await fs2.readFile('/docs/hello.txt');
    check(r2 === 'world', 'scenario: readFile hello.txt = world');
    await fs2.rename('/docs', '/files');
    const r3 = await fs2.readFile('/files/hello.txt');
    check(r3 === 'world', 'scenario: readFile after rename = world');
    await fs2.rm('/files', { recursive: true });
    const r4 = await fs2.exists('/files');
    check(r4 === false, 'scenario: exists after rm = false');

    return results;
  });

  // Report results
  for (const r of results) {
    assert(r.pass, r.msg);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

  await browser.close();
  server.close();

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
