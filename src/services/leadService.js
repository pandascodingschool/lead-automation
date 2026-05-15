// Lead service — core business logic for lead creation and assignment
const prisma = require('../utils/prisma');
const { sendLeadWhatsApp } = require('./whatsappService');

// Round-robin state: tracks which user index to assign next
let roundRobinIndex = 0;

/**
 * Selects the next user using round-robin assignment.
 * Returns null if no users exist.
 */
async function getNextAssignedUser() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
  });

  if (users.length === 0) return null;

  const user = users[roundRobinIndex % users.length];
  roundRobinIndex = (roundRobinIndex + 1) % users.length;

  return user;
}

/**
 * Processes an incoming lead from IndiaMART:
 * - Checks for duplicates via externalLeadId
 * - Assigns a user via round-robin
 * - Saves the lead to DB
 *
 * Returns { duplicate: true } if already exists,
 * or { lead, assignedUser } on success.
 */
async function processLead(payload) {
  // Map real IndiaMART RESPONSE fields to internal names
  const {
    UNIQUE_QUERY_ID,
    SENDER_NAME,
    SENDER_MOBILE,
    SENDER_EMAIL,
    QUERY_PRODUCT_NAME,
    QUERY_MESSAGE,
    SENDER_CITY,
    SENDER_STATE,
    SENDER_COMPANY,
    SENDER_ADDRESS,
    SENDER_PINCODE,
    QUERY_TYPE,
    QUERY_TIME,
  } = payload;

  // Check for duplicate using IndiaMART's unique query ID
  const existing = await prisma.lead.findUnique({
    where: { externalLeadId: UNIQUE_QUERY_ID },
  });

  if (existing) {
    console.log(`[LeadService] Duplicate lead ignored: ${UNIQUE_QUERY_ID}`);
    return { duplicate: true };
  }

  // Assign next user via round-robin
  const assignedUser = await getNextAssignedUser();

  // Store lead in DB
  const lead = await prisma.lead.create({
    data: {
      externalLeadId: UNIQUE_QUERY_ID,
      customerName: SENDER_NAME,
      mobile: SENDER_MOBILE,
      email: SENDER_EMAIL || null,
      productName: QUERY_PRODUCT_NAME,
      message: QUERY_MESSAGE || null,
      city: SENDER_CITY || null,
      assignedToId: assignedUser ? assignedUser.id : null,
    },
  });

  console.log(
    `[LeadService] Lead ${lead.id} created and assigned to: ${assignedUser?.name ?? 'Unassigned'}`
  );

  // Record the initial assignment in history
  if (assignedUser) {
    await prisma.leadAssignmentHistory.create({
      data: { leadId: lead.id, assignedToId: assignedUser.id },
    });

    // Queue a portal assignment job (worker will pick it up)
    if (assignedUser.portalUserName) {
      await prisma.portalAssignmentJob.create({
        data: {
          leadId: lead.id,
          userId: assignedUser.id,
          portalUser: assignedUser.portalUserName,
        },
      });
    }
  }

  // Send WhatsApp notification to the customer — runs after DB save, does not block response
  sendLeadWhatsApp(lead, assignedUser);

  return { lead, assignedUser };
}

module.exports = { processLead };
