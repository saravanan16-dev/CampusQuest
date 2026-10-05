const db = require("../config/db");

const getQuestions = async ({ subject_id, unit_id, unit, difficulty, topic, limit = 50 } = {}) => {
    let sql = `
        SELECT q.*, s.name as subject_name, u.name as unit_name, u.unit_number 
        FROM questions q
        JOIN subjects s ON q.subject_id = s.id
        LEFT JOIN units u ON q.unit_id = u.id
        WHERE 1=1
    `;
    const params = [];
    if (subject_id) {
        sql += " AND q.subject_id = ?";
        params.push(subject_id);
    }
    if (unit_id) {
        sql += " AND q.unit_id = ?";
        params.push(unit_id);
    }
    if (unit) {
        sql += " AND (q.unit = ? OR u.unit_number = ?)";
        params.push(unit, unit);
    }
    if (difficulty) {
        sql += " AND LOWER(q.difficulty) = LOWER(?)";
        params.push(difficulty);
    }
    if (topic) {
        sql += " AND q.topic LIKE ?";
        params.push(`%${topic}%`);
    }

    sql += " ORDER BY q.id DESC LIMIT ?";
    params.push(Number(limit));

    const [questions] = await db.query(sql, params);

    // Fetch options with is_correct
    for (const q of questions) {
        const [options] = await db.query(
            "SELECT id, question_id, option_key, option_text, is_correct FROM question_options WHERE question_id = ? ORDER BY option_key ASC, id ASC",
            [q.id]
        );
        q.options = options.map(o => ({
            ...o,
            is_correct: Boolean(o.is_correct)
        }));
        // Ensure question property is defined
        if (!q.question && q.question_text) {
            q.question = q.question_text;
        }
    }

    return questions;
};

const getQuestionById = async (id) => {
    const [rows] = await db.query(`
        SELECT q.*, s.name as subject_name, u.name as unit_name, u.unit_number 
        FROM questions q
        JOIN subjects s ON q.subject_id = s.id
        LEFT JOIN units u ON q.unit_id = u.id
        WHERE q.id = ?
    `, [id]);

    if (rows.length === 0) return null;
    const question = rows[0];

    const [options] = await db.query(
        "SELECT id, question_id, option_key, option_text, is_correct FROM question_options WHERE question_id = ? ORDER BY option_key ASC, id ASC",
        [id]
    );
    question.options = options.map(o => ({
        ...o,
        is_correct: Boolean(o.is_correct)
    }));
    if (!question.question && question.question_text) {
        question.question = question.question_text;
    }

    return question;
};

const getQuestionsForPractice = async ({ subject_id, unit_id, unit, difficulty, count = 10 }) => {
    let sql = `
        SELECT q.id, q.subject_id, q.unit_id, q.unit, q.topic, q.question, q.question_text, q.difficulty, q.question_type 
        FROM questions q
        WHERE q.subject_id = ?
    `;
    const params = [subject_id];

    if (unit_id) {
        sql += " AND q.unit_id = ?";
        params.push(unit_id);
    }
    if (unit) {
        sql += " AND q.unit = ?";
        params.push(unit);
    }
    if (difficulty) {
        sql += " AND LOWER(q.difficulty) = LOWER(?)";
        params.push(difficulty);
    }

    sql += " ORDER BY RAND() LIMIT ?";
    params.push(Number(count));

    const [questions] = await db.query(sql, params);

    for (const q of questions) {
        const [options] = await db.query(
            "SELECT id, question_id, option_key, option_text, is_correct FROM question_options WHERE question_id = ? ORDER BY option_key ASC, id ASC",
            [q.id]
        );
        // Return options without is_correct during active practice test
        q.options = options.map(o => ({
            id: o.id,
            question_id: o.question_id,
            option_key: o.option_key,
            option_text: o.option_text
        }));
        if (!q.question && q.question_text) {
            q.question = q.question_text;
        }
    }

    return questions;
};

const createQuestion = async ({ subject_id, unit_id, unit, topic = "General", question, question_text, difficulty = "MEDIUM", question_type = "MCQ", correct_answer = "A", explanation = "" }) => {
    const qText = question || question_text || "";
    let unitNum = unit || 1;

    if (unit_id && !unit) {
        const [uRow] = await db.query("SELECT unit_number FROM units WHERE id = ?", [unit_id]);
        if (uRow.length > 0) unitNum = uRow[0].unit_number;
    } else if (unit && !unit_id && subject_id) {
        const [uRow] = await db.query("SELECT id FROM units WHERE subject_id = ? AND unit_number = ?", [subject_id, unit]);
        if (uRow.length > 0) unit_id = uRow[0].id;
    }

    const [result] = await db.query(
        `INSERT INTO questions (subject_id, unit_id, unit, topic, question, question_text, difficulty, question_type, correct_answer, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [subject_id, unit_id || null, unitNum, topic, qText, qText, difficulty.toUpperCase(), question_type, correct_answer, explanation]
    );
    return result.insertId;
};

const addOption = async (question_id, option_key, option_text, is_correct = false) => {
    const [result] = await db.query(
        "INSERT INTO question_options (question_id, option_key, option_text, is_correct) VALUES (?, ?, ?, ?)",
        [question_id, option_key, option_text, is_correct ? 1 : 0]
    );
    return result.insertId;
};

const deleteOptionsByQuestionId = async (question_id) => {
    await db.query("DELETE FROM question_options WHERE question_id = ?", [question_id]);
};

const updateQuestion = async (id, { unit_id, unit, topic, question, question_text, difficulty, correct_answer, explanation }) => {
    const qText = question || question_text;
    const [result] = await db.query(
        `UPDATE questions 
         SET unit_id = COALESCE(?, unit_id),
             unit = COALESCE(?, unit),
             topic = COALESCE(?, topic),
             question = COALESCE(?, question),
             question_text = COALESCE(?, question_text),
             difficulty = COALESCE(?, difficulty),
             correct_answer = COALESCE(?, correct_answer),
             explanation = COALESCE(?, explanation)
         WHERE id = ?`,
        [unit_id, unit, topic, qText, qText, difficulty, correct_answer, explanation, id]
    );
    return result;
};

const deleteQuestion = async (id) => {
    const [result] = await db.query("DELETE FROM questions WHERE id = ?", [id]);
    return result;
};

module.exports = {
    getQuestions,
    getQuestionById,
    getQuestionsForPractice,
    createQuestion,
    addOption,
    deleteOptionsByQuestionId,
    updateQuestion,
    deleteQuestion
};
