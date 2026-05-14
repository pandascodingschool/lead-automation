// WhatsApp Logs controller — fetches all message records for the logs view
const prisma = require('../utils/prisma');

async function showWhatsAppLogs(req, res) {
  try {
    const logs = await prisma.whatsAppLog.findMany({
      orderBy: { sentAt: 'desc' },
      include: {
        lead: {
          select: {
            customerName: true,
            productName: true,
            externalLeadId: true,
          },
        },
      },
    });

    const totalSent   = logs.filter(l => l.status === 'sent').length;
    const totalFailed = logs.filter(l => l.status === 'failed').length;

    res.render('whatsapp-logs', { logs, totalSent, totalFailed });
  } catch (error) {
    console.error('[WhatsAppLogs] Error loading logs:', error);
    res.status(500).send('Failed to load WhatsApp logs');
  }
}

module.exports = { showWhatsAppLogs };
