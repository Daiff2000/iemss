const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/init');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// simple in-memory rate limiting per IP for login attempts
const attempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function rateLimited(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

router.post('/login', async (req, res) => {
  const ip = req.ip;
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'محاولات كثيرة جدًا، حاول بعد قليل' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET غير مضبوط في Environment Variables على Vercel.' });
  }

  const { id, password } = req.body || {};
  if (!id || !password) {
    return res.status(400).json({ error: 'من فضلك أدخل الـID وكلمة المرور' });
  }

  const emp = (await db.prepare('SELECT * FROM employees WHERE id = ?').get(Number(id)));
  const ok = emp && bcrypt.compareSync(String(password), emp.password_hash);

  await db.prepare('INSERT INTO login_audit (employee_id, success, ip) VALUES (?, ?, ?)')
    .run(emp ? emp.id : null, ok ? 1 : 0, ip);

  if (!ok) {
    return res.status(401).json({ error: 'الرقم التعريفي أو كلمة المرور غير صحيحة' });
  }

  const token = jwt.sign(
    { id: emp.id, role: emp.role, name: emp.name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      shift: emp.shift,
      company: emp.company,
      department: emp.department,
      must_change_password: !!emp.must_change_password,
    },
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const emp = await db.prepare('SELECT id, name, role, shift, company, department FROM employees WHERE id = ?')
    .get(req.user.id);
  if (!emp) return res.status(404).json({ error: 'غير موجود' });
  res.json({ user: emp });
});

module.exports = router;
