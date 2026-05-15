// Entry point — Express server setup
require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const webhookRoutes = require('./routes/webhookRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const whatsappLogsRoutes = require('./routes/whatsappLogsRoutes');
const portalJobsRoutes = require('./routes/portalJobsRoutes');
const leadRoutes = require('./routes/leadRoutes');
const authRoutes = require('./routes/authRoutes');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session store (reuses the same PG connection string)
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
app.use(
  session({
    store: new pgSession({ pool: pgPool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'crm-dev-secret-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
  })
);

// Middleware
app.use(express.json());

// Inject shared template locals
const portalSessionManager = require('./portal/sessionManager');
app.use((req, res, next) => {
  res.locals.portalSession = portalSessionManager.getStatus();
  res.locals.currentUser = req.session?.user ?? null;
  next();
});

// Health check — public
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes — public
app.use('/login', authRoutes);

// Root redirect
app.get('/', (req, res) => res.redirect('/dashboard'));

// Protected UI routes
app.use('/dashboard', requireAuth, dashboardRoutes);
app.use('/leads', requireAuth, leadRoutes);
app.use('/whatsapp-logs', requireAuth, whatsappLogsRoutes);
app.use('/portal-jobs', requireAuth, portalJobsRoutes);

// Webhook — no auth (called by IndiaMART servers)
app.use('/webhook', webhookRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 IndiaMART CRM running on port ${PORT}`);
  console.log(`   GET  http://localhost:${PORT}/dashboard`);
  console.log(`   GET  http://localhost:${PORT}/login`);
});
