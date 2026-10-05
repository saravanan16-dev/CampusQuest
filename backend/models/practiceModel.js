const db = require("../config/db");

const createPracticeAttempt = async ({ user_id, subject_id, unit, difficulty, total_questions }) => {
    const [result] = await db.query(
        `INSERT INTO practice_attempts (user_id, subject_id, unit, difficulty, total_questions)
         VALUES (?, ?, ?, ?, ?)`,
        [user_id, subject_id, unit, difficulty, total_questions]
    );
    return result.insertId;
};

const savePracticeAnswer = async ({ practice_attempt_id, question_id, selected_option, is_correct }) => {
    const [result] = await db.query(
        `INSERT INTO practice_answers (practice_attempt_id, question_id, selected_option, is_correct)
         VALUES (?, ?, ?, ?)`,
        [practice_attempt_id, question_id, selected_option, is_correct]
    );
    return result.insertId;
};

const updatePracticeAttempt = async (id, { correct_answers, incorrect_answers, accuracy, time_taken_seconds, xp_earned }) => {
    const [result] = await db.query(
        `UPDATE practice_attempts 
         SET correct_answers = ?,
             incorrect_answers = ?,
             accuracy = ?,
             time_taken_seconds = ?,
             xp_earned = ?
         WHERE id = ?`,
        [correct_answers, incorrect_answers, accuracy, time_taken_seconds, xp_earned, id]
    );
    return result;
};

const getPracticeAttemptById = async (id) => {
    const [rows] = await db.query(`
        SELECT p.*, s.name as subject_name 
        FROM practice_attempts p
        JOIN subjects s ON p.subject_id = s.id
        WHERE p.id = ?
    `, [id]);
    return rows[0];
};

const getPracticeAnswersByAttemptId = async (attemptId) => {
    const [rows] = await db.query(`
        SELECT pa.*, q.question_text, q.correct_answer, q.explanation, q.topic, q.difficulty
        FROM practice_answers pa
        JOIN questions q ON pa.question_id = q.id
        WHERE pa.practice_attempt_id = ?
        ORDER BY pa.id ASC
    `, [attemptId]);

    for (const ans of rows) {
        const [options] = await db.query(
            "SELECT option_key, option_text FROM question_options WHERE question_id = ? ORDER BY option_key ASC",
            [ans.question_id]
        );
        ans.options = options;
    }

    return rows;
};

const getUserPracticeHistory = async (userId, limit = 10) => {
    const [rows] = await db.query(`
        SELECT p.*, s.name as subject_name 
        FROM practice_attempts p
        JOIN subjects s ON p.subject_id = s.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
        LIMIT ?
    `, [userId, Number(limit)]);
    return rows;
};

module.exports = {
    createPracticeAttempt,
    savePracticeAnswer,
    updatePracticeAttempt,
    getPracticeAttemptById,
    getPracticeAnswersByAttemptId,
    getUserPracticeHistory
};
