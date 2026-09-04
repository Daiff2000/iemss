require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'initial-data.json'), 'utf8'));

async function insertBatch(client, table, columns, rows, mapRow, conflict = '') {
  const batchSize = 200;
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const values = [];
    const tuples = batch.map((row, i) => {
      const mapped = mapRow(row);
      const placeholders = mapped.map((_, j) => `$${i * mapped.length + j + 1}`);
      values.push(...mapped);
      return `(${placeholders.join(',')})`;
    });
    await client.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES ${tuples.join(',')}${conflict}`, values);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const client = await pool.connect();
  try {
    await client.query(schema);
    const count = Number((await client.query('SELECT COUNT(*)::int AS c FROM employees')).rows[0].c);
    if (count > 0) {
      console.log(`PostgreSQL already contains ${count} employees; keeping existing data.`);
      return;
    }

    await client.query('BEGIN');
    await insertBatch(client, 'employees',
      ['id','emp_num','name','education','residence','company','shift','department','password_hash','role','must_change_password','status','created_at'],
      data.employees,
      r => [r.id, r.emp_num, r.name, r.education, r.residence, r.company, r.shift, r.department, r.password_hash, r.role, !!r.must_change_password, r.status || 'active', r.created_at]
    );
    await insertBatch(client, 'employee_summary',
      ['employee_id','total_achievement','total_target','percentage','bonus_tier','unauthorized_absence','total_absence','work_nature_allowance','monthly_target','total_present_days','total_absence_days','casual_leave','leave_with_permission','leave_without_permission','sick_leave','late_days','late_hours','overtime_days','overtime_hours','special_bonus_days','special_deductions'],
      data.employee_summary,
      r => [r.employee_id,r.total_achievement,r.total_target,r.percentage,r.bonus_tier,r.unauthorized_absence,r.total_absence,r.work_nature_allowance,r.monthly_target,r.total_present_days,r.total_absence_days,r.casual_leave,r.leave_with_permission,r.leave_without_permission,r.sick_leave,r.late_days,r.late_hours,r.overtime_days,r.overtime_hours,r.special_bonus_days,r.special_deductions]
    );
    await insertBatch(client, 'stage_daily',
      ['employee_id','stage','entry_date','value_num','value_text'],
      data.stage_daily,
      r => [r.employee_id,r.stage,r.entry_date,r.value_num,r.value_text]
    );
    await insertBatch(client, 'supervisor_targets',
      ['employee_id','supervisor_name','section','entry_date','target_daily','target_monthly','metrics_json'],
      data.supervisor_targets,
      r => [r.employee_id,r.supervisor_name,r.section,r.entry_date,r.target_daily,r.target_monthly,r.metrics_json]
    );
    await insertBatch(client, 'login_audit',
      ['employee_id','success','ip','ts'],
      data.login_audit,
      r => [r.employee_id,r.success,r.ip,r.ts]
    );
    await client.query("SELECT setval(pg_get_serial_sequence('stage_daily','id'), COALESCE((SELECT MAX(id) FROM stage_daily), 1), true)");
    await client.query("SELECT setval(pg_get_serial_sequence('supervisor_targets','id'), COALESCE((SELECT MAX(id) FROM supervisor_targets), 1), true)");
    await client.query("SELECT setval(pg_get_serial_sequence('login_audit','id'), COALESCE((SELECT MAX(id) FROM login_audit), 1), true)");
    await client.query("UPDATE employees SET role='supervisor' WHERE role='uploader'");
    await client.query('COMMIT');
    console.log(`Seeded PostgreSQL with ${data.employees.length} employees and all imported records.`);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw e;
  } finally {
    client.release();
  }
}

main().catch(err => { console.error(err); process.exitCode = 1; }).finally(() => pool.end());
