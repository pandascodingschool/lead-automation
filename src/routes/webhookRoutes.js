// Webhook routes — mounts the IndiaMART webhook endpoint
const express = require('express');
const { handleIndiamartWebhook } = require('../controllers/webhookController');

const router = express.Router();

// POST /webhook/indiamart — main lead ingestion endpoint
router.post('/indiamart', handleIndiamartWebhook);

module.exports = router;
