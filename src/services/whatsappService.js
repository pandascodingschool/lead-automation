// WhatsApp service — sends automated messages to leads via Twilio WhatsApp API
const twilio = require('twilio');
const prisma = require('../utils/prisma');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Builds a personalised WhatsApp message for the lead.
 *
 * @param {object} lead  - Lead record from DB
 * @param {object|null} assignedUser - User assigned to this lead
 * @returns {string} message text
 */
function buildLeadMessage(lead, assignedUser) {
  const assigneeName = assignedUser ? assignedUser.name : 'our team';

  return (
    `Hello ${lead.customerName}! 👋\n\n` +
    `Thank you for your enquiry about *${lead.productName}*.\n\n` +
    `We have received your request and *${assigneeName}* from our sales team ` +
    `will get in touch with you shortly.\n\n` +
    `📋 *Enquiry Summary*\n` +
    `• Product: ${lead.productName}\n` +
    (lead.city ? `• Location: ${lead.city}\n` : '') +
    (lead.message ? `• Your message: _${lead.message}_\n` : '') +
    `\nFor urgent queries, feel free to reply to this message.\n\n` +
    `— IndiaMART Lead Team`
  );
}

/**
 * Sends a WhatsApp message to the customer who submitted the lead.
 *
 * Skips silently if:
 *  - WHATSAPP_ENABLED is not "true"
 *  - mobile number is missing
 *
 * @param {object} lead         - Lead record (must have .mobile, .customerName, .productName)
 * @param {object|null} assignedUser - The sales user assigned to this lead
 */
async function sendLeadWhatsApp(lead, assignedUser) {
  if (process.env.WHATSAPP_ENABLED !== 'true') {
    console.log('[WhatsApp] Notifications disabled — skipping.');
    return;
  }

  if (!lead.mobile) {
    console.warn('[WhatsApp] No mobile number on lead — skipping.');
    return;
  }

  // Normalise Indian mobile numbers
  // Handles formats: +91-9999999999 / +919999999999 / 9999999999 / 09999999999
  const rawNumber = lead.mobile.replace(/[\s\-]/g, '');
  const e164 = rawNumber.startsWith('+')
    ? rawNumber
    : `+91${rawNumber.replace(/^0/, '')}`;

  const to = `whatsapp:${e164}`;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const body = buildLeadMessage(lead, assignedUser);

  try {
    const message = await client.messages.create({ from, to, body });
    console.log(`[WhatsApp] Message sent to ${e164} — SID: ${message.sid}`);

    await prisma.whatsAppLog.create({
      data: {
        leadId: lead.id,
        mobile: e164,
        status: 'sent',
        twilioSid: message.sid,
      },
    });
  } catch (err) {
    // Log but do NOT throw — WhatsApp failure must not break lead creation
    console.error(`[WhatsApp] Failed to send message to ${e164}:`, err.message);

    await prisma.whatsAppLog
      .create({
        data: {
          leadId: lead.id,
          mobile: e164,
          status: 'failed',
          errorMsg: err.message,
        },
      })
      .catch(() => {}); // silently swallow logging errors
  }
}

module.exports = { sendLeadWhatsApp };
