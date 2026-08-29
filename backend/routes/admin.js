const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/init');
const { requireAuth, requireAdmin, requireSupervisor, requireUploader } = require('../middleware/auth');
const { parseMasterWorkbook } = require('../utils/master-import');
const { computeTop5ByStage } = require('./employee');

const router = express.Router();
function parseList(v){const a=Array.isArray(v)?v:String(v??'').split(',');return [...new Set(a.flatMap(x=>String(x).split(',')).map(x=>x.trim()).filter(x=>x&&x!=='__ALL__'))];}

const DEFAULT_PASSWORD = 'P@ssw0rd';

// Loose Arabic name normalization used to match supervisor names (from the
// OPP A / OPP B / QC / File Trail sheets) against employees.name.
function normalizeArabicName(value) {
  if (!value) return '';
  return String(value)
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Match a supervisor name against a Map<normalizedFullName, employeeId>.
 * Tries an exact normalized match first (fast path via the map), then falls
 * back to a token-containment match for sheets that record a shortened name
 * (e.g. missing the last part) — matches only if exactly one employee's
 * normalized name contains every word of the supervisor name.
 */
function matchSupervisorName(rawName, nameIndex, allEmployees) {
  const normalized = normalizeArabicName(rawName);
  if (!normalized) return null;
  if (nameIndex.has(normalized)) return nameIndex.get(normalized);

  const tokens = normalized.split(' ').filter(Boolean);
  if (!tokens.length) return null;
  const candidates = allEmployees.filter(e => {
    const empTokens = new Set(normalizeArabicName(e.name).split(' ').filter(Boolean));
    return tokens.every(t => empTokens.has(t));
  });
  return candidates.length === 1 ? candidates[0].id : null;
}

router.post('/import-master', requireAuth, requireUploader, async (req, res) => {
  try {
    const { filename, data, merge } = req.body || {};
    if (!data) return res.status(400).json({ error: 'من فضلك اختر ملف Excel.' });
    if (typeof data !== 'string' || data.length > 12_000_000) {
      return res.status(413).json({ error: 'حجم ملف Excel كبير جدًا.' });
    }
    if (filename && !/\.xlsx$/i.test(filename)) {
      return res.status(400).json({ error: 'ارفع ملف Excel بصيغة .xlsx فقط.' });
    }

    const base64 = data.includes(',') ? data.split(',').pop() : data;
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) return res.status(400).json({ error: 'ملف Excel فارغ أو غير صالح.' });
    if (buffer.length > 8 * 1024 * 1024) return res.status(413).json({ error: 'حجم الملف يتجاوز 8MB.' });

    const parsed = parseMasterWorkbook(buffer);
    const employees = parsed.employees;

    const findEmp = db.prepare('SELECT id, password_hash, role FROM employees WHERE id = ?');
    const findByName = db.prepare("SELECT id, password_hash, role FROM employees WHERE name = ? ORDER BY id LIMIT 1");
    const insertEmp = db.prepare(`
      INSERT INTO employees
      (id, emp_num, name, education, residence, company, shift, department, password_hash, role, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'employee', 0)
    `);
    const updateEmp = db.prepare(`
      UPDATE employees
      SET emp_num = ?, name = ?, education = ?, residence = ?, company = ?, shift = ?, department = ?
      WHERE id = ? AND role = 'employee'
    `);
    const insertSummary = db.prepare(`
      INSERT INTO employee_summary
      (employee_id, total_achievement, total_target, percentage, bonus_tier, unauthorized_absence, total_absence, work_nature_allowance,
       monthly_target, total_present_days, total_absence_days, casual_leave, leave_with_permission, leave_without_permission,
       sick_leave, late_days, late_hours, overtime_days, overtime_hours, special_bonus_days, special_deductions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(employee_id) DO UPDATE SET
        total_achievement=excluded.total_achievement,
        total_target=excluded.total_target,
        percentage=excluded.percentage,
        bonus_tier=excluded.bonus_tier,
        unauthorized_absence=excluded.unauthorized_absence,
        total_absence=excluded.total_absence,
        work_nature_allowance=excluded.work_nature_allowance,
        monthly_target=excluded.monthly_target,
        total_present_days=excluded.total_present_days,
        total_absence_days=excluded.total_absence_days,
        casual_leave=excluded.casual_leave,
        leave_with_permission=excluded.leave_with_permission,
        leave_without_permission=excluded.leave_without_permission,
        sick_leave=excluded.sick_leave,
        late_days=excluded.late_days,
        late_hours=excluded.late_hours,
        overtime_days=excluded.overtime_days,
        overtime_hours=excluded.overtime_hours,
        special_bonus_days=excluded.special_bonus_days,
        special_deductions=excluded.special_deductions
    `);
    const deleteDaily = db.prepare('DELETE FROM stage_daily WHERE employee_id = ?');
    // Daily rows can be tens of thousands for a single workbook. Sending one
    // INSERT statement per cell/day is far too slow on serverless PostgreSQL
    // and can hit the database statement timeout. We collect rows and write
    // them in batches below (500 rows/query).
    async function insertDailyBatch(rows) {
      if (!rows.length) return;
      const CHUNK = 500;
      for (let start = 0; start < rows.length; start += CHUNK) {
        const chunk = rows.slice(start, start + CHUNK);
        const values = [];
        const placeholders = chunk.map((r, i) => {
          const n = i * 5;
          values.push(r[0], r[1], r[2], r[3], r[4]);
          return `($${n + 1},$${n + 2},$${n + 3},$${n + 4},$${n + 5})`;
        }).join(',');
        await db.query(`
          INSERT INTO stage_daily (employee_id, stage, entry_date, value_num, value_text)
          VALUES ${placeholders}
          ON CONFLICT(employee_id, stage, entry_date) DO UPDATE SET
            value_num=excluded.value_num, value_text=excluded.value_text
        `, values);
      }
    }

    const deleteSupervisorTargets = db.prepare('DELETE FROM supervisor_targets');
    const insertSupervisorTarget = db.prepare(`
      INSERT INTO supervisor_targets (employee_id, supervisor_name, section, entry_date, target_daily, target_monthly, metrics_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(section, supervisor_name, entry_date) DO UPDATE SET
        employee_id=excluded.employee_id,
        target_daily=excluded.target_daily,
        target_monthly=excluded.target_monthly,
        metrics_json=excluded.metrics_json
    `);

    const masterIds = new Set();

    const tx = db.transaction(async (rows) => {
      let created = 0;
      let updated = 0;
      let daily = 0;
      let skipped = 0;
      const newCredentials = [];
      const updatedEmployees = [];
      const createdEmployees = [];

      for (const emp of rows) {
        if (!emp.id || emp.id === 0 || !emp.name) { skipped++; continue; }

        const existing = emp.generatedId ? (await findByName.get(emp.name)) : (await findEmp.get(emp.id));
        if (existing && emp.generatedId) emp.id = existing.id;
        if (existing && existing.role !== 'employee') { skipped++; continue; }

        masterIds.add(emp.id);

        if (!existing) {
          const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
          (await insertEmp.run(
            emp.id, emp.emp_num || emp.id, emp.name, emp.education, emp.residence,
            emp.company, emp.shift, emp.department, hash
          ));
          created++;
          createdEmployees.push({ id: emp.id, name: emp.name });
          newCredentials.push({ id: emp.id, name: emp.name, password: DEFAULT_PASSWORD });
        } else {
          (await updateEmp.run(
            emp.emp_num || emp.id, emp.name, emp.education, emp.residence,
            emp.company, emp.shift, emp.department, emp.id
          ));
          updated++;
          updatedEmployees.push({ id: emp.id, name: emp.name });
        }

        if (!merge) (await deleteDaily.run(emp.id));
        const dailyRows = [];
        for (const stage of emp.stages) {
          for (const [date, value] of Object.entries(stage.daily)) {
            const numeric = typeof value === 'number' && Number.isFinite(value);
            dailyRows.push([emp.id, stage.role, date, numeric ? value : null, numeric ? null : String(value)]);
          }
        }
        await insertDailyBatch(dailyRows);
        daily += dailyRows.length;

        (await insertSummary.run(
          emp.id,
          emp.summary.total_achievement,
          emp.summary.total_target,
          emp.summary.percentage,
          emp.summary.bonus_tier,
          emp.summary.unauthorized_absence,
          emp.summary.total_absence,
          emp.summary.work_nature_allowance,
          emp.summary.monthly_target,
          emp.summary.total_present_days,
          emp.summary.total_absence_days,
          emp.summary.casual_leave,
          emp.summary.leave_with_permission,
          emp.summary.leave_without_permission,
          emp.summary.sick_leave,
          emp.summary.late_days,
          emp.summary.late_hours,
          emp.summary.overtime_days,
          emp.summary.overtime_hours,
          emp.summary.special_bonus_days,
          emp.summary.special_deductions
        ));
      }
      // Match supervisor-target rows. In a multi-file import we merge blocks
      // from all files instead of deleting the rows uploaded by the previous file.
      let supervisorLinked = 0;
      let supervisorUnmatched = 0;
      const allEmployeesNow = (await db.prepare("SELECT id, name FROM employees WHERE role = 'employee'").all());
      const nameIndex = new Map();
      for (const e of allEmployeesNow) nameIndex.set(normalizeArabicName(e.name), e.id);
      if (!merge) (await deleteSupervisorTargets.run());
      for (const rec of parsed.supervisorTargets || []) {
        const empId = matchSupervisorName(rec.supervisorName, nameIndex, allEmployeesNow);
        if (empId) supervisorLinked++; else supervisorUnmatched++;
        (await insertSupervisorTarget.run(
          empId,
          rec.supervisorName,
          rec.section,
          rec.entryDate,
          rec.targetDaily,
          rec.targetMonthly,
          JSON.stringify(rec.metrics || {})
        ));
      }

      return { created, updated, daily, skipped, newCredentials, updatedEmployees, createdEmployees, supervisorLinked, supervisorUnmatched };
    });

    const result = await tx(employees);

    // For a multi-file import, status is finalized only by the combined upload;
    // individual files must never archive employees missing from one file.
    let statusActive = 0, statusLeft = 0, statusArchive = 0;
    if (!merge) {
    // Update employee status: present in Master -> 'active'; not in Master
    // but present in the "المغادرين" (leavers) sheet -> 'left'; present in
    // neither -> 'archive'. Only applies to 'employee' role accounts.
    //
    // IMPORTANT (multi-shift uploads): a single Master file only ever
    // contains the employees of ONE shift (e.g. Shift A). It must never be
    // treated as the full roster, or every employee from the other shifts
    // (B, C, ...) would look "missing" from this file and get archived.
    // So we scope the archive/active/left recomputation to employees whose
    // CURRENT shift matches one of the shift values found in this import;
    // employees on other shifts are left completely untouched.
    try {
      const allEmployeesNow2 = (await db.prepare("SELECT id, name, shift FROM employees WHERE role = 'employee'").all());
      const empIdSet = new Set(allEmployeesNow2.map(e => e.id));
      const nameIndex2 = new Map();
      for (const e of allEmployeesNow2) nameIndex2.set(normalizeArabicName(e.name), e.id);

      const leaverIds = new Set();
      for (const lv of parsed.leavers || []) {
        if (lv.id !== null && !lv.generatedId && empIdSet.has(lv.id)) { leaverIds.add(lv.id); continue; }
        const matched = matchSupervisorName(lv.name, nameIndex2, allEmployeesNow2);
        if (matched) leaverIds.add(matched);
      }

      // Shifts actually represented in this uploaded file.
      const importShifts = new Set(
        employees.map(e => e.shift).filter(Boolean)
      );

      const setStatus = db.prepare('UPDATE employees SET status = ? WHERE id = ?');
      const setStatusTx = db.transaction(async () => {
        for (const e of allEmployeesNow2) {
          let status;

          if (masterIds.has(e.id)) {
            status = 'active';
          } else if (leaverIds.has(e.id)) {
            status = 'left';
          } else if (importShifts.has(e.shift)) {
            // Belongs to a shift covered by this file but wasn't found in
            // it and isn't in the leavers sheet either -> genuinely archived.
            status = 'archive';
          } else {
            // Different shift, not covered by this file at all -> leave
            // their existing status exactly as it was.
            continue;
          }

          if (status === 'active') statusActive++;
          else if (status === 'left') statusLeft++;
          else statusArchive++;

          (await setStatus.run(status, e.id));
        }
      });
      await setStatusTx();
    } catch (e) {
      console.error('Employee status update error:', e);
    }

    }

    // New employee passwords are intentionally returned once to the admin so they can be distributed.
    res.json({
      ok: true,
      message: `تم استيراد شيت Master بنجاح: ${result.updated} موظف محدث، ${result.created} موظف جديد، ${result.daily} سجل يومي. تفاصيل تارجت الاشراف: ${result.supervisorLinked} سجل مربوط بموظف${result.supervisorUnmatched ? `، ${result.supervisorUnmatched} سجل بدون تطابق اسم` : ''}. الحالة: ${statusActive} نشط، ${statusLeft} غادر، ${statusArchive} أرشيف.`,
      ...result,
      statusActive,
      statusLeft,
      statusArchive,
    });
  } catch (err) {
    console.error('Master import error:', err);
    res.status(400).json({ error: err.message || 'فشل استيراد ملف Master.' });
  }
});

// Delete an employee (and their daily records / summary via ON DELETE CASCADE)
router.delete('/employee/:id', requireAuth, requireAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'رقم موظف غير صالح.' });

  const emp = (await db.prepare('SELECT id, role FROM employees WHERE id = ?').get(targetId));
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود.' });
  if (emp.role === 'admin') return res.status(403).json({ error: 'لا يمكن حذف حساب مدير.' });

  (await db.prepare('DELETE FROM employees WHERE id = ?').run(targetId));
  res.json({ ok: true, message: 'تم حذف الموظف بنجاح.' });
});

// Reset/change an employee's password
router.post('/employee/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'رقم موظف غير صالح.' });

  const emp = (await db.prepare('SELECT id, role FROM employees WHERE id = ?').get(targetId));
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود.' });
  if (emp.role === 'admin') return res.status(403).json({ error: 'لا يمكن تغيير كلمة مرور حساب مدير من هنا.' });

  let { newPassword } = req.body || {};
  let generated = false;
  if (!newPassword) {
    newPassword = DEFAULT_PASSWORD;
    generated = true;
  } else if (typeof newPassword !== 'string' || newPassword.length < 4) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل.' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  (await db.prepare('UPDATE employees SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hash, targetId));

  res.json({ ok: true, message: 'تم تغيير كلمة المرور بنجاح.', password: generated ? newPassword : undefined });
});

// Full employee list for the admin "Employees" management page.
// Includes every account (regular employees + supervisor accounts + full admins)
// so the full-control admin can see and change everyone's permission level.
router.get('/employees', requireAuth, requireSupervisor, async (req, res) => {
  const rows = (await db.prepare(`
    SELECT id, emp_num, name, education, residence, company, shift, department, role, must_change_password, status
    FROM employees
    ORDER BY name
  `).all());
  const total = rows.filter(r => r.role === 'employee').length;
  const primaryAdminId = await getPrimaryAdminId();

  // Mark employees who currently hold a Top 5 rank in at least one stage
  // (company-wide, across the full dataset) so the management table can
  // highlight them without opening each employee's profile.
  let top5Ids = new Set();
  try {
    const { top5ByStage } = await computeTop5ByStage(null, null, [], []);
    for (const stageRows of Object.values(top5ByStage)) {
      for (const r of stageRows) top5Ids.add(Number(r.id));
    }
  } catch (e) { /* non-fatal: table just renders without the badge */ }

  const withFlags = rows.map(r => ({
    ...r,
    is_primary_admin: primaryAdminId !== null && r.id === primaryAdminId,
    is_top5: top5Ids.has(Number(r.id)),
  }));
  res.json({ employees: withFlags, total });
});

// Change an account's permission level: 'admin' (تحكم كامل), 'supervisor'
// (يرفع فقط) or 'employee' (موظف عادي). Only a full-control admin can do this,
// and an admin cannot change their own role (avoids accidentally locking
// themselves out).
// The very first system admin (lowest employee ID among role='admin') is the
// original super admin account and must always keep full control — nobody,
// including other full-control admins, can demote or reassign their role.
async function getPrimaryAdminId() {
  const row = (await db.prepare(`SELECT id FROM employees WHERE role = 'admin' ORDER BY id ASC LIMIT 1`).get());
  return row ? row.id : null;
}

router.patch('/employee/:id/role', requireAuth, requireSupervisor, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'رقم موظف غير صالح.' });

  const { role } = req.body || {};
  const allowedRoles = ['admin', 'supervisor', 'employee'];
  if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'صلاحية غير صالحة.' });

  // Supervisors may only assign employee <-> supervisor. Only the full
  // system admin can grant or revoke the admin permission.
  if (req.user.role === 'supervisor' && role === 'admin') {
    return res.status(403).json({ error: 'المشرف لا يمكنه منح صلاحية مدير النظام.' });
  }

  if (req.user.id === targetId) {
    return res.status(400).json({ error: 'لا يمكنك تغيير صلاحيتك الخاصة.' });
  }

  const primaryAdminId = await getPrimaryAdminId();
  if (primaryAdminId !== null && targetId === primaryAdminId) {
    return res.status(403).json({ error: 'لا يمكن تغيير صلاحية مدير النظام الأساسي.' });
  }

  const target = (await db.prepare('SELECT id, role FROM employees WHERE id = ?').get(targetId));
  if (!target) return res.status(404).json({ error: 'الموظف غير موجود.' });
  if (req.user.role === 'supervisor' && target.role === 'admin') {
    return res.status(403).json({ error: 'لا يمكن للمشرف تعديل صلاحية مدير النظام.' });
  }

  (await db.prepare('UPDATE employees SET role = ? WHERE id = ?').run(role, targetId));
  res.json({ ok: true, message: 'تم تحديث الصلاحية بنجاح.', role });
});

// Company-wide overview stats for the admin dashboard
router.get('/overview', requireAuth, requireAdmin, async (req, res) => {
  const shift = req.query.shift && req.query.shift !== '__ALL__' ? String(req.query.shift) : null;
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;

  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return res.status(400).json({ error: 'صيغة تاريخ البداية غير صحيحة.' });
  }
  if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'صيغة تاريخ النهاية غير صحيحة.' });
  }
  if (from && to && from > to) {
    return res.status(400).json({ error: 'تاريخ البداية يجب أن يسبق تاريخ النهاية.' });
  }

  // The Home date filter is the single source of truth. When a period is
  // selected, KPI employee counts are limited to employees who have an
  // attendance row inside that same period. Without a date filter the KPIs
  // retain the original all-data behavior.
  const attendanceConditions = [];
  const attendanceParams = [];
  if (from) { attendanceConditions.push('sd.entry_date >= ?'); attendanceParams.push(from); }
  if (to) { attendanceConditions.push('sd.entry_date <= ?'); attendanceParams.push(to); }
  const attendanceFilter = attendanceConditions.length
    ? ` AND EXISTS (
        SELECT 1 FROM stage_daily sd
        WHERE sd.employee_id = e.id
          AND sd.stage = 'الحضور'
          AND ${attendanceConditions.join(' AND ')}
      )`
    : '';

  const count = async (extraSql = '', extraParams = []) => {
    const params = [...extraParams];
    let sql = `SELECT COUNT(*) c FROM employees e WHERE e.role = 'employee'`;
    if (shift) { sql += ' AND e.shift = ?'; params.push(shift); }
    sql += attendanceFilter;
    params.push(...attendanceParams);
    sql += extraSql;
    return (await db.prepare(sql).get(...params)).c;
  };

  const total = await count();
  const smart = await count(` AND (UPPER(e.company) LIKE '%SMART%' OR UPPER(e.company) = 'SB')`);
  const bravos = await count(` AND UPPER(e.company) LIKE '%BRAVOS%'`);
  const students = await count(` AND e.education = 'طالب'`);
  const graduates = await count(` AND e.education = 'خريج'`);

  res.json({ total, smart, bravos, students, graduates, other: Math.max(total - smart - bravos, 0) });
});;

// Reset an employee's password back to the shared company default
// ("P@ssw0rd"). Employees never choose their own password - only the admin
// can set/reset it, from this Employees management page.
router.post('/employee/:id/reset-default', requireAuth, requireAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'رقم موظف غير صالح.' });

  const emp = (await db.prepare('SELECT id, role FROM employees WHERE id = ?').get(targetId));
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود.' });
  if (emp.role === 'admin') return res.status(403).json({ error: 'لا يمكن تغيير كلمة مرور حساب مدير من هنا.' });

  const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  (await db.prepare('UPDATE employees SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hash, targetId));

  res.json({ ok: true, message: 'تم إعادة كلمة المرور إلى الافتراضية.', password: DEFAULT_PASSWORD });
});

// Update an employee's ID and/or name. Changing the ID is done inside a
// transaction with foreign-key checks briefly relaxed so related rows
// (summary, daily records, login audit) move over atomically.
router.patch('/employee/:id', requireAuth, requireAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'رقم موظف غير صالح.' });

  const emp = (await db.prepare('SELECT id, role FROM employees WHERE id = ?').get(targetId));
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود.' });
  if (emp.role === 'admin') return res.status(403).json({ error: 'لا يمكن تعديل حساب مدير من هنا.' });

  let { newId, name, company, shift, department, education, residence, emp_num } = req.body || {};
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'الاسم غير صالح.' });
  }
  if (newId !== undefined && newId !== null && newId !== '') {
    newId = Number(newId);
    if (!Number.isInteger(newId) || newId <= 0) return res.status(400).json({ error: 'الـID الجديد غير صالح.' });
  } else {
    newId = null;
  }

  if (newId !== null && newId !== targetId) {
    const clash = (await db.prepare('SELECT id FROM employees WHERE id = ?').get(newId));
    if (clash) return res.status(409).json({ error: 'هذا الـID مستخدم بالفعل لموظف آخر.' });
  }

  const extraFields = { company, shift, department, education, residence, emp_num };
  const extraKeys = Object.keys(extraFields).filter(k => extraFields[k] !== undefined);

  try {
    if (newId !== null && newId !== targetId) {
      const tx = db.transaction(async (oldId, nid, newName) => {
        (await db.prepare('UPDATE employees SET id = ? WHERE id = ?').run(nid, oldId));
        (await db.prepare('UPDATE employee_summary SET employee_id = ? WHERE employee_id = ?').run(nid, oldId));
        (await db.prepare('UPDATE stage_daily SET employee_id = ? WHERE employee_id = ?').run(nid, oldId));
        (await db.prepare('UPDATE login_audit SET employee_id = ? WHERE employee_id = ?').run(nid, oldId));
        if (newName !== undefined) (await db.prepare('UPDATE employees SET name = ? WHERE id = ?').run(newName.trim(), nid));
      });
      await tx(targetId, newId, name);
    } else if (name !== undefined) {
      (await db.prepare('UPDATE employees SET name = ? WHERE id = ?').run(name.trim(), targetId));
    }

    if (extraKeys.length) {
      const finalId = newId !== null ? newId : targetId;
      const setSql = extraKeys.map(k => `${k} = ?`).join(', ');
      const setVals = extraKeys.map(k => {
        const v = extraFields[k];
        return typeof v === 'string' ? v.trim() : v;
      });
      (await db.prepare(`UPDATE employees SET ${setSql} WHERE id = ?`).run(...setVals, finalId));
    }
  } catch (err) {
    console.error('Employee update error:', err);
    return res.status(400).json({ error: 'تعذر تحديث بيانات الموظف.' });
  }

  const updated = (await db.prepare('SELECT id, emp_num, name, education, residence, company, shift, department FROM employees WHERE id = ?').get(newId !== null ? newId : targetId));
  res.json({ ok: true, employee: updated });
});

// ---- Manual entry (data-entry screen, alternative to uploading the Master Excel sheet) ----

// Reference data for the manual-entry screen: known employees, stage names
// already used in stage_daily, and supervisor sections already used in
// supervisor_targets. Lets the UI offer dropdowns/autocomplete instead of
// free typing everything.
router.get('/manual/meta', requireAuth, requireAdmin, async (req, res) => {
  const employees = (await db.prepare("SELECT id, name, company, shift, department FROM employees WHERE role = 'employee' ORDER BY name").all());
  const stages = (await db.prepare("SELECT DISTINCT stage FROM stage_daily WHERE stage <> 'TOTAL TARGET %' ORDER BY stage").all()).map(r => r.stage);
  const sections = (await db.prepare('SELECT DISTINCT section FROM supervisor_targets ORDER BY section').all()).map(r => r.section);
  res.json({ ok: true, employees, stages, sections });
});

// Create or update an employee's basic profile by hand (equivalent of a row
// in the Master sheet's employee-info columns). If `id` matches an existing
// employee it's updated; otherwise a new employee is created with the
// default password (same behaviour as a fresh row in the Excel import).
router.post('/manual/employee', requireAuth, requireAdmin, async (req, res) => {
  let { id, emp_num, name, education, residence, company, shift, department } = req.body || {};
  id = Number(id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'رقم الموظف (ID) غير صالح.' });
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'اسم الموظف مطلوب.' });

  try {
    const existing = (await db.prepare('SELECT id, role FROM employees WHERE id = ?').get(id));
    if (existing && existing.role !== 'employee') {
      return res.status(403).json({ error: 'لا يمكن تعديل حساب أدمن من شاشة الإدخال اليدوي.' });
    }

    if (existing) {
      (await db.prepare(`
        UPDATE employees SET emp_num = ?, name = ?, education = ?, residence = ?, company = ?, shift = ?, department = ?
        WHERE id = ?
      `).run(emp_num || id, String(name).trim(), education || null, residence || null, company || null, shift || null, department || null, id));
      return res.json({ ok: true, created: false, message: 'تم تحديث بيانات الموظف.' });
    }

    const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
    (await db.prepare(`
      INSERT INTO employees (id, emp_num, name, education, residence, company, shift, department, password_hash, role, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'employee', 0)
    `).run(id, emp_num || id, String(name).trim(), education || null, residence || null, company || null, shift || null, department || null, hash));
    res.json({ ok: true, created: true, defaultPassword: DEFAULT_PASSWORD, message: 'تم إنشاء الموظف بكلمة مرور افتراضية.' });
  } catch (err) {
    console.error('Manual employee upsert error:', err);
    res.status(400).json({ error: 'تعذر حفظ بيانات الموظف. تأكد أن الـID غير مستخدم.' });
  }
});

// Upsert a single daily stage record for one employee (one cell of what the
// Master sheet's per-stage tabs would otherwise fill).
const upsertDaily = db.prepare(`
  INSERT INTO stage_daily (employee_id, stage, entry_date, value_num, value_text)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(employee_id, stage, entry_date) DO UPDATE SET
    value_num = excluded.value_num,
    value_text = excluded.value_text
`);

router.post('/manual/daily', requireAuth, requireAdmin, async (req, res) => {
  const { employee_id, stage, entry_date, value } = req.body || {};
  const empId = Number(employee_id);
  if (!Number.isInteger(empId)) return res.status(400).json({ error: 'رقم موظف غير صالح.' });
  if (!stage || !String(stage).trim()) return res.status(400).json({ error: 'اسم المرحلة (Stage) مطلوب.' });
  if (!entry_date || !/^\d{4}-\d{2}-\d{2}$/.test(entry_date)) return res.status(400).json({ error: 'التاريخ لازم يكون بصيغة YYYY-MM-DD.' });

  const emp = (await db.prepare("SELECT id FROM employees WHERE id = ? AND role = 'employee'").get(empId));
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود.' });

  const numeric = value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
  try {
    (await upsertDaily.run(empId, String(stage).trim(), entry_date, numeric ? Number(value) : null, numeric ? null : (value === '' || value === null || value === undefined ? null : String(value))));
    res.json({ ok: true });
  } catch (err) {
    console.error('Manual daily upsert error:', err);
    res.status(400).json({ error: 'تعذر حفظ السجل اليومي.' });
  }
});

// Batch version: fill a whole grid (several employees × several dates) for
// one stage in a single request — used by the spreadsheet-style entry table.
router.post('/manual/daily-batch', requireAuth, requireAdmin, async (req, res) => {
  const { stage, entries } = req.body || {};
  if (!stage || !String(stage).trim()) return res.status(400).json({ error: 'اسم المرحلة (Stage) مطلوب.' });
  if (!Array.isArray(entries) || !entries.length) return res.status(400).json({ error: 'لا يوجد بيانات لحفظها.' });

  const validEmpIds = new Set((await db.prepare("SELECT id FROM employees WHERE role = 'employee'").all()).map(e => e.id));
  const tx = db.transaction(async (rows) => {
    let saved = 0, skipped = 0;
    for (const row of rows) {
      const empId = Number(row.employee_id);
      if (!Number.isInteger(empId) || !validEmpIds.has(empId) || !row.entry_date || !/^\d{4}-\d{2}-\d{2}$/.test(row.entry_date)) { skipped++; continue; }
      const value = row.value;
      const numeric = value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
      if (value === '' || value === null || value === undefined) { skipped++; continue; }
      (await upsertDaily.run(empId, String(stage).trim(), row.entry_date, numeric ? Number(value) : null, numeric ? null : String(value)));
      saved++;
    }
    return { saved, skipped };
  });

  try {
    const result = await tx(entries);
    res.json({ ok: true, ...result, message: `تم حفظ ${result.saved} سجل${result.skipped ? `، وتخطي ${result.skipped} خانة فارغة/غير صالحة` : ''}.` });
  } catch (err) {
    console.error('Manual daily-batch upsert error:', err);
    res.status(400).json({ error: 'تعذر حفظ الجدول.' });
  }
});

// Upsert an employee's monthly summary (target/achievement/absence/leave/
// overtime block — the "emp summary" sheet in the Master workbook).
router.post('/manual/summary', requireAuth, requireAdmin, async (req, res) => {
  const b = req.body || {};
  const empId = Number(b.employee_id);
  if (!Number.isInteger(empId)) return res.status(400).json({ error: 'رقم موظف غير صالح.' });

  const emp = (await db.prepare("SELECT id FROM employees WHERE id = ? AND role = 'employee'").get(empId));
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود.' });

  const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
  try {
    (await db.prepare(`
      INSERT INTO employee_summary
      (employee_id, total_achievement, total_target, percentage, bonus_tier, unauthorized_absence, total_absence, work_nature_allowance,
       monthly_target, total_present_days, total_absence_days, casual_leave, leave_with_permission, leave_without_permission,
       sick_leave, late_days, late_hours, overtime_days, overtime_hours, special_bonus_days, special_deductions)
      VALUES (@employee_id, @total_achievement, @total_target, @percentage, @bonus_tier, @unauthorized_absence, @total_absence, @work_nature_allowance,
       @monthly_target, @total_present_days, @total_absence_days, @casual_leave, @leave_with_permission, @leave_without_permission,
       @sick_leave, @late_days, @late_hours, @overtime_days, @overtime_hours, @special_bonus_days, @special_deductions)
      ON CONFLICT(employee_id) DO UPDATE SET
        total_achievement=excluded.total_achievement, total_target=excluded.total_target, percentage=excluded.percentage,
        bonus_tier=excluded.bonus_tier, unauthorized_absence=excluded.unauthorized_absence, total_absence=excluded.total_absence,
        work_nature_allowance=excluded.work_nature_allowance, monthly_target=excluded.monthly_target,
        total_present_days=excluded.total_present_days, total_absence_days=excluded.total_absence_days, casual_leave=excluded.casual_leave,
        leave_with_permission=excluded.leave_with_permission, leave_without_permission=excluded.leave_without_permission,
        sick_leave=excluded.sick_leave, late_days=excluded.late_days, late_hours=excluded.late_hours,
        overtime_days=excluded.overtime_days, overtime_hours=excluded.overtime_hours,
        special_bonus_days=excluded.special_bonus_days, special_deductions=excluded.special_deductions
    `).run({
      employee_id: empId,
      total_achievement: num(b.total_achievement), total_target: num(b.total_target), percentage: num(b.percentage),
      bonus_tier: b.bonus_tier || null, unauthorized_absence: num(b.unauthorized_absence), total_absence: num(b.total_absence),
      work_nature_allowance: num(b.work_nature_allowance), monthly_target: num(b.monthly_target),
      total_present_days: num(b.total_present_days), total_absence_days: num(b.total_absence_days), casual_leave: num(b.casual_leave),
      leave_with_permission: num(b.leave_with_permission), leave_without_permission: num(b.leave_without_permission),
      sick_leave: num(b.sick_leave), late_days: num(b.late_days), late_hours: num(b.late_hours),
      overtime_days: num(b.overtime_days), overtime_hours: num(b.overtime_hours),
      special_bonus_days: num(b.special_bonus_days), special_deductions: num(b.special_deductions),
    }));
    res.json({ ok: true, message: 'تم حفظ الملخص الشهري.' });
  } catch (err) {
    console.error('Manual summary upsert error:', err);
    res.status(400).json({ error: 'تعذر حفظ الملخص الشهري.' });
  }
});

// Upsert a supervisor-target row (OPP A / OPP B / QC / File Trail sheets).
router.post('/manual/supervisor-target', requireAuth, requireAdmin, async (req, res) => {
  const { employee_id, supervisor_name, section, entry_date, target_daily, target_monthly, metrics } = req.body || {};
  if (!supervisor_name || !String(supervisor_name).trim()) return res.status(400).json({ error: 'اسم المشرف مطلوب.' });
  if (!section || !String(section).trim()) return res.status(400).json({ error: 'القسم (Section) مطلوب.' });
  if (!entry_date || !/^\d{4}-\d{2}-\d{2}$/.test(entry_date)) return res.status(400).json({ error: 'التاريخ لازم يكون بصيغة YYYY-MM-DD.' });

  let empId = null;
  if (employee_id !== '' && employee_id !== null && employee_id !== undefined) {
    empId = Number(employee_id);
    if (!Number.isInteger(empId) || !(await db.prepare("SELECT id FROM employees WHERE id = ? AND role = 'employee'").get(empId))) {
      return res.status(400).json({ error: 'الموظف المرتبط غير موجود.' });
    }
  }

  const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
  try {
    (await db.prepare(`
      INSERT INTO supervisor_targets (employee_id, supervisor_name, section, entry_date, target_daily, target_monthly, metrics_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(section, supervisor_name, entry_date) DO UPDATE SET
        employee_id=excluded.employee_id, target_daily=excluded.target_daily,
        target_monthly=excluded.target_monthly, metrics_json=excluded.metrics_json
    `).run(empId, String(supervisor_name).trim(), String(section).trim(), entry_date, num(target_daily), num(target_monthly), JSON.stringify(metrics || {})));
    res.json({ ok: true, message: 'تم حفظ تارجت الإشراف.' });
  } catch (err) {
    console.error('Manual supervisor-target upsert error:', err);
    res.status(400).json({ error: 'تعذر حفظ تارجت الإشراف.' });
  }
});

// ---- Reports (used by public/reports.html) ----

// Distinct stage names recorded in stage_daily, for the report stage filter.
router.get('/report/stages', requireAuth, requireAdmin, async (req, res) => {
  const rows = (await db.prepare(`SELECT DISTINCT stage FROM stage_daily WHERE stage <> 'TOTAL TARGET %' ORDER BY stage`).all());
  res.json({ stages: rows.map(r => r.stage) });
});

// Employees who have at least one daily record within [from, to] (optionally
// filtered to one stage), with their target/value summed over that range.
router.get('/report/attendance', requireAuth, requireAdmin, async (req, res) => {
  const { from, to } = req.query;
  const stages = parseList(req.query.stage);

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'حدد فترة تاريخ صالحة (من - إلى).' });
  }

  const stageSql = stages.length ? ` AND stage IN (${stages.map(()=>'?').join(',')})` : '';
  const idParams = stages.length ? [from, to, ...stages] : [from, to];
  const empIds = (await db.prepare(`
    SELECT DISTINCT employee_id FROM stage_daily
    WHERE entry_date BETWEEN ? AND ?${stageSql}
  `).all(...idParams)).map(r => r.employee_id);

  if (!empIds.length) {
    return res.json({ employees: [], total: 0, from, to, stage: stages.length ? stages : '__ALL__' });
  }

  const placeholders = empIds.map(() => '?').join(',');
  const employees = (await db.prepare(`
    SELECT id, name, company, shift, department FROM employees
    WHERE id IN (${placeholders}) AND role = 'employee'
    ORDER BY name
  `).all(...empIds));

  const targetStmt = stages.length
    ? db.prepare(`SELECT COALESCE(SUM(value_num),0) t FROM stage_daily WHERE employee_id = ? AND stage IN (${stages.map(()=>'?').join(',')}) AND entry_date BETWEEN ? AND ?`)
    : db.prepare(`SELECT COALESCE(SUM(value_num),0) t FROM stage_daily WHERE employee_id = ? AND entry_date BETWEEN ? AND ?`);

  const result = await Promise.all(employees.map(async e => ({ ...e, stage_target: stages.length ? (await targetStmt.get(e.id, ...stages, from, to)).t : (await targetStmt.get(e.id, from, to)).t })));
  res.json({ employees: result, total: result.length, from, to, stage: stages.length ? stages : '__ALL__' });
});

module.exports = router;
