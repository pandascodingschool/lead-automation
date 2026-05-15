// Centralised config + selectors for IndiaMART seller portal automation.
// All selectors are placeholders — update them after inspecting the live portal.
const path = require('path');

const STORAGE_PATH = path.resolve(__dirname, '../../sessions/storageState.json');
const SCREENSHOT_DIR = path.resolve(__dirname, '../../logs/screenshots');

const URLS = {
  LOGIN:        'https://seller.indiamart.com/',
  LEAD_MANAGER: 'https://seller.indiamart.com/messagecentre/',
};

// Playwright locators — KEEP THESE TEXT-BASED for resilience.
// Run portal:inspect once and update if needed.
const SELECTORS = {
  // login page
  alreadyLoggedIn:   'text=Lead Manager',

  // lead manager
  searchInput:       'input[placeholder*="Search"]',
  leadRowByQueryId:  (qid) => `text=${qid}`,            // row that contains the unique query id
  assignButton:      'button:has-text("Assign")',
  assigneeOption:    (name) => `role=menuitem[name="${name}"]`,
  saveAssignButton:  'button:has-text("Save")',

  // verification
  currentAssignee:   '[data-test="current-assignee"]',  // change after inspection
};

const TIMEOUTS = {
  navigation:  30000,
  action:      10000,
  betweenJobs:  2000,
};

module.exports = { STORAGE_PATH, SCREENSHOT_DIR, URLS, SELECTORS, TIMEOUTS };
