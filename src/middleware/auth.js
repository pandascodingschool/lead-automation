// Auth middleware — protect all UI routes
function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session?.user?.role === 'ADMIN') return next();
  res.status(403).send('Admin access required');
}

module.exports = { requireAuth, requireAdmin };
