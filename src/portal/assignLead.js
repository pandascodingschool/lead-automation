/**
 * Performs the actual UI flow to assign a lead inside the IndiaMART seller panel.
 *
 * The selectors here are PLACEHOLDERS — after running `npm run portal:login` and
 * inspecting the real lead manager, update src/portal/config.js with the correct
 * locators. Keep them text/role based for resilience.
 *
 * @param {import('playwright').Page} page  - Playwright page (already authenticated)
 * @param {object} job  - PortalAssignmentJob row (with .lead populated)
 * @returns {Promise<void>}  - resolves on success, throws on failure
 */
const { URLS, SELECTORS, TIMEOUTS } = require('./config');

async function assignLeadInPortal(page, job) {
  const { lead, portalUser } = job;
  const queryId = lead.externalLeadId;

  // 1. Navigate to lead manager
  await page.goto(URLS.LEAD_MANAGER, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.navigation,
  });

  // 2. Search for the lead by IndiaMART unique query id
  const searchInput = page.locator(SELECTORS.searchInput).first();
  await searchInput.waitFor({ state: 'visible', timeout: TIMEOUTS.action });
  await searchInput.fill(queryId);
  await page.waitForTimeout(1500); // let results render

  // 3. Open the matching lead row
  const row = page.locator(SELECTORS.leadRowByQueryId(queryId)).first();
  await row.waitFor({ state: 'visible', timeout: TIMEOUTS.action });
  await row.click();

  // 4. Click "Assign"
  const assignBtn = page.locator(SELECTORS.assignButton).first();
  await assignBtn.waitFor({ state: 'visible', timeout: TIMEOUTS.action });
  await assignBtn.click();

  // 5. Pick the user
  const option = page.locator(SELECTORS.assigneeOption(portalUser)).first();
  await option.waitFor({ state: 'visible', timeout: TIMEOUTS.action });
  await option.click();

  // 6. Confirm / Save (some flows auto-save on click — keep this defensive)
  const saveBtn = page.locator(SELECTORS.saveAssignButton);
  if (await saveBtn.count() > 0) {
    await saveBtn.first().click();
  }

  // 7. Brief wait for the portal to persist
  await page.waitForTimeout(1500);
}

module.exports = { assignLeadInPortal };
