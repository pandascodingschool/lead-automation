// Portal Jobs routes
const express = require('express');
const {
  showPortalJobs,
  retryPortalJob,
  startPortalLogin,
  finishPortalLogin,
  cancelPortalLogin,
} = require('../controllers/portalJobsController');

const router = express.Router();
router.use(express.urlencoded({ extended: false }));

router.get('/', showPortalJobs);
router.post('/login/start', startPortalLogin);
router.post('/login/finish', finishPortalLogin);
router.post('/login/cancel', cancelPortalLogin);
router.post('/:id/retry', retryPortalJob);

module.exports = router;
