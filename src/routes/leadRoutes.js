// Lead detail + CRM action routes
const express = require('express');
const {
  showLead,
  updateStatus,
  addNote,
  addFollowUp,
  completeFollowUp,
} = require('../controllers/leadController');

const router = express.Router();
router.use(express.urlencoded({ extended: false }));

router.get('/:id',                              showLead);
router.post('/:id/status',                      updateStatus);
router.post('/:id/notes',                       addNote);
router.post('/:id/followups',                   addFollowUp);
router.post('/:id/followups/:fid/complete',     completeFollowUp);

module.exports = router;
