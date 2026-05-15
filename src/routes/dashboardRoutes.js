// Dashboard routes
const express = require('express');
const {
  showDashboard,
  addUser,
  updateLeadStatus,
  reassignLead,
  createLead,
} = require('../controllers/dashboardController');

const router = express.Router();

// Parse form submissions
router.use(express.urlencoded({ extended: false }));

router.get('/', showDashboard);
router.post('/users', addUser);
router.post('/leads', createLead);
router.post('/leads/:id/status', updateLeadStatus);
router.post('/leads/:id/assign', reassignLead);

module.exports = router;
