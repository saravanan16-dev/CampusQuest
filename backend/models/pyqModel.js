const db = require("../config/db");

const getPYQs = async ({ subject_id, unit_id, year, marks, regulation, exam_type, semester } = {}) => {
    let sql = `
        SELECT p.*, s.name as subject_name, s.semester as subject_semester,
               u.name as unit_name, u.unit_number 
        FROM pyqs p
        JOIN subjects s ON p.subject_id = s.id
        LEFT JOIN units u ON p.unit_id = u.id
        WHERE 1=1
    `;
    const params = [];

    if (subject_id) {
        sql += " AND p.subject_id = ?";
        params.push(subject_id);
    }
    if (unit_id) {
        sql += " AND p.unit_id = ?";
        params.push(unit_id);
    }
    if (year) {
        sql += " AND p.year = ?";
        params.push(Number(year));
    }
    if (marks) {
        sql += " AND p.marks = ?";
        params.push(Number(marks));
    }
    if (regulation) {
        sql += " AND p.regulation = ?";
        params.push(regulation);
    }
    if (exam_type) {
        sql += " AND LOWER(p.exam_type) = LOWER(?)";
        params.push(exam_type);
    }
    if (semester) {
        sql += " AND p.semester = ?";
        params.push(Number(semester));
    }

    sql += " ORDER BY p.year DESC, p.unit_id ASC, p.id DESC";
    const [rows] = await db.query(sql, params);

    // Normalize question text if question is empty but title exists
    for (const row of rows) {
        if (!row.question && row.title) {
            row.question = row.title;
        }
    }

    return rows;
};

const getPYQById = async (id) => {
    const [rows] = await db.query(`
        SELECT p.*, s.name as subject_name, s.semester as subject_semester,
               u.name as unit_name, u.unit_number 
        FROM pyqs p
        JOIN subjects s ON p.subject_id = s.id
        LEFT JOIN units u ON p.unit_id = u.id
        WHERE p.id = ?
    `, [id]);

    if (rows.length === 0) return null;
    const pyq = rows[0];
    if (!pyq.question && pyq.title) {
        pyq.question = pyq.title;
    }
    return pyq;
};

const createPYQ = async ({ subject_id, unit_id, question, year, exam_type = "Regular", regulation = "2021", marks = 13, question_number, title, file_url, semester }) => {
    let finalTitle = title || (question ? question.slice(0, 100) : "Previous Year Question");
    let finalSemester = semester || null;

    if (!finalSemester && subject_id) {
        const [sRows] = await db.query("SELECT semester FROM subjects WHERE id = ?", [subject_id]);
        if (sRows.length > 0) finalSemester = sRows[0].semester;
    }

    const [result] = await db.query(
        `INSERT INTO pyqs (subject_id, unit_id, question, year, exam_type, regulation, marks, question_number, title, file_url, semester)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            subject_id,
            unit_id || null,
            question || finalTitle,
            Number(year),
            exam_type || "Regular",
            regulation || "2021",
            marks !== undefined ? Number(marks) : 13,
            question_number || null,
            finalTitle,
            file_url || null,
            finalSemester || 1
        ]
    );
    return result.insertId;
};

const updatePYQ = async (id, { subject_id, unit_id, question, year, exam_type, regulation, marks, question_number, title, file_url, semester }) => {
    const [result] = await db.query(
        `UPDATE pyqs 
         SET subject_id = COALESCE(?, subject_id),
             unit_id = COALESCE(?, unit_id),
             question = COALESCE(?, question),
             year = COALESCE(?, year),
             exam_type = COALESCE(?, exam_type),
             regulation = COALESCE(?, regulation),
             marks = COALESCE(?, marks),
             question_number = COALESCE(?, question_number),
             title = COALESCE(?, title),
             file_url = COALESCE(?, file_url),
             semester = COALESCE(?, semester)
         WHERE id = ?`,
        [subject_id, unit_id, question, year, exam_type, regulation, marks, question_number, title, file_url, semester, id]
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
