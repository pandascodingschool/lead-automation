// Entry point — Express server setup
require('dotenv').config();

const path = require('path');
const express = require('express');
const webhookRoutes = require('./routes/webhookRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const whatsappLogsRoutes = require('./routes/whatsappLogsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/dashboard', dashboardRoutes);
app.use('/whatsapp-logs', whatsappLogsRoutes);
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
  console.log(`🚀 IndiaMART Lead Automation server running on port ${PORT}`);
  console.log(`   POST http://localhost:${PORT}/webhook/indiamart`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/dashboard`);
});
