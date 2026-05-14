// WhatsApp Logs routes
const express = require('express');
const { showWhatsAppLogs } = require('../controllers/whatsappLogsController');

const router = express.Router();

router.get('/', showWhatsAppLogs);

module.exports = router;
