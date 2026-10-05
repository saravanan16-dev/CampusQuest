const db = require("../config/db");

const getNotesBySubject = async (subjectId, unit) => {
    let sql = `
        SELECT n.*, s.name as subject_name, u.name as uploader_name 
        FROM notes n
        JOIN subjects s ON n.subject_id = s.id
        LEFT JOIN users u ON n.uploaded_by = u.id
        WHERE n.subject_id = ?
    `;
    const params = [subjectId];
    if (unit) {
        sql += " AND n.unit = ?";
        params.push(unit);
    }
    sql += " ORDER BY n.unit ASC, n.created_at DESC";
    const [rows] = await db.query(sql, params);
    return rows;
};

const getAllNotes = async () => {
    const [rows] = await db.query(`
        SELECT n.*, s.name as subject_name, u.name as uploader_name 
        FROM notes n
        JOIN subjects s ON n.subject_id = s.id
        LEFT JOIN users u ON n.uploaded_by = u.id
        ORDER BY s.name ASC, n.unit ASC
    `);
    return rows;
};

const getNoteById = async (id) => {
    const [rows] = await db.query(`
        SELECT n.*, s.name as subject_name, u.name as uploader_name 
        FROM notes n
        JOIN subjects s ON n.subject_id = s.id
        LEFT JOIN users u ON n.uploaded_by = u.id
        WHERE n.id = ?
    `, [id]);
    return rows[0];
};

const createNote = async ({ subject_id, title, description, unit, file_url, content, uploaded_by }) => {
    const [result] = await db.query(
        "INSERT INTO notes (subject_id, title, description, unit, file_url, content, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [subject_id, title, description, unit, file_url, content, uploaded_by]
    );
    return result.insertId;
};

const updateNote = async (id, { title, description, unit, file_url, content }) => {
    const [result] = await db.query(
        `UPDATE notes 
         SET title = COALESCE(?, title),
             description = COALESCE(?, description),
             unit = COALESCE(?, unit),
             file_url = COALESCE(?, file_url),
             content = COALESCE(?, content)
         WHERE id = ?`,
        [title, description, unit, file_url, content, id]
    );
    return result;
};

const deleteNote = async (id) => {
    const [result] = await db.query("DELETE FROM notes WHERE id = ?", [id]);
    return result;
};

module.exports = {
    getNotesBySubject,
    getAllNotes,
    getNoteById,
    createNote,
    updateNote,
    deleteNote
};
