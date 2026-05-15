// Portal Jobs controller — view + retry for IndiaMART portal assignment jobs
const prisma = require('../utils/prisma');
const sessionManager = require('../portal/sessionManager');

async function showPortalJobs(req, res) {
  try {
    const jobs = await prisma.portalAssignmentJob.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            externalLeadId: true,
            customerName: true,
            productName: true,
          },
        },
        user: { select: { name: true, portalUserName: true } },
      },
      take: 200,
    });

    const counts = {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === 'PENDING').length,
      running: jobs.filter((j) => j.status === 'RUNNING').length,
      done: jobs.filter((j) => j.status === 'DONE').length,
      failed: jobs.filter((j) => j.status === 'FAILED').length,
    };

    res.render('portal-jobs', {
      jobs,
      counts,
      session: sessionManager.getStatus(),
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (error) {
    console.error('[PortalJobs] Error loading jobs:', error);
    res.status(500).send('Failed to load portal jobs');
  }
}

/**
 * POST /portal-jobs/login/start
 * Launches a headed Chromium so the user can log in to IndiaMART.
 */
async function startPortalLogin(req, res) {
  const result = await sessionManager.startLogin();
  if (result.ok) {
    return res.redirect(
      '/portal-jobs?success=Browser+opened.+Log+in+then+click+%22I%27m+done%22+below.'
    );
  }
  return res.redirect(
    '/portal-jobs?error=' + encodeURIComponent(result.reason)
  );
}

/**
 * POST /portal-jobs/login/finish
 * Saves the live session to storageState.json and closes the browser.
 */
async function finishPortalLogin(req, res) {
  const result = await sessionManager.finishLogin();
  if (result.ok) {
    return res.redirect(
      '/portal-jobs?success=Connected+to+IndiaMART.+Session+saved.'
    );
  }
  return res.redirect(
    '/portal-jobs?error=' + encodeURIComponent(result.reason)
  );
}

/**
 * POST /portal-jobs/login/cancel
 * Aborts an in-progress login (closes the browser without saving).
 */
async function cancelPortalLogin(req, res) {
  await sessionManager.cancelLogin();
  res.redirect('/portal-jobs?success=Login+cancelled.');
}

/**
 * POST /portal-jobs/:id/retry
 * Resets a FAILED job back to PENDING so the worker picks it up again.
 */
async function retryPortalJob(req, res) {
  const { id } = req.params;
  try {
    await prisma.portalAssignmentJob.update({
      where: { id },
      data: {
        status: 'PENDING',
        errorMsg: null,
        screenshot: null,
        attempts: 0,
      },
    });
    res.redirect('/portal-jobs?success=Job+queued+for+retry');
  } catch (error) {
    console.error('[PortalJobs] Error retrying job:', error);
    res.redirect('/portal-jobs?error=Failed+to+retry+job');
  }
}

module.exports = {
  showPortalJobs,
  retryPortalJob,
  startPortalLogin,
  finishPortalLogin,
  cancelPortalLogin,
};
