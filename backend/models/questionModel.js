const db = require("../config/db");

const getQuestions = async ({ subject_id, unit, difficulty, topic, limit = 50 }) => {
    let sql = `
        SELECT q.*, s.name as subject_name 
        FROM questions q
        JOIN subjects s ON q.subject_id = s.id
        WHERE 1=1
    `;
    const params = [];
    if (subject_id) {
        sql += " AND q.subject_id = ?";
        params.push(subject_id);
    }
    if (unit) {
        sql += " AND q.unit = ?";
        params.push(unit);
    }
    if (difficulty) {
        sql += " AND q.difficulty = ?";
        params.push(difficulty);
    }
    if (topic) {
        sql += " AND q.topic LIKE ?";
        params.push(`%${topic}%`);
    }

    sql += " ORDER BY q.id DESC LIMIT ?";
    params.push(Number(limit));

    const [questions] = await db.query(sql, params);

    // Fetch options for all returned questions
    for (const q of questions) {
        const [options] = await db.query(
            "SELECT option_key, option_text FROM question_options WHERE question_id = ? ORDER BY option_key ASC",
            [q.id]
        );
        q.options = options;
    }

    return questions;
};

const getQuestionById = async (id) => {
    const [rows] = await db.query(`
        SELECT q.*, s.name as subject_name 
        FROM questions q
        JOIN subjects s ON q.subject_id = s.id
        WHERE q.id = ?
    `, [id]);

    if (rows.length === 0) return null;
    const question = rows[0];

    const [options] = await db.query(
        "SELECT id, option_key, option_text FROM question_options WHERE question_id = ? ORDER BY option_key ASC",
        [id]
    );
    question.options = options;

    return question;
};

const getQuestionsForPractice = async ({ subject_id, unit, difficulty, count = 10 }) => {
    let sql = "SELECT id, subject_id, unit, topic, question_text, difficulty, question_type FROM questions WHERE subject_id = ?";
    const params = [subject_id];

    if (unit) {
        sql += " AND unit = ?";
        params.push(unit);
    }
    if (difficulty) {
        sql += " AND difficulty = ?";
        params.push(difficulty);
    }

    sql += " ORDER BY RAND() LIMIT ?";
    params.push(Number(count));

    const [questions] = await db.query(sql, params);

    for (const q of questions) {
        const [options] = await db.query(
            "SELECT option_key, option_text FROM question_options WHERE question_id = ? ORDER BY option_key ASC",
            [q.id]
        );
        q.options = options;
    }

    return questions;
};

const createQuestion = async ({ subject_id, unit, topic, question_text, difficulty = "MEDIUM", question_type = "MCQ", correct_answer, explanation = "" }) => {
    const [result] = await db.query(
        `INSERT INTO questions (subject_id, unit, topic, question_text, difficulty, question_type, correct_answer, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [subject_id, unit, topic, question_text, difficulty, question_type, correct_answer, explanation]
    );
    return result.insertId;
};

const addOption = async (question_id, option_key, option_text) => {
    const [result] = await db.query(
        "INSERT INTO question_options (question_id, option_key, option_text) VALUES (?, ?, ?)",
        [question_id, option_key, option_text]
    );
    return result.insertId;
};

const deleteOptionsByQuestionId = async (question_id) => {
    await db.query("DELETE FROM question_options WHERE question_id = ?", [question_id]);
};

const updateQuestion = async (id, { unit, topic, question_text, difficulty, correct_answer, explanation }) => {
    const [result] = await db.query(
        `UPDATE questions 
         SET unit = COALESCE(?, unit),
             topic = COALESCE(?, topic),
             question_text = COALESCE(?, question_text),
             difficulty = COALESCE(?, difficulty),
             correct_answer = COALESCE(?, correct_answer),
             explanation = COALESCE(?, explanation)
         WHERE id = ?`,
        [unit, topic, question_text, difficulty, correct_answer, explanation, id]
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
