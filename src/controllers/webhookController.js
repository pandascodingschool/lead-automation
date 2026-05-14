// Webhook controller — validates incoming payload and delegates to service
const { processLead } = require("../services/leadService");

/**
 * POST /webhook/indiamart
 * Accepts the real IndiaMART Push API payload and processes the lead.
 *
 * Expected structure:
 * { body: { CODE, STATUS, RESPONSE: { UNIQUE_QUERY_ID, SENDER_NAME, ... } } }
 */
async function handleIndiamartWebhook(req, res) {
  // IndiaMART wraps lead data inside req.body.body.RESPONSE
  const indiamartBody = req.body?.body;
  const response = indiamartBody?.RESPONSE;

  // Validate top-level status
  if (
    !indiamartBody ||
    indiamartBody.CODE !== 200 ||
    indiamartBody.STATUS !== "SUCCESS"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid or unsuccessful IndiaMART payload",
    });
  }

  // Validate required RESPONSE fields
  const { UNIQUE_QUERY_ID, SENDER_NAME, SENDER_MOBILE, QUERY_PRODUCT_NAME } =
    response || {};

  if (
    !UNIQUE_QUERY_ID ||
    !SENDER_NAME ||
    !SENDER_MOBILE ||
    !QUERY_PRODUCT_NAME
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: UNIQUE_QUERY_ID, SENDER_NAME, SENDER_MOBILE, QUERY_PRODUCT_NAME",
    });
  }

  try {
    const result = await processLead(response);

    if (result.duplicate) {
      return res.status(200).json({
        success: false,
        message: "Duplicate lead ignored",
      });
    }

    return res.status(201).json({
      success: true,
      leadId: result.lead.id,
      assignedTo: result.assignedUser ? result.assignedUser.name : "Unassigned",
      message: "Lead created successfully",
    });
  } catch (error) {
    console.error("[WebhookController] Error processing lead:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = { handleIndiamartWebhook };
