const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/init');
const { requireAuth, requireAdmin, requireSupervisor, requireUploader, requireSystemCreator, isCreator } = require('../middleware/auth');
const { parseMasterWorkbook } = require('../utils/master-import');
const { computeTop5ByStage } = require('./employee');

const router = express.Router();
function parseList(v){const a=Array.isArray(v)?v:String(v??'').split(',');return [...new Set(a.flatMap(x=>String(x).split(',')).map(x=>x.trim()).filter(x=>x&&x!=='__ALL__'))];}

const DEFAULT_PASSWORD = 'P@ssw0rd';

async function writeAudit(req, action, entityType = null, entityId = null, details = {}) {
  try {
    await db.prepare(`INSERT INTO audit_logs
      (actor_id, actor_name, action, entity_type, entity_id, details_json, ip)
      VALUES (?, ?, ?, ?, ?, ?::jsonb, ?)`)
      .run(Number(req.user?.id) || null, req.user?.name || null, action, entityType, entityId == null ? null : String(entityId), JSON.stringify(details || {}), req.ip || null);
  } catch (e) { console.error('Audit log write failed:', e); }
}

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

    // Payroll cycle is determined automatically from the Master dates: 21st
    // through the 20th of the following month. Store the cycle start date.
    const importedDates = [];
    for (const emp of employees) {
      for (const stage of (emp.stages || [])) {
        for (const date of Object.keys(stage.daily || {})) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) importedDates.push(date);
        }
      }
    }
    if (!importedDates.length) {
      return res.status(400).json({ error: 'لم يتم العثور على تواريخ يومية داخل ملف الـ Master.' });
    }
    const uniqueCycles = new Set(importedDates.map(date => {
      const d = new Date(`${date}T00:00:00Z`);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const day = d.getUTCDate();
      const cycleYear = day >= 21 ? y : (m === 0 ? y - 1 : y);
      const cycleMonth = day >= 21 ? m : (m === 0 ? 11 : m - 1);
      return `${cycleYear}-${String(cycleMonth + 1).padStart(2, '0')}-21`;
    }));
    if (uniqueCycles.size > 1) {
      return res.status(400).json({ error: 'ملف الـ Master يحتوي على تواريخ تنتمي لأكثر من دورة. يجب أن تكون كل التواريخ داخل دورة واحدة من 21 إلى 20.' });
    }
    const monthStart = [...uniqueCycles][0];

    // Bulk-insert/update helper: splits `rows` into chunks and issues ONE
    // round-trip per chunk via `unnest(...)` instead of one round-trip per row.
    // This is the difference between ~30,000 sequential DB calls (which is
    // what made big sheets time out / hang the site) and a handful of calls.
    const CHUNK = 2000;
    function chunks(arr, size) {
      const out = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    }

    const masterIds = new Set();

    const tx = db.transaction(async (rows) => {
      let created = 0;
      let updated = 0;
      let daily = 0;
      let stageTargets = 0;
      let skipped = 0;
      const newCredentials = [];
      const updatedEmployees = [];
      const createdEmployees = [];

      // 1) Resolve every row against the current employees table in ONE query
      // instead of one SELECT per row.
      const allEmployeesForLookup = await db.prepare('SELECT id, name, role, shift, target_shift FROM employees').all();
      const byId = new Map(allEmployeesForLookup.map(e => [e.id, e]));
      // Rows without an ID are matched by name. Names differ slightly from month
      // to month (double spaces, أ/ا, ى/ي, diacritics), and a miss here made an
      // employee who already exists look "new" and get re-inserted.
      const nameKey = v => String(v || '')
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      const byName = new Map();
      for (const e of allEmployeesForLookup) if (!byName.has(nameKey(e.name))) byName.set(nameKey(e.name), e);

      let nextGeneratedId = Math.max(900000, ...allEmployeesForLookup.map(e => Number(e.id) || 0)) + 1;
      const toInsert = []; // {id, emp_num, name, education, residence, company, shift, target_shift, department, hash}
      const toUpdate = []; // {id, emp_num, name, education, residence, company, shift, target_shift, department}
      const validRows = []; // rows that will get daily/summary data written
      const promotedFromOther = new Set();
      const shiftProfilesToUpsert = [];
      const PRIMARY_SHIFTS = new Set(['A', 'B', 'C', 'D']);
      const shiftRank = { A: 1, B: 2, C: 3, D: 4 };
      const canonicalShift = value => {
        const v = String(value || '').trim().toUpperCase();
        return PRIMARY_SHIFTS.has(v) ? v : 'Other';
      };

      for (const emp of rows) {
        if (!emp.id || emp.id === 0 || !emp.name) { skipped++; continue; }

        const existing = emp.generatedId ? byName.get(nameKey(emp.name)) : byId.get(emp.id);
        if (existing && emp.generatedId) emp.id = existing.id;
        // Rows without a real ID get a temporary ID (900000+). That temp ID can
        // already belong to a different employee created by an earlier import,
        // which made the INSERT below fail with employees_pkey. Move to the next
        // free ID instead.
        if (!existing && emp.generatedId) {
          while (byId.has(emp.id)) emp.id = nextGeneratedId++;
        }
        if (existing && existing.role !== 'employee') { skipped++; continue; }

        const incomingShift = canonicalShift(emp.shift);
        // Keep a complete copy for every shift. This is what allows an employee
        // such as Michael to have both Shift Other and Shift B details without
        // collapsing one shift into the other in stage_daily/employee_summary.
        const resolvedEmployeeId = existing && emp.generatedId ? existing.id : emp.id;
        shiftProfilesToUpsert.push({ employeeId: resolvedEmployeeId, shift: incomingShift, profile: emp });
        const existingTarget = existing ? canonicalShift(existing.target_shift || existing.shift) : null;
        let targetShift = existingTarget || incomingShift;
        let useRow = true;
        let profileShift = incomingShift;

        if (existing && incomingShift === 'Other' && PRIMARY_SHIFTS.has(existingTarget)) {
          // Other is only a secondary copy. Never let it replace the employee's
          // real A/B/C/D shift, profile data, KPIs, or daily records.
          useRow = false;
          targetShift = existingTarget;
          skipped++;
        } else if (incomingShift !== 'Other' && PRIMARY_SHIFTS.has(incomingShift)) {
          if (!existing) {
            targetShift = incomingShift;
          } else if (!PRIMARY_SHIFTS.has(existingTarget)) {
            targetShift = incomingShift;
            promotedFromOther.add(emp.id);
          } else if (incomingShift !== existingTarget) {
            // If the same employee is present in two primary shifts, keep the
            // deterministic highest-priority primary shift: A > B > C > D.
            if (shiftRank[incomingShift] < shiftRank[existingTarget]) {
              targetShift = incomingShift;
              promotedFromOther.add(emp.id);
            } else {
              useRow = false;
              targetShift = existingTarget;
              skipped++;
            }
          }
          profileShift = targetShift;
        } else {
          targetShift = existing ? existingTarget : 'Other';
          profileShift = targetShift;
        }

        if (!useRow) {
          if (existing) masterIds.add(existing.id);
          continue;
        }

        emp.shift = profileShift;
        emp.target_shift = targetShift;
        masterIds.add(emp.id);
        validRows.push(emp);

        if (!existing) {
          const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
          toInsert.push({ id: emp.id, emp_num: emp.emp_num || emp.id, name: emp.name, education: emp.education, residence: emp.residence, company: emp.company, shift: profileShift, target_shift: targetShift, department: emp.department, hash });
          // Register the new employee right away. Otherwise a second row for the
          // same ID/name in the same file (another tab, another shift) is also
          // seen as "not existing" and queued for insert -> duplicate key.
          const queued = { id: emp.id, name: emp.name, role: 'employee', shift: profileShift, target_shift: targetShift };
          byId.set(emp.id, queued);
          if (!byName.has(nameKey(emp.name))) byName.set(nameKey(emp.name), queued);
          created++;
          createdEmployees.push({ id: emp.id, name: emp.name });
          newCredentials.push({ id: emp.id, name: emp.name, password: DEFAULT_PASSWORD });
        } else {
          toUpdate.push({ id: emp.id, emp_num: emp.emp_num || emp.id, name: emp.name, education: emp.education, residence: emp.residence, company: emp.company, shift: profileShift, target_shift: targetShift, department: emp.department });
          updated++;
          updatedEmployees.push({ id: emp.id, name: emp.name });
        }
      }

      // When an employee is promoted from Other to a real A/B/C/D shift, remove
      // the secondary copy before writing the primary data. This prevents old
      // Other rows from surviving a later primary-shift import.
      if (promotedFromOther.size) {
        await db.query('DELETE FROM stage_daily WHERE employee_id = ANY($1::int[])', [[...promotedFromOther]]);
        await db.query('DELETE FROM employee_summary WHERE employee_id = ANY($1::int[])', [[...promotedFromOther]]);
      }

      // 2) Bulk insert new employees.
      for (const batch of chunks(toInsert, CHUNK)) {
        if (!batch.length) continue;
        await db.query(
          `INSERT INTO employees (id, emp_num, name, education, residence, company, shift, target_shift, department, password_hash, role, must_change_password)
           SELECT id, emp_num, name, education, residence, company, shift, target_shift, department, password_hash, 'employee', false
           FROM unnest($1::int[], $2::int[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::text[])
             AS t(id, emp_num, name, education, residence, company, shift, target_shift, department, password_hash)
           ON CONFLICT (id) DO UPDATE SET
             emp_num = EXCLUDED.emp_num, name = EXCLUDED.name, education = EXCLUDED.education,
             residence = EXCLUDED.residence, company = EXCLUDED.company, shift = EXCLUDED.shift,
             target_shift = EXCLUDED.target_shift, department = EXCLUDED.department
           WHERE employees.role = 'employee'`,
          [
            batch.map(e => e.id), batch.map(e => Number(e.emp_num)), batch.map(e => e.name), batch.map(e => e.education),
            batch.map(e => e.residence), batch.map(e => e.company), batch.map(e => e.shift), batch.map(e => e.target_shift), batch.map(e => e.department),
            batch.map(e => e.hash),
          ]
        );
      }

      // 3) Bulk update existing employees.
      for (const batch of chunks(toUpdate, CHUNK)) {
        if (!batch.length) continue;
        await db.query(
          `UPDATE employees AS e SET emp_num = t.emp_num, name = t.name, education = t.education, residence = t.residence,
             company = t.company, shift = t.shift, target_shift = t.target_shift, department = t.department
           FROM unnest($1::int[], $2::int[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[])
             AS t(id, emp_num, name, education, residence, company, shift, target_shift, department)
           WHERE e.id = t.id AND e.role = 'employee'`,
          [
            batch.map(e => e.id), batch.map(e => Number(e.emp_num)), batch.map(e => e.name), batch.map(e => e.education),
            batch.map(e => e.residence), batch.map(e => e.company), batch.map(e => e.shift), batch.map(e => e.target_shift), batch.map(e => e.department),
          ]
        );
      }

      // Preserve every incoming shift snapshot after the canonical employee
      // rows exist (important for newly created employees because of the FK).
      for (const batch of chunks(shiftProfilesToUpsert, CHUNK)) {
        if (!batch.length) continue;
        await db.query(
          `INSERT INTO employee_shift_profiles (employee_id, shift, profile_json, updated_at)
           SELECT employee_id, shift, profile_json::jsonb, CURRENT_TIMESTAMP
           FROM unnest($1::int[], $2::text[], $3::text[])
             AS t(employee_id, shift, profile_json)
           ON CONFLICT (employee_id, shift) DO UPDATE SET profile_json = EXCLUDED.profile_json, updated_at = CURRENT_TIMESTAMP`,
          [batch.map(x => x.employeeId), batch.map(x => x.shift), batch.map(x => JSON.stringify(x.profile))]
        );
      }

      // Persist the monthly target encoded in each stage's Master!AO formula.
      // Targets are keyed by employee, shift, and payroll cycle so a later
      // import can change them without rewriting historical months.
      const stageTargetMap = new Map();
      for (const profileRow of shiftProfilesToUpsert) {
        for (const stage of profileRow.profile?.stages || []) {
          const target = Number(stage.monthlyTarget);
          if (!stage.role || stage.role === 'الحضور' || !Number.isFinite(target) || target <= 0) continue;
          const key = `${profileRow.employeeId}|${profileRow.shift}|${stage.role}`;
          stageTargetMap.set(key, {
            employeeId: profileRow.employeeId,
            shift: profileRow.shift,
            stage: stage.role,
            target,
            sourceFormula: stage.monthlyTargetFormula || null,
          });
        }
      }
      const stageTargetRows = [...stageTargetMap.values()];
      const targetEmployeeIds = [...new Set(shiftProfilesToUpsert.map(x => x.employeeId))];
      const targetShifts = [...new Set(shiftProfilesToUpsert.map(x => x.shift))];
      if (targetEmployeeIds.length && targetShifts.length) {
        // If a formula disappears from a re-import, remove the old value for
        // that cycle instead of silently showing a stale target.
        await db.query(
          `DELETE FROM employee_stage_targets
           WHERE employee_id = ANY($1::int[]) AND month_start = $2::date
             AND shift = ANY($3::text[])`,
          [targetEmployeeIds, monthStart, targetShifts]
        );
      }
      for (const batch of chunks(stageTargetRows, CHUNK)) {
        if (!batch.length) continue;
        await db.query(
          `INSERT INTO employee_stage_targets
             (employee_id, shift, month_start, stage, target_monthly, source_formula)
           SELECT employee_id, shift, month_start, stage, target_monthly, source_formula
           FROM unnest($1::int[], $2::text[], $3::date[], $4::text[], $5::float8[], $6::text[])
             AS t(employee_id, shift, month_start, stage, target_monthly, source_formula)
           ON CONFLICT (employee_id, shift, month_start, stage) DO UPDATE SET
             target_monthly = excluded.target_monthly,
             source_formula = excluded.source_formula,
             updated_at = CURRENT_TIMESTAMP`,
          [
            batch.map(x => x.employeeId),
            batch.map(x => x.shift),
            batch.map(() => monthStart),
            batch.map(x => x.stage),
            batch.map(x => x.target),
            batch.map(x => x.sourceFormula),
          ]
        );
        stageTargets += batch.length;
      }

      // 4) For a normal Master re-import, replace ONLY the imported payroll
      // cycle's daily rows. Never delete older cycles (21->20 history).
      if (!merge && validRows.length) {
        const cycleEnd = new Date(`${monthStart}T00:00:00Z`);
        cycleEnd.setUTCMonth(cycleEnd.getUTCMonth() + 1);
        cycleEnd.setUTCDate(cycleEnd.getUTCDate() - 1); // 20th of next month
        const cycleEndIso = cycleEnd.toISOString().slice(0, 10);
        await db.query(
          'DELETE FROM stage_daily WHERE employee_id = ANY($1::int[]) AND entry_date BETWEEN $2::date AND $3::date',
          [validRows.map(e => e.id), monthStart, cycleEndIso]
        );
      }

      // 5) Flatten every employee/stage/date cell into flat arrays and bulk
      // upsert them. This is the big win: a sheet with, say, 300 employees x
      // 6 stages x 30 days is ~54,000 cells — previously 54,000 awaited round
      // trips, now a handful of chunked bulk statements.
      const dEmp = [], dStage = [], dDate = [], dNum = [], dText = [];
      for (const emp of validRows) {
        for (const stage of emp.stages) {
          for (const [date, value] of Object.entries(stage.daily)) {
            const numeric = typeof value === 'number' && Number.isFinite(value);
            dEmp.push(emp.id); dStage.push(stage.role); dDate.push(date);
            dNum.push(numeric ? value : null);
            dText.push(numeric ? null : String(value));
            daily++;
          }
        }
      }
      for (let i = 0; i < dEmp.length; i += CHUNK) {
        const end = Math.min(i + CHUNK, dEmp.length);
        await db.query(
          `INSERT INTO stage_daily (employee_id, stage, entry_date, value_num, value_text)
           SELECT * FROM unnest($1::int[], $2::text[], $3::date[], $4::float8[], $5::text[])
           ON CONFLICT (employee_id, stage, entry_date) DO UPDATE SET
             value_num = excluded.value_num, value_text = excluded.value_text`,
          [dEmp.slice(i, end), dStage.slice(i, end), dDate.slice(i, end), dNum.slice(i, end), dText.slice(i, end)]
        );
      }

      // 6) Bulk upsert summaries.
      // Excel cells can contain placeholder text ("-", "N/A", empty dashes...)
      // in numeric columns; unnest() needs a clean float8[], so coerce here
      // instead of sending raw cell text straight to a DOUBLE PRECISION column.
      function toSummaryNumber(value) {
        if (value === null || value === undefined || value === '') return null;
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        const text = String(value).trim()
          .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
          .replace(/٫/g, '.')
          .replace(/,/g, '.');
        const n = Number(text);
        return Number.isFinite(n) ? n : null;
      }
      const sCols = ['total_achievement', 'total_target', 'percentage', 'bonus_tier', 'unauthorized_absence', 'total_absence',
        'work_nature_allowance', 'monthly_target', 'total_present_days', 'total_absence_days', 'casual_leave',
        'leave_with_permission', 'leave_without_permission', 'sick_leave', 'late_days', 'late_hours', 'overtime_days',
        'overtime_hours', 'special_bonus_days', 'special_deductions'];
      for (const batch of chunks(validRows, CHUNK)) {
        if (!batch.length) continue;
        // bonus_tier is a TEXT column; every other column is DOUBLE PRECISION.
        const arrs = [batch.map(e => e.id), ...sCols.map(c => c === 'bonus_tier'
          ? batch.map(e => (e.summary[c] === null || e.summary[c] === undefined || e.summary[c] === '') ? null : String(e.summary[c]))
          : batch.map(e => toSummaryNumber(e.summary[c])))];
        const unnestTypes = ['int', ...sCols.map(c => c === 'bonus_tier' ? 'text' : 'float8')];
        const unnestSql = arrs.map((_, i) => `$${i + 1}::${unnestTypes[i]}[]`).join(', ');
        await db.query(
          `INSERT INTO employee_summary (employee_id, ${sCols.join(', ')})
           SELECT * FROM unnest(${unnestSql}) AS t(employee_id, ${sCols.join(', ')})
           ON CONFLICT (employee_id) DO UPDATE SET
             ${sCols.map(c => `${c} = excluded.${c}`).join(', ')}`,
          arrs
        );
      }


      // 7) Preserve the Employee Summary as a monthly snapshot. The legacy
      // employee_summary table remains the latest/current snapshot for older
      // screens, while this table keeps every imported month separately.
      for (const batch of chunks(validRows, CHUNK)) {
        if (!batch.length) continue;
        const arrs = [batch.map(e => e.id), ...sCols.map(c => c === 'bonus_tier'
          ? batch.map(e => (e.summary[c] === null || e.summary[c] === undefined || e.summary[c] === '') ? null : String(e.summary[c]))
          : batch.map(e => toSummaryNumber(e.summary[c])) )];
        const unnestTypes = ['int', ...sCols.map(c => c === 'bonus_tier' ? 'text' : 'float8')];
        const unnestSql = arrs.map((_, i) => `$${i + 1}::${unnestTypes[i]}[]`).join(', ');
        await db.query(
          `INSERT INTO employee_monthly_summary (employee_id, month_start, ${sCols.join(', ')})
           SELECT employee_id, $${arrs.length + 1}::date, ${sCols.join(', ')}
           FROM unnest(${unnestSql}) AS t(employee_id, ${sCols.join(', ')})
           ON CONFLICT (employee_id, month_start) DO UPDATE SET
             ${sCols.map(c => `${c} = excluded.${c}`).join(', ')}, updated_at = CURRENT_TIMESTAMP`,
          [...arrs, monthStart]
        );
      }

      // Match supervisor-target rows. We always merge blocks across files
      // instead of deleting the month's existing rows first: whether the
      // shift sheets (Shift A, Shift C, ...) are uploaded together in one
      // batch or one at a time in separate uploads, each file's rows must
      // only add/update its own (section, supervisor_name, entry_date)
      // records, never wipe out rows a previous, separate upload already
      // stored for this month. The upsert below (ON CONFLICT ... DO UPDATE)
      // already handles corrections to a single row, so no blanket DELETE
      // is needed here.
      let supervisorLinked = 0;
      let supervisorUnmatched = 0;
      const allEmployeesNow = await db.prepare("SELECT id, name FROM employees WHERE role = 'employee'").all();
      const nameIndex = new Map();
      for (const e of allEmployeesNow) nameIndex.set(normalizeArabicName(e.name), e.id);

      const supervisorRecs = parsed.supervisorTargets || [];
      const tEmp = [], tName = [], tSection = [], tDate = [], tDaily = [], tMonthly = [], tMetrics = [];
      for (const rec of supervisorRecs) {
        const empId = matchSupervisorName(rec.supervisorName, nameIndex, allEmployeesNow);
        if (empId) supervisorLinked++; else supervisorUnmatched++;
        tEmp.push(empId); tName.push(rec.supervisorName); tSection.push(rec.section); tDate.push(rec.entryDate);
        tDaily.push(rec.targetDaily); tMonthly.push(rec.targetMonthly); tMetrics.push(JSON.stringify(rec.metrics || {}));
      }
      for (let i = 0; i < tEmp.length; i += CHUNK) {
        const end = Math.min(i + CHUNK, tEmp.length);
        await db.query(
          `INSERT INTO supervisor_targets (employee_id, supervisor_name, section, entry_date, target_daily, target_monthly, metrics_json)
           SELECT employee_id, supervisor_name, section, entry_date, target_daily, target_monthly, metrics_json::jsonb
           FROM unnest($1::int[], $2::text[], $3::text[], $4::date[], $5::float8[], $6::float8[], $7::text[])
             AS t(employee_id, supervisor_name, section, entry_date, target_daily, target_monthly, metrics_json)
           ON CONFLICT (section, supervisor_name, entry_date) DO UPDATE SET
             employee_id = excluded.employee_id,
             target_daily = excluded.target_daily,
             target_monthly = excluded.target_monthly,
             metrics_json = excluded.metrics_json`,
          [tEmp.slice(i, end), tName.slice(i, end), tSection.slice(i, end), tDate.slice(i, end), tDaily.slice(i, end), tMonthly.slice(i, end), tMetrics.slice(i, end)]
        );
      }

      return { created, updated, daily, stageTargets, skipped, newCredentials, updatedEmployees, createdEmployees, supervisorLinked, supervisorUnmatched };
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

      // Classify everyone in JS first (no DB calls), then apply the three
      // groups with ONE bulk UPDATE each instead of one UPDATE per employee.
      const activeIds = [], leftIds = [], archiveIds = [];
      for (const e of allEmployeesNow2) {
        if (masterIds.has(e.id)) activeIds.push(e.id);
        else if (leaverIds.has(e.id)) leftIds.push(e.id);
        else if (importShifts.has(e.shift)) archiveIds.push(e.id);
        // else: different shift, not covered by this file -> leave untouched.
      }
      statusActive = activeIds.length;
      statusLeft = leftIds.length;
      statusArchive = archiveIds.length;

      const setStatusTx = db.transaction(async () => {
        if (activeIds.length) await db.query("UPDATE employees SET status = 'active' WHERE id = ANY($1::int[])", [activeIds]);
        if (leftIds.length) await db.query("UPDATE employees SET status = 'left', left_date = COALESCE(left_date, CURRENT_DATE), departure_reason = COALESCE(NULLIF(departure_reason,''), 'غير محدد') WHERE id = ANY($1::int[])", [leftIds]);
        if (archiveIds.length) await db.query("UPDATE employees SET status = 'archive' WHERE id = ANY($1::int[])", [archiveIds]);
      });
      await setStatusTx();
    } catch (e) {
      console.error('Employee status update error:', e);
    }

    }

    // Persist a durable import history entry in PostgreSQL. This is intentionally
    // separate from localStorage so it survives browser changes and Vercel deploys.
    await db.prepare(`
      INSERT INTO import_history
        (imported_by, imported_by_name, filename, month_start, updated_count, created_count, daily_count, skipped_count, supervisor_linked, supervisor_unmatched, status, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'success', ?::jsonb)
    `).run(
      req.user.id, req.user.name || null, filename || 'Master.xlsx', monthStart, result.updated, result.created,
      result.daily, result.skipped, result.supervisorLinked, result.supervisorUnmatched,
      JSON.stringify({ updatedEmployees: result.updatedEmployees, createdEmployees: result.createdEmployees, stageTargets: result.stageTargets })
    );

    await writeAudit(req, 'import_master', 'import', null, { filename: filename || 'Master.xlsx', month_start: monthStart, updated: result.updated, created: result.created, daily: result.daily, stage_targets: result.stageTargets, skipped: result.skipped });
    // New employee passwords are intentionally returned once to the admin so they can be distributed.
    res.json({
      ok: true,
      message: `تم استيراد شيت Master بنجاح: ${result.updated} موظف محدث، ${result.created} موظف جديد، ${result.daily} سجل يومي، ${result.stageTargets} تارجت مرحلة محفوظ. تفاصيل تارجت الاشراف: ${result.supervisorLinked} سجل مربوط بموظف${result.supervisorUnmatched ? `، ${result.supervisorUnmatched} سجل بدون تطابق اسم` : ''}. الحالة: ${statusActive} نشط، ${statusLeft} غادر، ${statusArchive} أرشيف.`,
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

// Durable import history. Available to full admins and supervisors who can import.
router.get('/import-history', requireAuth, requireSupervisor, async (req, res) => {
  const rows = await db.prepare(`
    SELECT id, imported_by, imported_by_name, filename, month_start, updated_count, created_count, daily_count, skipped_count,
           supervisor_linked, supervisor_unmatched, status, details_json, created_at
    FROM import_history
    ORDER BY created_at DESC, id DESC
    LIMIT 100
  `).all();
  res.json({ history: rows.map(r => ({
    ...r,
    details: r.details_json || null,
  })) });
});

// Update the currently authenticated user's own name/password. This is the
// safe self-service path for the protected primary system administrator.
// It cannot change id, role, status, or any other account's data.
router.patch('/me/profile', requireAuth, async (req, res) => {
  const userId = Number(req.user.id);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'حساب غير صالح.' });

  const emp = await db.prepare('SELECT id, name, role FROM employees WHERE id = ?').get(userId);
  if (!emp) return res.status(404).json({ error: 'الحساب غير موجود.' });

  const { name, currentPassword, newPassword } = req.body || {};
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'الاسم غير صالح.' });
  }
  if (newPassword !== undefined) {
    if (typeof newPassword !== 'string' || newPassword.length < 4) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل.' });
    }
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ error: 'أدخل كلمة المرور الحالية لتغيير كلمة المرور.' });
    }
    const full = await db.prepare('SELECT password_hash FROM employees WHERE id = ?').get(userId);
    if (!full || !bcrypt.compareSync(String(currentPassword), full.password_hash)) {
      return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة.' });
    }
  }

  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
  if (newPassword !== undefined) { fields.push('password_hash = ?'); values.push(bcrypt.hashSync(newPassword, 10)); fields.push('must_change_password = FALSE'); }
  if (!fields.length) return res.status(400).json({ error: 'لم يتم إرسال أي تعديل.' });
  values.push(userId);
  await db.prepare(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const updated = await db.prepare('SELECT id, name, role, shift, company, department, must_change_password FROM employees WHERE id = ?').get(userId);
  res.json({ ok: true, user: updated, message: 'تم تحديث بيانات حسابك بنجاح.' });
});

// Delete an employee (and their daily records / summary via ON DELETE CASCADE)
router.delete('/employee/:id', requireAuth, requireSystemCreator, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'رقم موظف غير صالح.' });

  const emp = (await db.prepare('SELECT id, role FROM employees WHERE id = ?').get(targetId));
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود.' });
  const primaryAdminId = await getPrimaryAdminId();
  if (targetId === primaryAdminId) return res.status(403).json({ error: 'لا يمكن حذف حساب مدير النظام الأساسي.' });
  if (targetId === req.user.id) return res.status(400).json({ error: 'لا يمكنك حذف حسابك من هنا.' });

  (await db.prepare('DELETE FROM employees WHERE id = ?').run(targetId));
  await writeAudit(req, 'delete_employee', 'employee', targetId, {});
  res.json({ ok: true, message: 'تم حذف الموظف بنجاح.' });
});

// Reset/change an employee's password
router.post('/employee/:id/reset-password', requireAuth, requireSystemCreator, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'رقم موظف غير صالح.' });

  const emp = (await db.prepare('SELECT id, role FROM employees WHERE id = ?').get(targetId));
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود.' });
  const primaryAdminId = await getPrimaryAdminId();
  if (targetId === primaryAdminId) return res.status(403).json({ error: 'لا يمكن تغيير كلمة مرور مدير النظام الأساسي من هنا.' });

  let { newPassword } = req.body || {};
  let generated = false;
  if (!newPassword) {
    newPassword = DEFAULT_PASSWORD;
    generated = true;
  } else if (typeof newPassword !== 'string' || newPassword.length < 4) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل.' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  (await db.prepare('UPDATE employees SET password_hash = ?, must_change_password = FALSE WHERE id = ?').run(hash, targetId));
  await writeAudit(req, 'change_password', 'employee', targetId, { generated });

  res.json({ ok: true, message: 'تم تغيير كلمة المرور بنجاح.', password: generated ? newPassword : undefined });
});

// Full employee list for the admin "Employees" management page.
// Includes every account (regular employees + supervisor accounts + full admins)
// so the full-control admin can see and change everyone's permission level.
router.get('/employees', requireAuth, requireSupervisor, async (req, res) => {
  const scoped = req.user.role === 'supervisor';
  const rows = (await db.prepare(`
    SELECT id, emp_num, name, education, residence, company, shift, department, role, must_change_password, status, left_date, departure_reason, created_at, supervisor_shifts
    FROM employees
    WHERE ${scoped ? "role = 'employee' AND shift = ANY(?::text[])" : '1=1'}
    ORDER BY name
  `).all(...(scoped ? [Array.isArray(req.user.supervisorShifts)&&req.user.supervisorShifts.length ? req.user.supervisorShifts : [String(req.user.shift || '').trim()]] : [])));
  const total = rows.filter(r => r.role === 'employee' && (r.status || 'active') === 'active').length;
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
  const row = (await db.prepare(`SELECT id FROM employees WHERE role IN ('system_creator','admin') ORDER BY CASE WHEN role='system_creator' THEN 0 ELSE 1 END, id ASC LIMIT 1`).get());
  return row ? row.id : null;
}

router.patch('/employee/:id/role', requireAuth, requireAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'رقم موظف غير صالح.' });

  const { role } = req.body || {};
  const allowedRoles = ['system_creator', 'admin', 'supervisor', 'employee'];
  if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'صلاحية غير صالحة.' });

  if (req.user.id === targetId) {
    return res.status(400).json({ error: 'لا يمكنك تغيير صلاحيتك الخاصة.' });
  }

  const target = (await db.prepare('SELECT id, role FROM employees WHERE id = ?').get(targetId));
  if (!target) return res.status(404).json({ error: 'الموظف غير موجود.' });
  const primaryAdminId = await getPrimaryAdminId();
  if (targetId === primaryAdminId && role !== target.role) {
    return res.status(403).json({ error: 'حساب مدير النظام الأساسي محمي ولا يمكن تغيير صلاحيته.' });
  }

  // Supervisor: employee <-> supervisor only.
  if (req.user.role === 'supervisor' && (role === 'admin' || role === 'system_creator' || target.role === 'admin' || target.role === 'system_creator')) {
    return res.status(403).json({ error: 'المشرف لا يمكنه تعديل صلاحيات الإدارة.' });
  }
  // Manager (admin): may grant admin (full control, same as themself),
  // supervisor, or employee to any account, but can never touch the
  // system_creator account or grant the system_creator role — that stays
  // exclusive to the creator.
  if (req.user.role === 'admin' && (role === 'system_creator' || target.role === 'system_creator')) {
    return res.status(403).json({ error: 'مدير النظام لا يمكنه تعديل صلاحية منشئ النظام أو منحها.' });
  }
  // There is one system-creator account. It is the highest permission level.
  if (role === 'system_creator') {
    const existingCreator = await db.prepare("SELECT id FROM employees WHERE role = 'system_creator' LIMIT 1").get();
    if (existingCreator && Number(existingCreator.id) !== targetId) {
      return res.status(409).json({ error: 'يوجد بالفعل حساب واحد بصلاحية منشئ النظام.' });
    }
  }
  // Creator has full role-management authority except changing their own role.
  let supervisorShifts = null;
  if (role === 'supervisor') {
    const raw = Array.isArray(req.body?.supervisorShifts) ? req.body.supervisorShifts : [];
    supervisorShifts = [...new Set(raw.map(v => String(v || '').trim().toUpperCase()).filter(v => ['A','B','C','D','OTHER'].includes(v)))];
    if (!supervisorShifts.length) return res.status(400).json({ error: 'اختر شيفتًا واحدًا على الأقل للمشرف.' });
  }
  if (role !== 'supervisor') supervisorShifts = [];
  await db.prepare('UPDATE employees SET role = ?, supervisor_shifts = ?::text[] WHERE id = ?').run(role, supervisorShifts, targetId);
  await writeAudit(req, 'change_role', 'employee', targetId, { from: target.role, to: role });
  res.json({ ok: true, message: 'تم تحديث الصلاحية بنجاح.', role, supervisorShifts: supervisorShifts || [] });
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
    let sql = `SELECT COUNT(*) c FROM employees e WHERE e.role = 'employee' AND COALESCE(e.status,'active') = 'active'`;
    if (shift) { sql += ' AND e.shift = ?'; params.push(shift); }
    // Demographic KPIs (employees/company/students/graduates) are roster KPIs,
    // not attendance KPIs. They must not shrink just because a selected date
    // range has no attendance row for someone.
    sql += extraSql;
    return (await db.prepare(sql).get(...params)).c;
  };

  const total = await count();
  const smart = await count(` AND (UPPER(e.company) LIKE '%SMART%' OR UPPER(e.company) = 'SB')`);
  const bravos = await count(` AND UPPER(e.company) LIKE '%BRAVOS%'`);
  const students = await count(` AND e.education = 'طالب'`);
  const graduates = await count(` AND e.education = 'خريج'`);
  // "New" and "Left" KPIs are roster KPIs that link to the Current-month New
  // page and the Left page, so they must count exactly what those pages list.
  // They used to be clipped by the Home attendance date range (the range of the
  // imported attendance data): a departure dated after the last imported day,
  // a left employee with no left_date, or employees created after the period
  // all fell outside it, which is why both cards showed 0.
  const shiftSql = shift ? ' AND e.shift = ?' : '';
  const shiftParams = shift ? [shift] : [];
  const newEmployees = Number((await db.prepare(
    `SELECT COUNT(*) c FROM employees e
      WHERE e.role='employee'${shiftSql}
        AND e.created_at >= (date_trunc('month', NOW() AT TIME ZONE 'Africa/Cairo') AT TIME ZONE 'Africa/Cairo')`
  ).get(...shiftParams)).c || 0);
  const leftEmployees = Number((await db.prepare(
    `SELECT COUNT(*) c FROM employees e
      WHERE e.role='employee' AND e.status='left'${shiftSql}`
  ).get(...shiftParams)).c || 0);
  res.json({ total, smart, bravos, students, graduates, other: Math.max(total-smart-bravos,0), newEmployees, leftEmployees });
});;

// Reset an employee's password back to the shared company default
// ("P@ssw0rd"). Employees never choose their own password - only the admin
// can set/reset it, from this Employees management page.
router.post('/employee/:id/reset-default', requireAuth, requireSystemCreator, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'رقم موظف غير صالح.' });

  const emp = (await db.prepare('SELECT id, role FROM employees WHERE id = ?').get(targetId));
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود.' });
  const primaryAdminId = await getPrimaryAdminId();
  if (targetId === primaryAdminId) return res.status(403).json({ error: 'لا يمكن تغيير كلمة مرور مدير النظام الأساسي من هنا.' });

  const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  (await db.prepare('UPDATE employees SET password_hash = ?, must_change_password = FALSE WHERE id = ?').run(hash, targetId));
  await writeAudit(req, 'reset_default_password', 'employee', targetId, {});

  res.json({ ok: true, message: 'تم إعادة كلمة المرور إلى الافتراضية.', password: DEFAULT_PASSWORD });
});

// Bulk password import: [{ id, password }, ...] -> sets each employee's password
// in one call. The admin UI sends this in small batches (bcrypt is CPU-heavy, so
// one request per ~25 accounts keeps every call far below the function timeout).
// Passwords are never written to the audit log - only counts and IDs.
router.post('/import-passwords', requireAuth, requireSystemCreator, async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
  if (!rows || !rows.length) return res.status(400).json({ error: 'لا توجد بيانات لرفعها.' });
  if (rows.length > 100) return res.status(400).json({ error: 'الحد الأقصى 100 حساب في الطلب الواحد.' });

  const primaryAdminId = await getPrimaryAdminId();
  const updated = [], notFound = [], invalid = [], protectedIds = [];
  const seen = new Set();

  for (const r of rows) {
    const id = Number(r?.id);
    const password = typeof r?.password === 'string' ? r.password.trim() : '';
    if (!Number.isInteger(id) || id <= 0) { invalid.push({ id: r?.id ?? null, reason: 'ID غير صالح' }); continue; }
    if (password.length < 4) { invalid.push({ id, reason: 'الباسورد أقل من 4 أحرف' }); continue; }
    if (seen.has(id)) { invalid.push({ id, reason: 'ID مكرر في الملف' }); continue; }
    seen.add(id);
    if (id === primaryAdminId) { protectedIds.push(id); continue; }

    const emp = await db.prepare('SELECT id FROM employees WHERE id = ?').get(id);
    if (!emp) { notFound.push(id); continue; }

    const hash = bcrypt.hashSync(password, 10);
    await db.prepare('UPDATE employees SET password_hash = ?, must_change_password = FALSE WHERE id = ?').run(hash, id);
    updated.push(id);
  }

  await writeAudit(req, 'bulk_import_passwords', 'employee', null, {
    updated: updated.length, not_found: notFound.length, invalid: invalid.length, protected: protectedIds.length,
    updated_ids: updated
  });

  res.json({
    ok: true,
    updated: updated.length,
    notFound,
    invalid,
    protected: protectedIds,
    message: `تم تحديث ${updated.length} كلمة مرور.`
  });
});

// Update an employee's ID and/or name. Changing the ID is done inside a
// transaction with foreign-key checks briefly relaxed so related rows
// (summary, daily records, login audit) move over atomically.
router.patch('/employee/:id', requireAuth, requireSystemCreator, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'رقم موظف غير صالح.' });

  const emp = (await db.prepare('SELECT id, role FROM employees WHERE id = ?').get(targetId));
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود.' });
  const primaryAdminId = await getPrimaryAdminId();
  if (targetId === primaryAdminId) {
    return res.status(403).json({ error: 'حساب مدير النظام الأساسي محمي. استخدم إعدادات حسابك لتعديل الاسم أو كلمة المرور.' });
  }

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

// ---- Employee departure management (Supervisor / Admin / System Creator) ----
const DEPARTURE_REASONS=['استقالة','كثرة الغياب عن العمل','ضعف الأداء / عدم تحقيق التارجت','مخالفة لوائح العمل','مخالفة إدارية / سلوكية','ترك العمل بدون إخطار','خدمة الوطن (الجيش)'];
function normalizeDepartureReason(value){ return String(value ?? '').replace(/\s+/g,' ').trim(); }
function isValidDepartureDate(value){ const d=String(value ?? '').trim(); if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false; const [y,m,day]=d.split('-').map(Number); const dt=new Date(Date.UTC(y,m-1,day)); return dt.getUTCFullYear()===y && dt.getUTCMonth()===m-1 && dt.getUTCDate()===day; }
router.get('/employee/:id/departure',requireAuth,requireSupervisor,async(req,res)=>{const id=Number(req.params.id);const emp=await db.prepare("SELECT id,role,shift,left_date,departure_reason,status FROM employees WHERE id=?").get(id);if(!emp||emp.role!=='employee')return res.status(404).json({error:'الموظف غير موجود.'});if(req.user.role==='supervisor'){const allowed=Array.isArray(req.user.supervisorShifts)&&req.user.supervisorShifts.length?req.user.supervisorShifts:[req.user.shift||''];if(!allowed.includes(String(emp.shift||'')))return res.status(403).json({error:'لا يمكنك الوصول إلى موظف خارج الشيفتات المسندة إليك.'});}res.json({departure:{leftDate:emp.left_date?String(emp.left_date).slice(0,10):'',reason:emp.departure_reason||'',status:emp.status||'active'}})});
router.patch('/employee/:id/departure',requireAuth,requireSupervisor,async(req,res)=>{const id=Number(req.params.id);const emp=await db.prepare("SELECT id,role,shift FROM employees WHERE id=?").get(id);if(!emp||emp.role!=='employee')return res.status(404).json({error:'الموظف غير موجود.'});if(req.user.role==='supervisor'){const allowed=Array.isArray(req.user.supervisorShifts)&&req.user.supervisorShifts.length?req.user.supervisorShifts:[req.user.shift||''];if(!allowed.includes(String(emp.shift||'')))return res.status(403).json({error:'لا يمكنك تسجيل مغادرة موظف خارج الشيفتات المسندة إليك.'});}const d=String(req.body?.leftDate||'').trim(),r=normalizeDepartureReason(req.body?.reason);const matchedReason=DEPARTURE_REASONS.find(x=>x===r);if(!isValidDepartureDate(d)||!matchedReason)return res.status(400).json({error:!isValidDepartureDate(d)?'تاريخ المغادرة غير صالح.': 'اختر سبب مغادرة صحيح.'});await db.prepare("UPDATE employees SET status='left',left_date=?,departure_reason=? WHERE id=?").run(d,matchedReason,id);await writeAudit(req,'mark_employee_left','employee',id,{left_date:d,departure_reason:matchedReason});res.json({ok:true,departure:{leftDate:d,reason:matchedReason}})});
router.patch('/employee/:id/reactivate',requireAuth,requireSystemCreator,async(req,res)=>{const id=Number(req.params.id);await db.prepare("UPDATE employees SET status='active',left_date=NULL,departure_reason=NULL WHERE id=? AND role='employee'").run(id);await writeAudit(req,'reactivate_employee','employee',id,{});res.json({ok:true})});
router.get('/employee-group/:group',requireAuth,requireSupervisor,async(req,res)=>{const g=String(req.params.group||'all');if(!['all','current','left','archive'].includes(g))return res.status(400).json({error:'تصنيف غير صالح.'});const sc=req.user.role==='supervisor', supervisorShifts=Array.isArray(req.user.supervisorShifts)&&req.user.supervisorShifts.length?req.user.supervisorShifts:[req.user.shift||''], ps=sc?supervisorShifts:[], sq=sc?` AND e.shift = ANY(?::text[])`:'';let st='';if(g==='current')st=" AND COALESCE(e.status,'active')='active'";if(g==='left')st=" AND e.status='left'";if(g==='archive')st=" AND e.status='archive'";const rows=await db.prepare(`SELECT id,emp_num,name,education,company,shift,department,status,left_date,departure_reason,created_at,supervisor_shifts FROM employees e WHERE e.role='employee'${sq}${st} ORDER BY name`).all(...ps);res.json({employees:rows,total:rows.length,group:g})});
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'employee', FALSE)
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
  const stageName = String(stage).trim();
  const tx = db.transaction(async (rows) => {
    let saved = 0, skipped = 0;
    const empIds = [], dates = [], nums = [], texts = [];
    for (const row of rows) {
      const empId = Number(row.employee_id);
      if (!Number.isInteger(empId) || !validEmpIds.has(empId) || !row.entry_date || !/^\d{4}-\d{2}-\d{2}$/.test(row.entry_date)) { skipped++; continue; }
      const value = row.value;
      if (value === '' || value === null || value === undefined) { skipped++; continue; }
      const numeric = Number.isFinite(Number(value));
      empIds.push(empId); dates.push(row.entry_date);
      nums.push(numeric ? Number(value) : null);
      texts.push(numeric ? null : String(value));
      saved++;
    }
    // One bulk statement instead of one INSERT per grid cell.
    for (let i = 0; i < empIds.length; i += 2000) {
      const end = Math.min(i + 2000, empIds.length);
      const chunkLen = end - i;
      await db.query(
        `INSERT INTO stage_daily (employee_id, stage, entry_date, value_num, value_text)
         SELECT * FROM unnest($1::int[], $2::text[], $3::date[], $4::float8[], $5::text[])
         ON CONFLICT (employee_id, stage, entry_date) DO UPDATE SET
           value_num = excluded.value_num, value_text = excluded.value_text`,
        [empIds.slice(i, end), new Array(chunkLen).fill(stageName), dates.slice(i, end), nums.slice(i, end), texts.slice(i, end)]
      );
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
router.get('/report/stages', requireAuth, async (req, res) => {
  const rows = (await db.prepare(`SELECT DISTINCT stage FROM stage_daily WHERE stage <> 'TOTAL TARGET %' ORDER BY stage`).all());
  res.json({ stages: rows.map(r => r.stage) });
});

// Employees who have at least one daily record within [from, to] (optionally
// filtered to one stage), with their target/value summed over that range.
router.get('/report/attendance', requireAuth, async (req, res) => {
  const { from, to } = req.query;
  const stages = parseList(req.query.stage);
  const requestedShifts = parseList(req.query.shift);
  const isAdmin = req.user.role === 'admin' || req.user.role === 'system_creator';
  const isSupervisor = req.user.role === 'supervisor';
  const isEmployee = req.user.role === 'employee';
  const ownShift = String(req.user.shift || '').trim();
  if (isSupervisor && !ownShift) return res.status(403).json({ error: 'حساب المشرف غير مرتبط بشيفت.' });
  if (isEmployee && !req.user.id) return res.status(403).json({ error: 'حساب الموظف غير صالح.' });
  if (!stages.length) return res.status(400).json({ error: 'اختيار المرحلة شرط أساسي لإنشاء تقرير أرقام الموظفين.' });

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'حدد فترة تاريخ صالحة (من - إلى).' });
  }

  const stageSql = ` AND sd.stage IN (${stages.map(()=>'?').join(',')})`;
  const idParams = [from, to, ...stages];
  let shiftSql = '';
  let scopeParams = [...idParams];
  if (isSupervisor) { shiftSql = ' AND e.shift = ?'; scopeParams.push(ownShift); }
  else if (isEmployee) { shiftSql = ' AND e.id = ?'; scopeParams.push(Number(req.user.id)); }
  else if (isAdmin && requestedShifts.length) { shiftSql = ` AND e.shift IN (${requestedShifts.map(()=>'?').join(',')})`; scopeParams.push(...requestedShifts); }
  const empIds = (await db.prepare(`
    SELECT DISTINCT sd.employee_id FROM stage_daily sd
    JOIN employees e ON e.id = sd.employee_id
    WHERE sd.entry_date BETWEEN ? AND ?${stageSql}${shiftSql}
  `).all(...scopeParams)).map(r => r.employee_id);

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

// ---- System Creator: audit logs + banner/theme management ----
router.get('/audit-logs', requireAuth, requireSystemCreator, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
  const rows = await db.prepare(`
    SELECT id, actor_id, actor_name, action, entity_type, entity_id, details_json, ip, created_at
    FROM audit_logs ORDER BY created_at DESC LIMIT ?
  `).all(limit);
  res.json({ logs: rows.map(r => ({ ...r, details: r.details_json || {} })) });
});

function getBannerPayload(row) {
  let value = row?.value_json || {};
  // PostgreSQL normally returns JSONB as an object, but older deployments
  // may have stored the JSON payload as text.
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch (_) { value = {}; }
  }
  return value && typeof value === 'object' ? value : {};
}

router.get('/banner', requireAuth, async (req, res) => {
  const row = await db.prepare(`SELECT value_json FROM system_settings WHERE key = 'home_banner'`).get();
  const value = getBannerPayload(row);
  res.json({ banner: value.data || null, filename: value.filename || null, updated_at: value.updated_at || null });
});

// The home page uses the binary endpoint so it does not have to download a
// multi-megabyte base64 JSON response just to display an image.
router.get('/banner/image', requireAuth, async (req, res) => {
  const row = await db.prepare(`SELECT value_json FROM system_settings WHERE key = 'home_banner'`).get();
  const value = getBannerPayload(row);
  const match = String(value.data || '').match(/^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return res.status(404).end();

  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length) return res.status(404).end();
  res.set({
    'Content-Type': match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase(),
    'Cache-Control': 'private, no-store',
  });
  return res.send(buffer);
});

router.put('/banner', requireAuth, requireSystemCreator, async (req, res) => {
  const { data, filename } = req.body || {};
  if (!data || typeof data !== 'string' || !/^data:image\/(png|jpe?g|webp);base64,/i.test(data)) {
    return res.status(400).json({ error: 'ارفع صورة PNG أو JPG أو WEBP صالحة.' });
  }
  if (data.length > 7_000_000) return res.status(413).json({ error: 'حجم صورة البانر كبير جدًا. الحد الأقصى حوالي 5MB.' });
  const payload = JSON.stringify({ data, filename: String(filename || 'banner'), updated_at: new Date().toISOString() });
  await db.prepare(`
    INSERT INTO system_settings (key, value_json, updated_by)
    VALUES ('home_banner', ?::jsonb, ?)
    ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP
  `).run(payload, Number(req.user.id));
  await writeAudit(req, 'update_banner', 'system_settings', 'home_banner', { filename: filename || 'banner' });
  res.json({ ok: true, message: 'تم تحديث صورة البانر.' });
});

router.delete('/banner', requireAuth, requireSystemCreator, async (req, res) => {
  await db.prepare(`DELETE FROM system_settings WHERE key = 'home_banner'`).run();
  await writeAudit(req, 'remove_banner', 'system_settings', 'home_banner', {});
  res.json({ ok: true, message: 'تم حذف صورة البانر.' });
});

module.exports = router;
