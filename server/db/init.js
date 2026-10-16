// Creates the database and tables from schema.sql. Usage: npm run db:init
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');

(async () => {
  const { database, ...conn } = config.db;
  const c = await mysql.createConnection({ ...conn, multipleStatements: true });
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8').replace(/campusquest/g, database);
  await c.query(sql);
  await c.end();
  console.log(`Schema ready in database "${database}".`);
})().catch((e) => {
  console.error('Schema setup failed:', e.message);
  process.exit(1);
});
