const db = require("../config/db");

const findByEmail = async (email) => {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0];
};

const findByUsername = async (username) => {
    const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
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
    findById,
    createUser,
    updateUser,
    getAllUsers,
    updateUserRole
};
