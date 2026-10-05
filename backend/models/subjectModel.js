const db = require("../config/db");

const getAllSubjects = async (semester) => {
    let sql = "SELECT * FROM subjects";
    const params = [];
    if (semester) {
        sql += " WHERE semester = ?";
        params.push(semester);
    }
    sql += " ORDER BY semester ASC, name ASC";
    const [rows] = await db.query(sql, params);
    return rows;
};

const getSubjectById = async (id) => {
    const [rows] = await db.query(
        "SELECT * FROM subjects WHERE id = ?",
        [id]
    );
    return rows[0];
};

const createSubject = async ({ name, description = "", semester = 1 }) => {
    const [result] = await db.query(
        "INSERT INTO subjects (name, description, semester) VALUES (?, ?, ?)",
        [name, description, semester]
    );
    return result.insertId;
};

const updateSubject = async (id, { name, description, semester }) => {
    const [result] = await db.query(
        "UPDATE subjects SET name = COALESCE(?, name), description = COALESCE(?, description), semester = COALESCE(?, semester) WHERE id = ?",
        [name, description, semester, id]
    );
    return result;
};

const deleteSubject = async (id) => {
    const [result] = await db.query(
        "DELETE FROM subjects WHERE id = ?",
        [id]
    );
    return result;
};

module.exports = {
    getAllSubjects,
    getSubjectById,
    createSubject,
    updateSubject,
    deleteSubject
};