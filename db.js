// Simple DB helper that wraps the existing MariaDB pool
const pool = require('./config');

async function query(sql, params = []) {
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(sql, params);
    return [rows];
  } finally {
    conn.release();
  }
}

module.exports = { query };
