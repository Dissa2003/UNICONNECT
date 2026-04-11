// server.local.js
// Local dev server lah - use this when 'vercel dev' not working hor
// Run with: npm run local
// Serves same endpoints as production but on http://localhost:3001
require('dotenv').config();

const express = require('express');
const app = express();

// Parse JSON bodies lah - needed for POST /api/sync
app.use(express.json());

// Wire up the same handlers as Vercel would use lor
app.post('/api/sync', require('./api/sync'));
app.get('/api/cron-worker', require('./api/cron-worker'));

// Health check - quick confirm service is alive hor
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'reminders-service', env: 'local' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Reminders service running locally lor → http://localhost:${PORT}`);
  console.log('  POST http://localhost:' + PORT + '/api/sync');
  console.log('  GET  http://localhost:' + PORT + '/api/cron-worker');
});
