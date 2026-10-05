const db = require("../config/db");

const getAllNotes = async ({ subject_id, unit_id, unit } = {}) => {
    let sql = `
        SELECT n.*, s.name as subject_name, u.name as unit_name, u.unit_number, usr.name as uploader_name 
        FROM notes n
        JOIN subjects s ON n.subject_id = s.id
        LEFT JOIN units u ON n.unit_id = u.id
        LEFT JOIN users usr ON n.uploaded_by = usr.id
        WHERE 1=1
    `;
    const params = [];

    if (subject_id) {
        sql += " AND n.subject_id = ?";
        params.push(subject_id);
    }
    if (unit_id) {
        sql += " AND n.unit_id = ?";
        params.push(unit_id);
    }
    if (unit) {
        sql += " AND (n.unit = ? OR u.unit_number = ?)";
        params.push(unit, unit);
    }

    sql += " ORDER BY s.name ASC, COALESCE(u.unit_number, n.unit) ASC, n.id ASC";
    const [rows] = await db.query(sql, params);
    return rows;
};

const getNotesBySubject = async (subjectId, unit) => {
    return await getAllNotes({ subject_id: subjectId, unit });
};

const getNoteById = async (id) => {
    const [rows] = await db.query(`
        SELECT n.*, s.name as subject_name, u.name as unit_name, u.unit_number, usr.name as uploader_name 
        FROM notes n
        JOIN subjects s ON n.subject_id = s.id
        LEFT JOIN units u ON n.unit_id = u.id
        LEFT JOIN users usr ON n.uploaded_by = usr.id
        WHERE n.id = ?
    `, [id]);
    return rows[0];
};

const createNote = async ({ subject_id, unit_id, title, description, unit, file_url, content, uploaded_by }) => {
    // If unit_id is provided but unit number isn't, get unit_number from units table
    let unitNum = unit || 1;
    if (unit_id && !unit) {
        const [uRow] = await db.query("SELECT unit_number FROM units WHERE id = ?", [unit_id]);
        if (uRow.length > 0) {
            unitNum = uRow[0].unit_number;
        }
    } else if (unit && !unit_id && subject_id) {
        // If unit number is provided, try to find matching unit_id
        const [uRow] = await db.query("SELECT id FROM units WHERE subject_id = ? AND unit_number = ?", [subject_id, unit]);
        if (uRow.length > 0) {
            unit_id = uRow[0].id;
        }
    }

    const [result] = await db.query(
        "INSERT INTO notes (subject_id, unit_id, title, description, unit, file_url, content, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [subject_id, unit_id || null, title, description, unitNum, file_url, content, uploaded_by]
    );
    return result.insertId;
};

const updateNote = async (id, { title, description, unit_id, unit, file_url, content }) => {
    const [result] = await db.query(
        `UPDATE notes 
         SET title = COALESCE(?, title),
             description = COALESCE(?, description),
             unit_id = COALESCE(?, unit_id),
             unit = COALESCE(?, unit),
             file_url = COALESCE(?, file_url),
             content = COALESCE(?, content)
         WHERE id = ?`,
        [title, description, unit_id, unit, file_url, content, id]
    );
    return result;
};

const deleteNote = async (id) => {
    const [result] = await db.query("DELETE FROM notes WHERE id = ?", [id]);
    return result;
};

module.exports = {
    getAllNotes,
    getNotesBySubject,
    getNoteById,
    createNote,
    updateNote,
    deleteNote
};
