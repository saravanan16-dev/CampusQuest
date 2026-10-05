const db = require("../config/db");

const getUnits = async (subject_id) => {
    let sql = `
        SELECT u.*, s.name as subject_name 
        FROM units u
        JOIN subjects s ON u.subject_id = s.id
    `;
    const params = [];
    if (subject_id) {
        sql += " WHERE u.subject_id = ?";
        params.push(subject_id);
    }
    sql += " ORDER BY u.subject_id ASC, u.unit_number ASC";
    const [rows] = await db.query(sql, params);
    return rows;
};

const getUnitById = async (id) => {
    const [rows] = await db.query(`
        SELECT u.*, s.name as subject_name 
        FROM units u
        JOIN subjects s ON u.subject_id = s.id
        WHERE u.id = ?
    `, [id]);
    return rows[0];
};

const getUnitsBySubjectId = async (subject_id) => {
    const [rows] = await db.query(`
        SELECT u.*, s.name as subject_name,
               (SELECT COUNT(*) FROM notes WHERE unit_id = u.id) as notes_count
        FROM units u
        JOIN subjects s ON u.subject_id = s.id
        WHERE u.subject_id = ?
        ORDER BY u.unit_number ASC
    `, [subject_id]);
    return rows;
};

const createUnit = async ({ subject_id, unit_number, name }) => {
    const [result] = await db.query(
        "INSERT INTO units (subject_id, unit_number, name) VALUES (?, ?, ?)",
        [subject_id, unit_number, name]
    );
    return result.insertId;
};

const updateUnit = async (id, { unit_number, name }) => {
    const [result] = await db.query(
        "UPDATE units SET unit_number = COALESCE(?, unit_number), name = COALESCE(?, name) WHERE id = ?",
        [unit_number, name, id]
    );
    return result;
};

const deleteUnit = async (id) => {
    const [result] = await db.query("DELETE FROM units WHERE id = ?", [id]);
    return result;
};

module.exports = {
    getUnits,
    getUnitById,
    getUnitsBySubjectId,
    createUnit,
    updateUnit,
    deleteUnit
};
