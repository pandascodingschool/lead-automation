/**
 * Portal Worker — picks up PENDING PortalAssignmentJob rows and pushes the
 * assignment to the IndiaMART seller portal using Playwright.
 *
 * Run with:    npm run portal:worker
 *
 * Flow:
 *   1. Launch headless Chromium with saved storageState (login.js must have run once)
 *   2. Poll DB every POLL_INTERVAL_MS for jobs with status = PENDING
 *   3. For each job: mark RUNNING -> run UI flow -> mark DONE / FAILED
 *   4. Take a screenshot on failure for debugging
 *   5. Sleep, loop
 *
 * Stays single-threaded on purpose so we never hammer the portal.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const prisma = require('../utils/prisma');
const { STORAGE_PATH, SCREENSHOT_DIR, TIMEOUTS } = require('../portal/config');
const { assignLeadInPortal } = require('../portal/assignLead');

const POLL_INTERVAL_MS = 30 * 1000;
const MAX_ATTEMPTS = 3;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function takeFailureScreenshot(page, jobId) {
  try {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const file = path.join(SCREENSHOT_DIR, `${jobId}-${Date.now()}.png`);
    await page.screenshot({ path: file, fullPage: true });
    return file;
  } catch (e) {
    console.error('[Worker] Failed to capture screenshot:', e.message);
    return null;
  }
}

async function processJob(page, job) {
  console.log(`[Worker] Job ${job.id} → assigning lead ${job.lead.externalLeadId} to "${job.portalUser}"`);

  await prisma.portalAssignmentJob.update({
    where: { id: job.id },
    data: { status: 'RUNNING', startedAt: new Date(), attempts: { increment: 1 } },
  });

  try {
    await assignLeadInPortal(page, job);

    await prisma.portalAssignmentJob.update({
      where: { id: job.id },
      data: { status: 'DONE', completedAt: new Date(), errorMsg: null, screenshot: null },
    });
    console.log(`[Worker] Job ${job.id} ✅ DONE`);
  } catch (err) {
    const screenshot = await takeFailureScreenshot(page, job.id);
    const fresh = await prisma.portalAssignmentJob.findUnique({ where: { id: job.id } });
    const finalStatus = fresh.attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING';

    await prisma.portalAssignmentJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        errorMsg: err.message?.slice(0, 1000) ?? String(err),
        screenshot,
      },
    });
    console.error(`[Worker] Job ${job.id} ❌ ${finalStatus} (attempt ${fresh.attempts}/${MAX_ATTEMPTS}): ${err.message}`);
  }
}

async function main() {
  if (!fs.existsSync(STORAGE_PATH)) {
    console.error('❌ No saved session found at', STORAGE_PATH);
    console.error('   Run `npm run portal:login` first to authenticate manually.');
    process.exit(1);
  }

  console.log('🤖 Portal worker starting…');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: STORAGE_PATH });
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUTS.action);

  let stopping = false;
  process.on('SIGINT',  () => { stopping = true; });
  process.on('SIGTERM', () => { stopping = true; });

  while (!stopping) {
    try {
      const jobs = await prisma.portalAssignmentJob.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        include: { lead: true, user: true },
        take: 5,
      });

      if (jobs.length === 0) {
        process.stdout.write('.');
      } else {
        console.log(`\n[Worker] Picked up ${jobs.length} pending job(s)`);
        for (const job of jobs) {
          if (stopping) break;
          await processJob(page, job);
          await sleep(TIMEOUTS.betweenJobs);
        }
      }
    } catch (err) {
      console.error('[Worker] Loop error:', err);
    }

    if (!stopping) await sleep(POLL_INTERVAL_MS);
  }

  console.log('\n👋 Stopping worker…');
  await browser.close();
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Worker crashed:', err);
  process.exit(1);
});
