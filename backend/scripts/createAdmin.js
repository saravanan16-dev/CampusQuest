/*
 * Usage (PowerShell):
 * $env:ADMIN_USERNAME='admin'; $env:ADMIN_NAME='CampusQuest Admin';
 * $env:ADMIN_EMAIL='admin@example.com'; $env:ADMIN_PASSWORD='change-me'; node scripts/createAdmin.js
 */
require("dotenv").config({ path: __dirname + "/../.env" });
const bcrypt = require("bcryptjs");
const db = require("../config/db");

async function main() {
    const { ADMIN_USERNAME, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (![ADMIN_USERNAME, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD].every(Boolean)) {
        throw new Error("Set ADMIN_USERNAME, ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD before running this script.");
    }
    const password = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const [result] = await db.query(
        `INSERT INTO users (username, name, email, password, role, is_active)
         VALUES (?, ?, ?, ?, 'ADMIN', TRUE)
         ON DUPLICATE KEY UPDATE name = VALUES(name), password = VALUES(password), role = 'ADMIN', is_active = TRUE`,
        [ADMIN_USERNAME, ADMIN_NAME, ADMIN_EMAIL, password]
    );
    console.log(`Administrator ${result.affectedRows === 1 ? "created" : "updated"}: ${ADMIN_USERNAME}`);
    await db.end();
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
