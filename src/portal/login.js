/**
 * Portal Login Script — run ONCE manually.
 *
 *   npm run portal:login
 *
 * Opens a real Chromium window. You log in to the IndiaMART seller portal
 * (including OTP / captcha) by hand, then press ENTER in the terminal.
 * The browser session (cookies + localStorage) is saved to
 * sessions/storageState.json so the worker can reuse it headlessly.
 *
 * Re-run this whenever the saved session expires (you'll see auth errors
 * in the worker logs).
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { chromium } = require('playwright');
const { STORAGE_PATH, URLS } = require('./config');

function waitForEnter(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, () => { rl.close(); resolve(); });
  });
}

(async () => {
  // Make sure sessions/ folder exists
  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });

  console.log('🔐 Launching Chromium for manual IndiaMART login…');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(URLS.LOGIN);

  console.log('\n👉 Please complete login in the browser window:');
  console.log('   • Enter mobile number / email');
  console.log('   • Complete OTP / captcha');
  console.log('   • Make sure you can see the Lead Manager / Dashboard\n');

  await waitForEnter('   Press ENTER here once you are fully logged in… ');

  await context.storageState({ path: STORAGE_PATH });
  console.log(`\n✅ Session saved to ${STORAGE_PATH}`);
  console.log('   You can now run the worker: npm run portal:worker\n');

  await browser.close();
  process.exit(0);
})().catch((err) => {
  console.error('❌ Login script failed:', err);
  process.exit(1);
});
