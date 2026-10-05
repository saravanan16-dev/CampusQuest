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
        "SELECT id, username, name, email, role, created_at, updated_at FROM users WHERE id = ?",
        [id]
    );
    return rows[0];
};

const createUser = async ({ username, name, email, password, role = "STUDENT" }) => {
    const [result] = await db.query(
        "INSERT INTO users (username, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
        [username, name, email, password, role]
    );
    return result.insertId;
};

const updateUser = async (id, { name, email }) => {
    const [result] = await db.query(
        "UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?",
        [name, email, id]
    );
    return result;
};

const getAllUsers = async () => {
    const [rows] = await db.query(
        "SELECT id, username, name, email, role, created_at FROM users ORDER BY created_at DESC"
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
