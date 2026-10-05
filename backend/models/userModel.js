const db = require("../config/db");

const findByEmail = async (email) => {
    if (!email) return null;
    const [rows] = await db.query("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    return rows[0];
};

const findByUsername = async (username) => {
    if (!username) return null;
    const [rows] = await db.query("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", [username.trim()]);
    return rows[0];
};

const findByEmailOrUsername = async (identifier) => {
    if (!identifier) return null;
    const clean = identifier.trim();
    const [rows] = await db.query(
        "SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)",
        [clean, clean]
    );
    return rows[0];
};

const findById = async (id) => {
    const [rows] = await db.query(
        "SELECT id, username, name, email, role, college, department, year, semester, created_at, updated_at FROM users WHERE id = ?",
        [id]
    );
    return rows[0];
};

const createUser = async ({ username, name, email, password, role = "STUDENT", college = null, department = null, year = null, semester = null }) => {
    const [result] = await db.query(
        `INSERT INTO users (username, name, email, password, role, college, department, year, semester) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [username, name, email, password, role, college, department, year, semester]
    );
    return result.insertId;
};

const updateUser = async (id, { name, email, college, department, year, semester }) => {
    const [result] = await db.query(
        `UPDATE users 
         SET name = COALESCE(?, name), 
             email = COALESCE(?, email),
             college = COALESCE(?, college),
             department = COALESCE(?, department),
             year = COALESCE(?, year),
             semester = COALESCE(?, semester)
         WHERE id = ?`,
        [name, email, college, department, year, semester, id]
    );
    return result;
};

const getAllUsers = async () => {
    const [rows] = await db.query(
        "SELECT id, username, name, email, role, college, department, year, semester, created_at FROM users ORDER BY created_at DESC"
    );
    return rows;
};

const updateUserRole = async (id, role) => {
    const [result] = await db.query(
        "UPDATE users SET role = ? WHERE id = ?",
        [role, id]
    );
    return result;
};

module.exports = {
    findByEmail,
    findByUsername,
    findByEmailOrUsername,
    findById,
    createUser,
    updateUser,
    getAllUsers,
    updateUserRole
};
