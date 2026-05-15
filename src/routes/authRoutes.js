// Auth routes
const express = require('express');
const { showLogin, login, logout } = require('../controllers/authController');

const router = express.Router();
router.use(express.urlencoded({ extended: false }));

router.get('/',       showLogin);
router.post('/',      login);
router.get('/logout', logout);

module.exports = router;
