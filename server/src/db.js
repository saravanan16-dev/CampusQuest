const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false,
  dateStrings: true,
});

// Run a query and return rows.
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// Run several statements atomically. fn receives a connection-bound query helper.
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const q = async (sql, params = []) => (await conn.query(sql, params))[0];
    const result = await fn(q);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, withTransaction };
