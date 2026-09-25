-- IEMS one-time clean start for production.
-- Keeps ONLY the protected primary system-admin account (lowest admin id).
-- Run this once against the production PostgreSQL database BEFORE the first clean import.
BEGIN;
DELETE FROM import_history;
DELETE FROM login_audit;
DELETE FROM supervisor_targets;
DELETE FROM stage_daily;
DELETE FROM employee_summary;
DELETE FROM employee_monthly_summary;
DELETE FROM employee_shift_profiles;
DELETE FROM employees
WHERE id <> (SELECT id FROM employees WHERE role = 'admin' ORDER BY id ASC LIMIT 1);
COMMIT;
