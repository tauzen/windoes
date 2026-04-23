const path = require('path');
const AxeBuilder = require('@axe-core/playwright').default;
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { waitForBoot } = require('./helpers/test-harness');

const WINDOES_DIR = path.resolve(__dirname, '..', 'windoes');

function formatViolation(violation) {
  const nodeTargets = violation.nodes
    .map((node) => node.target.join(' '))
    .slice(0, 5)
    .join(', ');
  return `${violation.id} [${violation.impact}] ${violation.help} :: ${nodeTargets}`;
}

async function runA11yTest() {
  const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
  const browser = await launchBrowser();

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await waitForBoot(page, baseUrl);

    const axeResult = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();

    const seriousOrCritical = axeResult.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical'
    );

    if (seriousOrCritical.length > 0) {
      console.error('\nAxe serious/critical accessibility violations found:');
      for (const violation of seriousOrCritical) {
        console.error(' - ' + formatViolation(violation));
      }
      process.exitCode = 1;
      return;
    }

    console.log(
      `Axe passed: 0 serious/critical violations on booted shell (${axeResult.violations.length} total violations, color-contrast disabled).`
    );
  } finally {
    await browser.close();
    await server.close();
  }
}

runA11yTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
