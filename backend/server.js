require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const adminRoutes = require('./routes/admin');
const attendanceRoutes = require('./routes/attendance');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '12mb' }));

// Health must answer even when nothing is configured — reporting *that* is its
// entire job. It used to sit below the bootstrap middleware, so a missing
// DATABASE_URL made the one endpoint you'd use to diagnose a missing
// DATABASE_URL return 500.
app.get('/api/health', (req, res) => res.json({
  ok: true, database: 'postgresql',
  databaseConfigured: !!process.env.DATABASE_URL,
  jwtConfigured: !!process.env.JWT_SECRET
}));

const db = require('./database/init');
app.use(async (req, res, next) => {
  // A missing env var is a deployment mistake, not a server fault. Say so
  // instead of collapsing it into the generic 500 below, which gave no clue
  // what was actually wrong.
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL غير مضبوط في Environment Variables على Vercel.' });
  }
  try { await db.ensureDatabase(); next(); }
  catch (err) { console.error('[IEMS API] database bootstrap failed', err); next(err); }
});

app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);

// An unknown /api path used to fall through to the platform's HTML 404 page.
// Every frontend api() helper does `await res.json()`, so that surfaced as a
// confusing "Unexpected token '<'" instead of a readable message.
app.use('/api', (req, res) => {
  res.status(404).json({ error: `المسار غير موجود: ${req.method} ${req.originalUrl}` });
});

// Keep API failures JSON so the frontend never tries to parse an HTML/plain-text
// 500 page as JSON. Error middleware must be registered LAST — previously it sat
// above the health route, so anything thrown there escaped it.
app.use((err, req, res, next) => {
  console.error('[IEMS API]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'حدث خطأ في الخادم. راجع سجلات Vercel لمزيد من التفاصيل.' });
});

module.exports = app;

// On Vercel this file is imported by api/index.js and the platform owns the
// listener, so we must not call listen() there. Running it directly
// (`node backend/server.js`) is what local development needs, and that's the
// target the Vite dev proxy points at.
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`[IEMS API] listening on http://localhost:${port}`));
}
