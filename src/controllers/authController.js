// Auth controller — login / logout
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

function showLogin(req, res) {
  if (req.session?.user) return res.redirect('/dashboard');
  res.render('login', { error: req.query.error || null });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.redirect('/login?error=Email+and+password+required');
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (!user || !user.passwordHash) {
      return res.redirect('/login?error=Invalid+email+or+password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.redirect('/login?error=Invalid+email+or+password');
    }

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.redirect('/dashboard');
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.redirect('/login?error=Login+failed.+Try+again.');
  }
}

function logout(req, res) {
  req.session.destroy(() => res.redirect('/login'));
}

module.exports = { showLogin, login, logout };
