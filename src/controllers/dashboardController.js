// Dashboard controller — fetches users and leads for the view, and handles user creation
const prisma = require('../utils/prisma');

async function showDashboard(req, res) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [users, leads, todayFollowUps] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { leads: true } } },
      }),
      prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { name: true } },
          assignmentHistory: {
            orderBy: { assignedAt: 'desc' },
            include: { assignedTo: { select: { name: true } } },
          },
        },
      }),
      prisma.followUp.findMany({
        where: {
          scheduledAt: { gte: todayStart, lte: todayEnd },
          completedAt: null,
        },
        orderBy: { scheduledAt: 'asc' },
        include: {
          lead: { select: { id: true, customerName: true, productName: true } },
          user: { select: { name: true } },
        },
      }),
    ]);

    res.render('dashboard', {
      users,
      leads,
      todayFollowUps,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (error) {
    console.error('[Dashboard] Error loading data:', error);
    res.status(500).send('Failed to load dashboard');
  }
}

/**
 * POST /dashboard/users
 * Creates a new sales user. Redirects back to dashboard.
 */
async function addUser(req, res) {
  const { name, email, portalUserName } = req.body;

  if (!name || !email) {
    return res.redirect('/dashboard?error=Name+and+email+are+required');
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return res.redirect(
        '/dashboard?error=A+user+with+this+email+already+exists'
      );
    }

    await prisma.user.create({
      data: {
        name,
        email,
        portalUserName: portalUserName?.trim() || null,
      },
    });
    res.redirect('/dashboard?success=User+added+successfully');
  } catch (error) {
    console.error('[Dashboard] Error adding user:', error);
    res.redirect('/dashboard?error=Failed+to+add+user');
  }
}

const VALID_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'CLOSED_WON',
  'CLOSED_LOST',
];

/**
 * POST /dashboard/leads/:id/status
 * Updates the status of a lead. Redirects back to dashboard.
 */
async function updateLeadStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.redirect('/dashboard?error=Invalid+lead+status');
  }

  try {
    await prisma.lead.update({ where: { id }, data: { status } });
    res.redirect('/dashboard?success=Lead+status+updated');
  } catch (error) {
    console.error('[Dashboard] Error updating lead status:', error);
    res.redirect('/dashboard?error=Failed+to+update+lead+status');
  }
}

/**
 * POST /dashboard/leads/:id/assign
 * Re-assigns a lead to a different user. Records old + new assignment in history.
 */
async function reassignLead(req, res) {
  const { id } = req.params;
  const { assignedToId } = req.body;

  if (!assignedToId) {
    return res.redirect('/dashboard?error=Please+select+a+user+to+assign');
  }

  try {
    const newAssignee = await prisma.user.findUnique({
      where: { id: assignedToId },
    });
    if (!newAssignee) {
      return res.redirect('/dashboard?error=Selected+user+not+found');
    }

    await prisma.lead.update({
      where: { id },
      data: { assignedToId },
    });

    // Record the re-assignment in history
    await prisma.leadAssignmentHistory.create({
      data: { leadId: id, assignedToId },
    });

    // Queue a portal job to push this re-assignment to IndiaMART
    if (newAssignee.portalUserName) {
      await prisma.portalAssignmentJob.create({
        data: {
          leadId: id,
          userId: assignedToId,
          portalUser: newAssignee.portalUserName,
        },
      });
    }

    res.redirect('/dashboard?success=Lead+reassigned+successfully');
  } catch (error) {
    console.error('[Dashboard] Error reassigning lead:', error);
    res.redirect('/dashboard?error=Failed+to+reassign+lead');
  }
}

/**
 * POST /dashboard/leads
 * Manually creates a new lead from the dashboard form.
 */
async function createLead(req, res) {
  const {
    customerName,
    mobile,
    email,
    productName,
    city,
    message,
    assignedToId,
  } = req.body;

  if (!customerName || !mobile || !productName) {
    return res.redirect(
      '/dashboard?error=Customer+name%2C+mobile+and+product+are+required'
    );
  }

  try {
    const externalLeadId = 'MANUAL-' + Date.now();
    await prisma.lead.create({
      data: {
        externalLeadId,
        customerName: customerName.trim(),
        mobile: mobile.trim(),
        email: email?.trim() || null,
        productName: productName.trim(),
        city: city?.trim() || null,
        message: message?.trim() || null,
        assignedToId: assignedToId || null,
      },
    });
    res.redirect('/dashboard?success=Lead+created+successfully');
  } catch (err) {
    console.error('[Dashboard] Error creating lead:', err);
    res.redirect('/dashboard?error=Failed+to+create+lead');
  }
}

module.exports = {
  showDashboard,
  addUser,
  updateLeadStatus,
  reassignLead,
  createLead,
};
