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

const db = require('./database/init');
app.use(async (req, res, next) => {
  try { await db.ensureDatabase(); next(); }
  catch (err) { console.error('[IEMS API] database bootstrap failed', err); next(err); }
});

app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);

// Keep API failures JSON so the frontend never tries to parse an HTML/plain-text 500 page as JSON.
app.use((err, req, res, next) => {
  console.error('[IEMS API]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'حدث خطأ في الخادم. راجع سجلات Vercel لمزيد من التفاصيل.' });
});

app.get('/api/health', (req, res) => res.json({
  ok: true, database: 'postgresql',
  databaseConfigured: !!process.env.DATABASE_URL,
  jwtConfigured: !!process.env.JWT_SECRET
}));

module.exports = app;
