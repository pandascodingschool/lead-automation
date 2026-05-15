// Lead Detail controller — full CRM view per lead (notes, follow-ups, activity timeline)
const prisma = require('../utils/prisma');
const { logActivity } = require('../utils/activity');

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL = {
  NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified',
  CLOSED_WON: 'Closed Won', CLOSED_LOST: 'Closed Lost',
};
const ALL_STATUSES = Object.keys(STATUS_LABEL);

async function fetchLead(id) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      assignedTo: true,
      notes: { include: { user: true }, orderBy: { createdAt: 'desc' } },
      followUps: { include: { user: true }, orderBy: { scheduledAt: 'asc' } },
      activities: { include: { user: true }, orderBy: { createdAt: 'desc' } },
      assignmentHistory: { include: { assignedTo: true }, orderBy: { assignedAt: 'desc' } },
      whatsAppLogs: { orderBy: { sentAt: 'desc' } },
    },
  });
}

// ── GET /leads/:id ────────────────────────────────────────────────────────────

async function showLead(req, res) {
  try {
    const lead = await fetchLead(req.params.id);
    if (!lead) return res.status(404).send('Lead not found');

    const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
    const now = new Date();

    res.render('lead-detail', {
      lead,
      users,
      now,
      allStatuses: ALL_STATUSES,
      statusLabel: STATUS_LABEL,
      currentUser: req.session?.user ?? null,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error('[LeadController] showLead:', err);
    res.status(500).send('Failed to load lead');
  }
}

// ── POST /leads/:id/status ────────────────────────────────────────────────────

async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!ALL_STATUSES.includes(status)) {
    return res.redirect(`/leads/${id}?error=Invalid+status`);
  }
  try {
    const old = await prisma.lead.findUnique({ where: { id }, select: { status: true } });
    await prisma.lead.update({ where: { id }, data: { status } });
    await logActivity(id, 'STATUS_CHANGE',
      `Status changed from ${STATUS_LABEL[old.status]} → ${STATUS_LABEL[status]}`,
      req.session?.user?.id);
    res.redirect(`/leads/${id}?success=Status+updated`);
  } catch (err) {
    console.error('[LeadController] updateStatus:', err);
    res.redirect(`/leads/${id}?error=Failed+to+update+status`);
  }
}

// ── POST /leads/:id/notes ─────────────────────────────────────────────────────

async function addNote(req, res) {
  const { id } = req.params;
  const { text } = req.body;
  const userId = req.session?.user?.id;
  if (!text?.trim()) return res.redirect(`/leads/${id}?error=Note+cannot+be+empty`);
  try {
    await prisma.leadNote.create({ data: { leadId: id, userId, text: text.trim() } });
    await logActivity(id, 'NOTE', text.trim(), userId);
    res.redirect(`/leads/${id}?success=Note+added#notes`);
  } catch (err) {
    console.error('[LeadController] addNote:', err);
    res.redirect(`/leads/${id}?error=Failed+to+add+note`);
  }
}

// ── POST /leads/:id/followups ─────────────────────────────────────────────────

async function addFollowUp(req, res) {
  const { id } = req.params;
  const { scheduledAt, note } = req.body;
  const userId = req.session?.user?.id;
  if (!scheduledAt) return res.redirect(`/leads/${id}?error=Please+pick+a+date+%26+time`);
  try {
    await prisma.followUp.create({
      data: { leadId: id, userId, scheduledAt: new Date(scheduledAt), note: note?.trim() || null },
    });
    await logActivity(id, 'FOLLOWUP_ADDED',
      `Follow-up scheduled for ${new Date(scheduledAt).toLocaleString('en-IN')}${note ? ': ' + note : ''}`,
      userId);
    res.redirect(`/leads/${id}?success=Follow-up+scheduled#followups`);
  } catch (err) {
    console.error('[LeadController] addFollowUp:', err);
    res.redirect(`/leads/${id}?error=Failed+to+schedule+follow-up`);
  }
}

// ── POST /leads/:id/followups/:fid/complete ───────────────────────────────────

async function completeFollowUp(req, res) {
  const { id, fid } = req.params;
  const userId = req.session?.user?.id;
  try {
    const fu = await prisma.followUp.update({
      where: { id: fid },
      data: { completedAt: new Date() },
    });
    await logActivity(id, 'FOLLOWUP_DONE',
      `Follow-up completed (was due ${new Date(fu.scheduledAt).toLocaleString('en-IN')})`,
      userId);
    res.redirect(`/leads/${id}?success=Follow-up+marked+done#followups`);
  } catch (err) {
    console.error('[LeadController] completeFollowUp:', err);
    res.redirect(`/leads/${id}?error=Failed+to+complete+follow-up`);
  }
}

module.exports = { showLead, updateStatus, addNote, addFollowUp, completeFollowUp };
