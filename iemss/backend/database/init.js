const { Pool, types } = require('pg');
const fs = require('fs');
const path = require('path');

// By default node-postgres parses DATE columns into JS Date objects, which
// then serialize to full ISO timestamps ("2026-07-21T00:00:00.000Z") in JSON
// responses. All of this app's code (old SQLite-based logic, date <input>
// fields, string comparisons/splits) expects plain "yyyy-MM-dd" strings, so
// keep dates as the raw text Postgres sends instead of letting pg parse them.
types.setTypeParser(1082, val => val); // 1082 = OID for the `date` type

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

function convertSqlitePlaceholders(sql, params) {
  // Support the old route code's ? placeholders.
  if (!Array.isArray(params)) {
    const obj = params || {};
    const values = [];
    const converted = String(sql).replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (_, key) => {
      values.push(obj[key]);
      return `$${values.length}`;
    });
    return { sql: converted, values };
  }

  let i = 0;
  const converted = String(sql).replace(/\?/g, () => `$${++i}`);
  return { sql: converted, values: params };
}

function prepare(sql) {
  return {
    async get(...params) {
      const q = convertSqlitePlaceholders(sql, params.length === 1 && params[0] && typeof params[0] === 'object' && !Array.isArray(params[0]) ? params[0] : params);
      const result = await query(q.sql, q.values);
      return result.rows[0];
    },
    async all(...params) {
      const q = convertSqlitePlaceholders(sql, params.length === 1 && params[0] && typeof params[0] === 'object' && !Array.isArray(params[0]) ? params[0] : params);
      const result = await query(q.sql, q.values);
      return result.rows;
    },
    async run(...params) {
      const q = convertSqlitePlaceholders(sql, params.length === 1 && params[0] && typeof params[0] === 'object' && !Array.isArray(params[0]) ? params[0] : params);
      const result = await query(q.sql, q.values);
      return { changes: result.rowCount || 0 };
    },
  };
}

const { AsyncLocalStorage } = require('node:async_hooks');
const transactionStorage = new AsyncLocalStorage();

async function query(sql, params = []) {
  const client = transactionStorage.getStore();
  if (client) return client.query(sql, params);
  return pool.query(sql, params);
}

function transaction(fn) {
  return async (...args) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await transactionStorage.run(client, () => fn(...args));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw error;
    } finally {
      client.release();
    }
  };
}

async function exec(sql) {
  return query(sql);
}

// SQLite compatibility no-op. PostgreSQL enforces foreign keys permanently.

let initializationPromise = null;
async function ensureDatabase() {
  if (initializationPromise) return initializationPromise;
  initializationPromise = (async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
    const client = await pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock(82736451)');
      const bootstrap = fs.readFileSync(path.join(__dirname, 'bootstrap.sql'), 'utf8');
      await client.query(bootstrap);
    } finally {
      try { await client.query('SELECT pg_advisory_unlock(82736451)'); } catch (_) {}
      client.release();
    }
  })().catch(err => { initializationPromise = null; throw err; });
  return initializationPromise;
}

function pragma() { return undefined; }

module.exports = { pool, query, prepare, transaction, exec, pragma, ensureDatabase };
