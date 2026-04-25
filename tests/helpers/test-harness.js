const DEFAULT_BOOT_TIMEOUT_MS = 10000;

function createAssertTracker() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  PASS: ${message}`);
      passed += 1;
    } else {
      console.error(`  FAIL: ${message}`);
      failed += 1;
    }
  }

  function getCounts() {
    return { passed, failed };
  }

  function printSummary() {
    const counts = getCounts();
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Results: ${counts.passed} passed, ${counts.failed} failed`);

    if (counts.failed > 0) {
      console.error('TESTS FAILED');
      return false;
    }

    console.log('ALL TESTS PASSED');
    return true;
  }

  function exitWithSummary() {
    process.exit(printSummary() ? 0 : 1);
  }

  return {
    assert,
    getCounts,
    printSummary,
    exitWithSummary,
  };
}

async function waitForBoot(page, baseUrl, timeout = DEFAULT_BOOT_TIMEOUT_MS) {
  await page.goto(baseUrl + '/index.html');
  await page.waitForFunction(
    () => {
      const desktop = document.getElementById('theDesktop');
      return desktop && desktop.style.display !== 'none';
    },
    { timeout }
  );
  await page.waitForTimeout(200);
}

module.exports = {
  createAssertTracker,
  waitForBoot,
  DEFAULT_BOOT_TIMEOUT_MS,
};
