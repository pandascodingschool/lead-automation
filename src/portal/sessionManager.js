/**
 * Singleton manager for the IndiaMART portal browser session.
 *
 * Responsibilities:
 *  - Launch a headed Chromium so the user can log in manually via the dashboard
 *  - Track the active login attempt (only one at a time)
 *  - Persist the resulting storageState to disk so portalWorker.js can reuse it
 *  - Report connection status (file exists + last-modified time)
 *
 * Note: launching a headed browser only works when the Node server runs on a
 * machine with a display (i.e. local dev). For headless server deployments the
 * client should still use `npm run portal:login` from a workstation and copy
 * the storageState.json over.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { STORAGE_PATH, URLS } = require('./config');

let active = null; // { browser, context, page, startedAt } | null

function isAvailable() {
  return process.platform === 'darwin' || process.platform === 'win32' ||
         !!process.env.DISPLAY; // crude headless-server check
}

function getStatus() {
  let connected = false;
  let savedAt = null;

  if (fs.existsSync(STORAGE_PATH)) {
    try {
      const stats = fs.statSync(STORAGE_PATH);
      savedAt = stats.mtime;
      connected = true;
    } catch {}
  }

  return {
    connected,
    savedAt,
    loginInProgress: !!active,
    loginStartedAt: active?.startedAt ?? null,
    canLaunchBrowser: isAvailable(),
  };
}

async function startLogin() {
  if (active) {
    return { ok: false, reason: 'A login session is already in progress.' };
  }

  if (!isAvailable()) {
    return {
      ok: false,
      reason: 'Server cannot launch a headed browser (no display). Use `npm run portal:login` from a workstation instead.',
    };
  }

  try {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(URLS.LOGIN);

    active = { browser, context, page, startedAt: new Date() };

    // If the user closes the browser window manually, clear the active session
    browser.on('disconnected', () => {
      if (active && active.browser === browser) active = null;
    });

    return { ok: true };
  } catch (err) {
    console.error('[SessionManager] Failed to launch browser:', err);
    return { ok: false, reason: err.message };
  }
}

async function finishLogin() {
  if (!active) {
    return { ok: false, reason: 'No login session in progress.' };
  }

  try {
    fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
    await active.context.storageState({ path: STORAGE_PATH });
    await active.browser.close();
    active = null;
    return { ok: true };
  } catch (err) {
    console.error('[SessionManager] Failed to save session:', err);
    return { ok: false, reason: err.message };
  }
}

async function cancelLogin() {
  if (!active) return { ok: true };
  try {
    await active.browser.close();
  } catch {}
  active = null;
  return { ok: true };
}

module.exports = { getStatus, startLogin, finishLogin, cancelLogin };
