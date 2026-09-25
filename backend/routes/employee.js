const express = require('express');
const db = require('../database/init');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();


function canAccess(req, targetId) {
  return (req.user.role === 'admin' || req.user.role === 'system_creator' || req.user.role === 'supervisor') || Number(req.user.id) === Number(targetId);
}

function normalizeDate(value) {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function list(value) { const a=Array.isArray(value)?value:String(value??'').split(','); return [...new Set(a.flatMap(v=>String(v).split(',')).map(v=>v.trim()).filter(v=>v&&v!=='__ALL__'))]; }
function addIn(sql, params, column, values) { if (!values.length) return sql; sql += ` AND ${column} IN (${values.map(()=>'?').join(',')})`; params.push(...values); return sql; }

// Payroll cycle containing `dateStr` (YYYY-MM-DD): 21st of a month -> 20th of the next.
function payrollCycle(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  const start = new Date(Date.UTC(day >= 21 ? y : (m === 0 ? y - 1 : y), day >= 21 ? m : (m === 0 ? 11 : m - 1), 21));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 20));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function dateFilterSql(alias, from, to, params) {
  let sql = '';
  if (from) { sql += ` AND ${alias}.entry_date >= ?`; params.push(from); }
  if (to) { sql += ` AND ${alias}.entry_date <= ?`; params.push(to); }
  return sql;
}

router.get('/list', requireAuth, async (req, res) => {
  if (req.user.role === 'admin' || req.user.role === 'system_creator') {
    const rows = (await db.prepare(`
      SELECT id, name, shift, company, department
      FROM employees WHERE role = 'employee' ORDER BY name
    `).all());
    return res.json({ employees: rows });
  }
  if (req.user.role === 'supervisor') {
    const rows = (await db.prepare(`
      SELECT id, name, shift, company, department
      FROM employees WHERE role = 'employee' AND shift = ? ORDER BY name
    `).all(String(req.user.shift || '').trim()));
    return res.json({ employees: rows });
  }
  const self = (await db.prepare(`
    SELECT id, name, shift, company, department
    FROM employees WHERE id = ? AND role = 'employee'
  `).get(req.user.id));
  res.json({ employees: self ? [self] : [] });
});

router.get('/stages', requireAuth, async (req, res) => {
  const rows = (await db.prepare(`
    SELECT DISTINCT stage
    FROM stage_daily
    WHERE stage IS NOT NULL AND TRIM(stage) <> '' AND stage <> 'TOTAL TARGET %'
    ORDER BY stage
  `).all());
  res.json({ stages: rows.map(r => r.stage) });
});

router.get('/dates', requireAuth, async (req, res) => {
  const rows = (await db.prepare(`
    SELECT DISTINCT entry_date
    FROM stage_daily
    WHERE entry_date IS NOT NULL
    ORDER BY entry_date
  `).all());
  res.json({ dates: rows.map(r => r.entry_date) });
});

router.get('/shifts', requireAuth, async (req, res) => {
  if (req.user.role === 'supervisor') return res.json({ shifts: req.user.shift ? [req.user.shift] : [] });
  const rows = (await db.prepare(`
    SELECT DISTINCT shift FROM employees
    WHERE role = 'employee' AND shift IS NOT NULL AND TRIM(shift) <> '' ORDER BY shift
  `).all());
  res.json({ shifts: rows.map(r => r.shift) });
});

/**
 * Computes Top 5 rankings per stage across ALL employees (company-wide),
 * regardless of who is asking. Callers decide how much of this to expose.
 * "الحضور" is attendance, not a performance stage, so it is excluded from Top 5.
 */
async function computeTop5ByStage(from, to, requestedStages, shifts) {
  const dailyParams = [];
  let dailyWhere = `WHERE e.role = 'employee'`;
  dailyWhere += dateFilterSql('sd', from, to, dailyParams);
  dailyWhere = addIn(dailyWhere, dailyParams, 'sd.stage', requestedStages || []);
  dailyWhere = addIn(dailyWhere, dailyParams, 'e.shift', shifts || []);
  dailyWhere += ` AND sd.stage NOT IN ('الحضور', 'TOTAL TARGET %')`;

  const stageRows = (await db.prepare(`
    SELECT sd.employee_id, e.name, e.company, e.shift, sd.stage, sd.entry_date,
           CASE WHEN sd.value_num IS NOT NULL THEN sd.value_num ELSE NULL END AS value_num
    FROM stage_daily sd
    JOIN employees e ON e.id = sd.employee_id
    ${dailyWhere}
    ORDER BY sd.stage, sd.employee_id, sd.entry_date
  `).all(...dailyParams));

  const totalsByEmployee = new Map();
  const stagesSet = new Set();
  for (const row of stageRows) {
    stagesSet.add(row.stage);
    if (!totalsByEmployee.has(row.employee_id)) {
      totalsByEmployee.set(row.employee_id, { id: row.employee_id, name: row.name, company: row.company, shift: row.shift, byStage: new Map() });
    }
    const item = totalsByEmployee.get(row.employee_id);
    const current = item.byStage.get(row.stage) || 0;
    if (typeof row.value_num === 'number' && Number.isFinite(row.value_num)) item.byStage.set(row.stage, current + row.value_num);
    else if (!item.byStage.has(row.stage)) item.byStage.set(row.stage, 0);
  }

  const top5ByStage = {};
  for (const stage of [...stagesSet].sort()) {
    const rows = [];
    for (const item of totalsByEmployee.values()) {
      if (!item.byStage.has(stage)) continue;
      rows.push({ id: item.id, name: item.name, company: item.company, shift: item.shift, stage, achieved: item.byStage.get(stage) || 0 });
    }
    rows.sort((a, b) => b.achieved - a.achieved || a.name.localeCompare(b.name, 'ar'));
    top5ByStage[stage] = rows.slice(0, 5).map((r, i) => ({ ...r, rank: i + 1 }));
  }

  return { stages: [...stagesSet].sort(), top5ByStage };
}

/** Ranks (1-5) that a given employee holds within the company-wide Top 5, per stage. */
function myTop5Ranks(top5ByStage, employeeId) {
  const ranks = [];
  for (const [stage, rows] of Object.entries(top5ByStage)) {
    const hit = rows.find(r => Number(r.id) === Number(employeeId));
    if (hit) ranks.push({ stage, rank: hit.rank });
  }
  return ranks;
}

/**
 * Admin/manager dashboard data.
 * Uses Master-imported stage_daily records as the source of truth.
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  const from = normalizeDate(req.query.from);
  const to = normalizeDate(req.query.to);
  const requestedStages = list(req.query.stage);
  const requestedShifts = list(req.query.shift);

  if (req.query.from && !from) return res.status(400).json({ error: 'صيغة تاريخ البداية غير صحيحة.' });
  if (req.query.to && !to) return res.status(400).json({ error: 'صيغة تاريخ النهاية غير صحيحة.' });
  if (from && to && from > to) return res.status(400).json({ error: 'تاريخ البداية يجب أن يسبق تاريخ النهاية.' });

  const isAdmin = req.user.role === 'admin' || req.user.role === 'system_creator';
  const isSupervisor = req.user.role === 'supervisor';
  const visibleEmployeeIds = isAdmin || isSupervisor ? null : [Number(req.user.id)];
  const baseParams = [];
  let baseWhere = `WHERE e.role = 'employee'`;
  if (visibleEmployeeIds) {
    baseWhere += ` AND e.id = ?`;
    baseParams.push(visibleEmployeeIds[0]);
  }
  if (isAdmin) baseWhere = addIn(baseWhere, baseParams, 'e.shift', requestedShifts);
  if (isSupervisor) { baseWhere += ' AND e.shift = ?'; baseParams.push(String(req.user.shift || '').trim()); }

  const employees = (await db.prepare(`SELECT e.id, e.name, e.company, e.shift, e.department FROM employees e ${baseWhere} ORDER BY e.name`).all(...baseParams));
  const employeeCount = employees.length;

  const attendanceParams = [];
  let attendanceWhere = `WHERE e.role = 'employee' AND sd.stage = 'الحضور'`;
  if (visibleEmployeeIds) { attendanceWhere += ` AND e.id = ?`; attendanceParams.push(visibleEmployeeIds[0]); }
  if (isAdmin) attendanceWhere = addIn(attendanceWhere, attendanceParams, 'e.shift', requestedShifts);
  if (isSupervisor) { attendanceWhere += ' AND e.shift = ?'; attendanceParams.push(String(req.user.shift || '').trim()); }
  attendanceWhere += dateFilterSql('sd', from, to, attendanceParams);

  const attendance = (await db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN sd.value_num IN (0.5, 1, 1.5) THEN sd.value_num ELSE 0 END), 0) AS present_days,
      COUNT(CASE WHEN sd.value_num = 0 THEN 1 END) AS absent_days,
      COUNT(*) AS attendance_entries,
      COUNT(DISTINCT CASE WHEN sd.value_num IN (0.5, 1, 1.5) THEN sd.employee_id || ':' || sd.entry_date END) AS distinct_present_days
    FROM stage_daily sd
    JOIN employees e ON e.id = sd.employee_id
    ${attendanceWhere}
  `).get(...attendanceParams));


  // Top 5 is always computed company-wide (or per selected shift) so rankings are meaningful,
  // but only admins get the full breakdown back; employees only learn their own rank(s).
  const { stages, top5ByStage } = await computeTop5ByStage(from, to, requestedStages, isAdmin ? requestedShifts : (isSupervisor ? [String(req.user.shift || '').trim()] : []));

  const presentDaysByEmployeeParams = [];
  let presentWhere = `WHERE sd.stage = 'الحضور' AND e.role = 'employee'`;
  if (visibleEmployeeIds) { presentWhere += ` AND e.id = ?`; presentDaysByEmployeeParams.push(visibleEmployeeIds[0]); }
  if (isAdmin) presentWhere = addIn(presentWhere, presentDaysByEmployeeParams, 'e.shift', requestedShifts);
  if (isSupervisor) { presentWhere += ' AND e.shift = ?'; presentDaysByEmployeeParams.push(String(req.user.shift || '').trim()); }
  presentWhere += dateFilterSql('sd', from, to, presentDaysByEmployeeParams);
  const attendanceByEmployee = (await db.prepare(`
    SELECT sd.employee_id AS id, COALESCE(SUM(CASE WHEN sd.value_num IN (0.5, 1, 1.5) THEN sd.value_num ELSE 0 END), 0) AS present_days
    FROM stage_daily sd
    JOIN employees e ON e.id = sd.employee_id
    ${presentWhere}
    GROUP BY sd.employee_id
  `).all(...presentDaysByEmployeeParams));

  const attendanceMap = Object.fromEntries(attendanceByEmployee.map(r => [r.id, Number(r.present_days || 0)]));
  const employeeCards = employees.map(e => ({ ...e, present_days: Number(attendanceMap[e.id] || 0) }));
  const selectedTop5 = requestedStages.length ? requestedStages.flatMap(stage => top5ByStage[stage] || []) : null;

  // Admin dashboard: employees with 3+ unauthorized absence marks ("ب")
  // within the selected period. The count is based on the attendance row,
  // not on the imported summary, so it always follows the active date filter.
  let unauthorizedAbsenceEmployees = [];
  if (isAdmin) {
    const absenceParams = [];
    let absenceWhere = `WHERE e.role = 'employee' AND sd.stage = 'الحضور' AND TRIM(COALESCE(sd.value_text, '')) = 'ب'`;
    absenceWhere = addIn(absenceWhere, absenceParams, 'e.shift', requestedShifts);
    absenceWhere += dateFilterSql('sd', from, to, absenceParams);
    unauthorizedAbsenceEmployees = (await db.prepare(`
      SELECT e.id, e.name, e.company, e.shift, e.department,
             COUNT(*) AS unauthorized_days,
             MIN(sd.entry_date) AS first_absence,
             MAX(sd.entry_date) AS last_absence
      FROM stage_daily sd
      JOIN employees e ON e.id = sd.employee_id
      ${absenceWhere}
      GROUP BY e.id, e.name, e.company, e.shift, e.department
      HAVING COUNT(*) >= 3
      ORDER BY unauthorized_days DESC, e.name ASC
    `).all(...absenceParams)).map(r => ({
      ...r,
      unauthorized_days: Number(r.unauthorized_days || 0)
    }));
  }

  const payload = {
    range: { from, to },
    employee_count: employeeCount,
    attendance: {
      present_days: Number(attendance.present_days || 0),
      absent_days: Number(attendance.absent_days || 0),
      attendance_entries: Number(attendance.attendance_entries || 0),
      distinct_present_days: Number(attendance.distinct_present_days || 0),
    },
    stages,
    employees: employeeCards,
  };

  if (isAdmin) {
    payload.top5ByStage = top5ByStage;
    payload.selectedTop5 = selectedTop5;
    payload.unauthorizedAbsenceEmployees = unauthorizedAbsenceEmployees;
  } else {
    payload.myRanks = myTop5Ranks(top5ByStage, req.user.id);
  }

  res.json(payload);
});

router.get('/months', requireAuth, async (req, res) => {
  const rows = await db.prepare(`SELECT DISTINCT month_start FROM employee_monthly_summary ORDER BY month_start DESC`).all();
  res.json({ months: rows.map(r => String(r.month_start).slice(0, 7)) });
});

router.get('/:id', requireAuth, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!canAccess(req, targetId)) {
    return res.status(403).json({ error: 'غير مصرح لك برؤية بيانات موظف آخر' });
  }

  const emp = (await db.prepare(`
    SELECT id, emp_num, name, education, residence, company, shift, target_shift, department
    FROM employees WHERE id = ? AND role = 'employee'
  `).get(targetId));
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });
  if (req.user.role === 'supervisor' && String(emp.shift || '') !== String(req.user.shift || '')) return res.status(403).json({ error: 'يمكن للمشرف عرض موظفي الشيفت الخاص به فقط.' });

  let { from, to, stage, month } = req.query;

  // Data from every uploaded month lives in stage_daily. With no period given,
  // this route used to sum ALL months together, so each new upload made the
  // employee's totals grow. Default to the latest payroll cycle (21st -> 20th)
  // that this employee actually has data for; an explicit from/to/month still wins.
  const hasMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ''));
  if (!from && !to && !hasMonth) {
    const lastRow = await db.prepare('SELECT MAX(entry_date) AS d FROM stage_daily WHERE employee_id = ?').get(targetId);
    const last = lastRow && lastRow.d ? String(lastRow.d).slice(0, 10) : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(last)) {
      const c = payrollCycle(last);
      from = c.start; to = c.end; month = c.start.slice(0, 7);
    }
  }
  const summaryFields = `total_achievement, total_target, percentage, bonus_tier,
           unauthorized_absence, total_absence, work_nature_allowance,
           monthly_target, total_present_days, total_absence_days,
           casual_leave, leave_with_permission, leave_without_permission,
           sick_leave, late_days, late_hours, overtime_days, overtime_hours,
           special_bonus_days, special_deductions`;
  let summary = {};
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ''))) {
    // month_start is stored as the cycle start (YYYY-MM-21), so match anywhere in
    // that calendar month. The old `= YYYY-MM-01` comparison never matched.
    const monthFirst = `${month}-01`;
    const nextFirst = new Date(`${monthFirst}T00:00:00Z`);
    nextFirst.setUTCMonth(nextFirst.getUTCMonth() + 1);
    summary = (await db.prepare(`SELECT ${summaryFields} FROM employee_monthly_summary WHERE employee_id = ? AND month_start >= ? AND month_start < ? ORDER BY month_start DESC LIMIT 1`).get(targetId, monthFirst, nextFirst.toISOString().slice(0, 10))) || {};
  }
  if (!Object.keys(summary).length) {
    summary = (await db.prepare(`SELECT ${summaryFields} FROM employee_summary WHERE employee_id = ?`).get(targetId)) || {};
  }
  let sql = 'SELECT stage, entry_date, value_num, value_text FROM stage_daily WHERE employee_id = ?';
  const params = [targetId];
  if (from) { sql += ' AND entry_date >= ?'; params.push(from); }
  if (to) { sql += ' AND entry_date <= ?'; params.push(to); }
  if (stage && stage !== '__ALL__') { sql += ' AND stage = ?'; params.push(stage); }
  sql += ' ORDER BY stage, entry_date';

  const daily = (await db.prepare(sql).all(...params));
  const byStage = {};
  for (const row of daily) {
    if (!byStage[row.stage]) byStage[row.stage] = [];
    byStage[row.stage].push({ date: row.entry_date, value: row.value_num !== null ? row.value_num : row.value_text });
  }

  const attendanceParams = [targetId];
  let attendanceSql = `SELECT
      COALESCE(SUM(CASE WHEN value_num IN (0.5, 1, 1.5) THEN value_num ELSE 0 END), 0) AS present_days,
      COUNT(CASE WHEN value_num = 0 THEN 1 END) AS casual_leave,
      COUNT(CASE WHEN TRIM(COALESCE(value_text,'')) = 'ا' THEN 1 END) AS leave_with_permission,
      COUNT(CASE WHEN TRIM(COALESCE(value_text,'')) = 'ب' THEN 1 END) AS leave_without_permission,
      COUNT(CASE WHEN TRIM(COALESCE(value_text,'')) = 'م' THEN 1 END) AS sick_leave
    FROM stage_daily WHERE employee_id = ? AND stage = 'الحضور'`;
  if (from) { attendanceSql += ' AND entry_date >= ?'; attendanceParams.push(from); }
  if (to) { attendanceSql += ' AND entry_date <= ?'; attendanceParams.push(to); }
  const attendance = (await db.prepare(attendanceSql).get(...attendanceParams)) || { present_days: 0, casual_leave: 0, leave_with_permission: 0, leave_without_permission: 0, sick_leave: 0 };
  attendance.casual_leave = Number(attendance.casual_leave || 0);
  attendance.leave_with_permission = Number(attendance.leave_with_permission || 0);
  attendance.leave_without_permission = Number(attendance.leave_without_permission || 0);
  attendance.sick_leave = Number(attendance.sick_leave || 0);
  attendance.absent_days = attendance.casual_leave + attendance.leave_with_permission + attendance.leave_without_permission + attendance.sick_leave;

  // Attendance/leave counts are derived from the daily attendance codes for the selected period.
  // Keep all non-attendance EmployeeSummary fields untouched; attendance is sourced from stage_daily.
  summary.total_present_days = attendance.present_days;
  summary.total_absence_days = attendance.absent_days;
  summary.total_absence = attendance.absent_days;
  summary.casual_leave = attendance.casual_leave;
  summary.leave_with_permission = attendance.leave_with_permission;
  summary.leave_without_permission = attendance.leave_without_permission;
  summary.sick_leave = attendance.sick_leave;

  const { top5ByStage } = await computeTop5ByStage(normalizeDate(from), normalizeDate(to), null);
  const myRanks = myTop5Ranks(top5ByStage, targetId);

  const supervisorTargets = await getSupervisorTargetDetails(targetId, emp.name, from, to);
  let stageTargets = await getStageTargets(
    targetId,
    emp.target_shift || emp.shift,
    from,
    to,
    month
  );

  // Safety net for employees imported before employee_stage_targets existed,
  // or for an import where the target table was created but a target could not
  // be read yet. The importer stores the complete stage snapshot in
  // employee_shift_profiles, so the employee page can still display the exact
  // target that came from the workbook. DB rows always win, which means a later
  // import automatically replaces an old target.
  {
    const fallbackProfile = await db.prepare(
      `SELECT profile_json FROM employee_shift_profiles WHERE employee_id = ? AND shift = ?`
    ).get(targetId, String(emp.target_shift || emp.shift || 'Other').trim() || 'Other');
    const stages = fallbackProfile?.profile_json?.stages || [];
    for (const stage of stages) {
      const value = Number(stage?.monthlyTarget);
      if (!stage?.role || stage.role === 'الحضور') continue;
      // Keep the database snapshot as the source of truth when it exists;
      // only fill gaps from the imported profile snapshot.
      if (stageTargets[stage.role] === undefined && Number.isFinite(value) && value > 0) {
        stageTargets[stage.role] = value;
      }
    }
  }

  // Return every shift snapshot for this employee. The canonical employee
  // profile/KPIs still come from employees + employee_summary, while duplicate
  // shifts get their own daily details in the employee view.
  const shiftProfilesRows = await db.prepare(
    `SELECT shift, profile_json
       FROM employee_shift_profiles
      WHERE employee_id = ?
      ORDER BY CASE shift WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 WHEN 'D' THEN 4 ELSE 5 END, shift`
  ).all(targetId);
  const shiftProfiles = shiftProfilesRows.map(r => {
    const profile = r.profile_json || {};
    return {
      shift: r.shift,
      stages: profile.stages || [],
      summary: profile.summary || {},
      employee: {
        id: profile.id ?? targetId,
        emp_num: profile.emp_num ?? emp.emp_num,
        name: profile.name ?? emp.name,
        education: profile.education ?? emp.education,
        residence: profile.residence ?? emp.residence,
        company: profile.company ?? emp.company,
        shift: r.shift,
        department: profile.department ?? emp.department,
      }
    };
  });

  res.json({
    employee: emp,
    summary,
    attendance: { present_days: Number(attendance.present_days || 0), absent_days: Number(attendance.absent_days || 0) },
    stages: byStage,
    stageTargets,
    shiftProfiles,
    myRanks,
    supervisorTargets,
  });
});

async function getStageTargets(employeeId, shift, from, to, month) {
  const params = [employeeId, String(shift || 'Other').trim() || 'Other'];
  let sql = `
    SELECT stage, target_monthly, month_start, source_formula
    FROM employee_stage_targets
    WHERE employee_id = ? AND shift = ?`;

  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ''))) {
    const monthStart = `${month}-01`;
    const next = new Date(`${monthStart}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    sql += ' AND month_start >= ? AND month_start < ?';
    params.push(monthStart, next.toISOString().slice(0, 10));
  } else if (normalizeDate(to)) {
    // A payroll cycle starts on the 21st. Selecting the latest target snapshot
    // not after the requested end date keeps date-filtered details aligned
    // without discarding a cycle that started before `from`.
    sql += ' AND month_start <= ?';
    params.push(to);
  }

  sql += ' ORDER BY month_start DESC, updated_at DESC, stage';
  const rows = await db.prepare(sql).all(...params);
  const targets = {};
  for (const row of rows) {
    if (targets[row.stage] !== undefined) continue;
    const value = Number(row.target_monthly);
    if (Number.isFinite(value) && value > 0) targets[row.stage] = value;
  }
  return targets;
}

/**
 * "تفاصيل تارجت الاشراف" — daily supervisor-target rows for this employee
 * from the OPP A / OPP B / QC / File Trail sheets. Rows are linked to the
 * employee by id when the import matched the name, but we also match on the
 * employee's current name directly (loose match) so this section shows up
 * for anyone whose name appears in those sheets, regardless of their role.
 */
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

async function getSupervisorTargetDetails(employeeId, employeeName, from, to) {
  const params = [employeeId];
  let sql = 'SELECT supervisor_name, section, entry_date, target_daily, target_monthly, metrics_json FROM supervisor_targets WHERE employee_id = ?';
  if (from) { sql += ' AND entry_date >= ?'; params.push(from); }
  if (to) { sql += ' AND entry_date <= ?'; params.push(to); }
  let rows = (await db.prepare(sql).all(...params));

  // Fallback: also pick up rows that weren't linked to an employee_id at
  // import time, using loose (then token-containment) name matching against
  // this employee's current name.
  if (employeeName) {
    const normalizedTarget = normalizeArabicName(employeeName);
    const targetTokens = new Set(normalizedTarget.split(' ').filter(Boolean));
    const unlinkedParams = [];
    let unlinkedSql = 'SELECT supervisor_name, section, entry_date, target_daily, target_monthly, metrics_json FROM supervisor_targets WHERE employee_id IS NULL';
    if (from) { unlinkedSql += ' AND entry_date >= ?'; unlinkedParams.push(from); }
    if (to) { unlinkedSql += ' AND entry_date <= ?'; unlinkedParams.push(to); }
    const unlinked = (await db.prepare(unlinkedSql).all(...unlinkedParams))
      .filter(r => {
        const normalized = normalizeArabicName(r.supervisor_name);
        if (normalized === normalizedTarget) return true;
        const tokens = normalized.split(' ').filter(Boolean);
        return tokens.length > 0 && tokens.every(t => targetTokens.has(t));
      });
    rows = rows.concat(unlinked);
  }

  const bySection = {};
  for (const row of rows) {
    if (!bySection[row.section]) bySection[row.section] = [];
    bySection[row.section].push({
      date: row.entry_date,
      targetDaily: row.target_daily,
      targetMonthly: row.target_monthly,
      metrics: row.metrics_json ? JSON.parse(row.metrics_json) : {},
    });
  }
  for (const section of Object.keys(bySection)) {
    bySection[section].sort((a, b) => a.date.localeCompare(b.date));
  }
  return bySection;
}

module.exports = router;
module.exports.computeTop5ByStage = computeTop5ByStage;
module.exports.myTop5Ranks = myTop5Ranks;
