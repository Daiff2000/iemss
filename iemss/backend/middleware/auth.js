const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '';

function requireJwtSecret(res) {
  if (JWT_SECRET) return true;
  res.status(500).json({ error: 'JWT_SECRET غير مضبوط في Environment Variables على Vercel.' });
  return false;
}

function requireAuth(req, res, next) {
  if (!requireJwtSecret(res)) return;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'مطلوب تسجيل الدخول' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, role, name }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'الجلسة منتهية، من فضلك سجل الدخول مرة أخرى' });
  }
}

// Full-control admin only ('admin'). Used for anything sensitive:
// managing employees, changing roles, deleting, viewing full overview, etc.
function requireAdmin(req, res, next) {
  if (!requireJwtSecret(res)) return;
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'هذا الإجراء متاح للمدير (تحكم كامل) فقط' });
  }
  next();
}

// Either a full admin OR an "upload only" admin. Used for the master-import
// endpoint, since upload-only admins are allowed to import the Excel sheet
// but nothing else.
function requireSupervisor(req, res, next) {
  if (!requireJwtSecret(res)) return;
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
    return res.status(403).json({ error: 'هذا الإجراء متاح لمدير النظام أو المشرف فقط' });
  }
  next();
}

// Backward-compatible alias for old code; new permission model calls this role supervisor.
const requireUploader = requireSupervisor;

function requireAdminOrSupervisor(req, res, next) {
  return requireSupervisor(req, res, next);
}

module.exports = { requireAuth, requireAdmin, requireSupervisor, requireAdminOrSupervisor, requireUploader, JWT_SECRET };
