const mysql = require("mysql2/promise");
require("dotenv").config({ path: __dirname + "/../.env" });

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "campusquest123",
    database: process.env.DB_NAME || "mini_campusquest",
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = db;