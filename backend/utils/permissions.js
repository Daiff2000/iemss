// ---------------------------------------------------------------------------
// Customizable role permissions.
//
// Only 'admin' and 'supervisor' are customizable. 'system_creator' always has
// every permission (it is the only role allowed to edit this matrix, and
// locking it out of its own features would be a self-lockout bug). 'employee'
// is intentionally NOT customizable here — employee-facing screens only ever
// show that user's own data and are not part of this admin/supervisor matrix.
//
// Storage: a single row in system_settings (key = 'role_permissions'),
// reusing the same table the banner feature already uses, so no schema
// migration is required. The stored JSON only needs to contain overrides;
// anything missing falls back to DEFAULTS below.
// ---------------------------------------------------------------------------
const db = require('../database/init');

const SETTINGS_KEY = 'role_permissions';
const CUSTOMIZABLE_ROLES = ['admin', 'supervisor'];

// The full catalog of gated actions/pages. `group` is just for the UI to
// organize checkboxes; `label` is the Arabic text shown to the system
// creator when editing the matrix.
const PERMISSION_CATALOG = [
  { key: 'view_employees', label: 'صفحات الموظفين (كل الموظفين / الحاليون / المغادرون / الجدد)', group: 'الصفحات' },
  { key: 'import_data', label: 'استيراد وتحديث البيانات (شيت Master)', group: 'الصفحات' },
  { key: 'view_reports', label: 'صفحة التقارير', group: 'الصفحات' },
  { key: 'manual_entry', label: 'الإدخال اليدوي وصفحة نظرة عامة (Overview)', group: 'الصفحات' },
];

const PERMISSION_KEYS = PERMISSION_CATALOG.map(p => p.key);

// Defaults mirror the app's previous hardcoded behaviour, so turning this
// feature on changes nothing until the system creator edits it.
const DEFAULTS = {
  admin: {
    view_employees: true, import_data: true, view_reports: true, manual_entry: true,
  },
  supervisor: {
    view_employees: true, import_data: true, view_reports: true, manual_entry: false,
  },
};

let cache = null; // { admin: {...}, supervisor: {...} } | null until first load

function sanitizeMatrix(raw) {
  const out = { admin: { ...DEFAULTS.admin }, supervisor: { ...DEFAULTS.supervisor } };
  if (raw && typeof raw === 'object') {
    for (const role of CUSTOMIZABLE_ROLES) {
      const roleOverrides = raw[role];
      if (!roleOverrides || typeof roleOverrides !== 'object') continue;
      for (const key of PERMISSION_KEYS) {
        if (typeof roleOverrides[key] === 'boolean') out[role][key] = roleOverrides[key];
      }
    }
  }
  return out;
}

async function loadPermissions({ force = false } = {}) {
  if (cache && !force) return cache;
  const row = await db.prepare(`SELECT value_json FROM system_settings WHERE key = ?`).get(SETTINGS_KEY);
  cache = sanitizeMatrix(row ? row.value_json : null);
  return cache;
}

function invalidatePermissionsCache() { cache = null; }

async function savePermissions(matrix, updatedBy) {
  const clean = sanitizeMatrix(matrix);
  await db.prepare(`
    INSERT INTO system_settings (key, value_json, updated_by)
    VALUES (?, ?::jsonb, ?)
    ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP
  `).run(SETTINGS_KEY, JSON.stringify(clean), Number(updatedBy) || null);
  cache = clean;
  return clean;
}

// Effective boolean for one role + one permission key.
async function hasPermission(role, key) {
  if (role === 'system_creator') return true;
  if (!CUSTOMIZABLE_ROLES.includes(role)) return false;
  if (!PERMISSION_KEYS.includes(key)) return false;
  const matrix = await loadPermissions();
  return !!matrix[role]?.[key];
}

// Full permission map for a single role, e.g. to embed in the JWT/user
// payload sent to the frontend so it can show/hide nav links and buttons.
async function permissionsForRole(role) {
  if (role === 'system_creator') {
    return Object.fromEntries(PERMISSION_KEYS.map(k => [k, true]));
  }
  if (!CUSTOMIZABLE_ROLES.includes(role)) {
    return Object.fromEntries(PERMISSION_KEYS.map(k => [k, false]));
  }
  const matrix = await loadPermissions();
  return { ...matrix[role] };
}

module.exports = {
  PERMISSION_CATALOG, PERMISSION_KEYS, CUSTOMIZABLE_ROLES, DEFAULTS,
  loadPermissions, invalidatePermissionsCache, savePermissions,
  hasPermission, permissionsForRole,
};
