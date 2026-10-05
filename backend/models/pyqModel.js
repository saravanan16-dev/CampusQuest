const db = require("../config/db");

const getPYQs = async ({ subject_id, year, regulation, semester }) => {
    let sql = `
        SELECT p.*, s.name as subject_name 
        FROM pyqs p
        JOIN subjects s ON p.subject_id = s.id
        WHERE 1=1
    `;
    const params = [];
    if (subject_id) {
        sql += " AND p.subject_id = ?";
        params.push(subject_id);
    }
    if (year) {
        sql += " AND p.year = ?";
        params.push(year);
    }
    if (regulation) {
        sql += " AND p.regulation = ?";
        params.push(regulation);
    }
    if (semester) {
        sql += " AND p.semester = ?";
        params.push(semester);
    }

    sql += " ORDER BY p.year DESC, p.semester ASC";
    const [rows] = await db.query(sql, params);
    return rows;
};

const getPYQById = async (id) => {
    const [rows] = await db.query(`
        SELECT p.*, s.name as subject_name 
        FROM pyqs p
        JOIN subjects s ON p.subject_id = s.id
        WHERE p.id = ?
    `, [id]);
    return rows[0];
};

const createPYQ = async ({ subject_id, regulation, year, semester, exam_type = "Regular", title, file_url }) => {
    const [result] = await db.query(
        `INSERT INTO pyqs (subject_id, regulation, year, semester, exam_type, title, file_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [subject_id, regulation, year, semester, exam_type, title, file_url]
    );
    return result.insertId;
};

const updatePYQ = async (id, { regulation, year, semester, exam_type, title, file_url }) => {
    const [result] = await db.query(
        `UPDATE pyqs 
         SET regulation = COALESCE(?, regulation),
             year = COALESCE(?, year),
             semester = COALESCE(?, semester),
             exam_type = COALESCE(?, exam_type),
             title = COALESCE(?, title),
             file_url = COALESCE(?, file_url)
         WHERE id = ?`,
        [regulation, year, semester, exam_type, title, file_url, id]
    );
    return result;
};

const deletePYQ = async (id) => {
    const [result] = await db.query("DELETE FROM pyqs WHERE id = ?", [id]);
    return result;
};

module.exports = {
    getPYQs,
    getPYQById,
    createPYQ,
    updatePYQ,
    deletePYQ
};
