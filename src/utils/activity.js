// Shared helper — write a LeadActivity row.
// Called from controllers; never throws so it never breaks the caller flow.
const prisma = require('./prisma');

async function logActivity(leadId, type, body, userId = null) {
  try {
    await prisma.leadActivity.create({
      data: { leadId, type, body: body ?? null, userId: userId ?? null },
    });
  } catch (err) {
    console.error('[Activity] Failed to log:', err.message);
  }
}

module.exports = { logActivity };
