const db = require("../config/db");

const createPracticeAttempt = async ({ user_id, subject_id, unit_id, unit, difficulty, total_questions }) => {
    let resolvedUnit = unit || null;
    let resolvedUnitId = unit_id || null;

    if (resolvedUnitId && !resolvedUnit) {
        const [uRow] = await db.query("SELECT unit_number FROM units WHERE id = ?", [resolvedUnitId]);
        if (uRow.length > 0) resolvedUnit = uRow[0].unit_number;
    } else if (resolvedUnit && !resolvedUnitId && subject_id) {
        const [uRow] = await db.query("SELECT id FROM units WHERE subject_id = ? AND unit_number = ?", [subject_id, resolvedUnit]);
        if (uRow.length > 0) resolvedUnitId = uRow[0].id;
    }

    const [result] = await db.query(
        `INSERT INTO practice_attempts (user_id, subject_id, unit_id, unit, difficulty, total_questions, score)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [user_id, subject_id, resolvedUnitId, resolvedUnit, difficulty || "ALL", total_questions || 0]
    );
    return result.insertId;
};

const savePracticeAnswer = async ({ practice_attempt_id, attempt_id, question_id, selected_option_id, selected_option, is_correct }) => {
    const aid = practice_attempt_id || attempt_id;
    const [result] = await db.query(
        `INSERT INTO practice_answers (practice_attempt_id, attempt_id, question_id, selected_option_id, selected_option, is_correct)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [aid, aid, question_id, selected_option_id || null, selected_option ? String(selected_option) : null, is_correct ? 1 : 0]
    );
    return result.insertId;
};

const updatePracticeAttempt = async (id, { score, total_questions, correct_answers, incorrect_answers, accuracy, time_taken_seconds, xp_earned }) => {
    const finalScore = score !== undefined ? score : (correct_answers !== undefined ? correct_answers : 0);
    const [result] = await db.query(
        `UPDATE practice_attempts 
         SET score = ?,
             correct_answers = ?,
             incorrect_answers = ?,
             total_questions = COALESCE(?, total_questions),
             accuracy = ?,
             time_taken_seconds = ?,
             xp_earned = ?,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [finalScore, correct_answers || 0, incorrect_answers || 0, total_questions, accuracy || 0, time_taken_seconds || 0, xp_earned || 0, id]
    );
    return result;
};

const getPracticeAttemptById = async (id) => {
    const [rows] = await db.query(`
        SELECT p.*, s.name as subject_name,
               u.name as unit_name, u.unit_number 
        FROM practice_attempts p
        JOIN subjects s ON p.subject_id = s.id
        LEFT JOIN units u ON p.unit_id = u.id
        WHERE p.id = ?
    `, [id]);
    return rows[0];
};

const getPracticeAnswersByAttemptId = async (attemptId) => {
    const [rows] = await db.query(`
        SELECT pa.*, 
               q.question, q.question_text, q.correct_answer, q.explanation, q.topic, q.difficulty,
               qo.option_text as selected_option_text, qo.option_key as selected_option_key
        FROM practice_answers pa
        JOIN questions q ON pa.question_id = q.id
        LEFT JOIN question_options qo ON pa.selected_option_id = qo.id
        WHERE (pa.practice_attempt_id = ? OR pa.attempt_id = ?)
        ORDER BY pa.id ASC
    `, [attemptId, attemptId]);

    for (const ans of rows) {
        if (!ans.question && ans.question_text) ans.question = ans.question_text;
        const [options] = await db.query(
            "SELECT id, question_id, option_key, option_text, is_correct FROM question_options WHERE question_id = ? ORDER BY option_key ASC, id ASC",
            [ans.question_id]
        );
        ans.options = options;

        const correctOpt = options.find(o => o.is_correct === 1 || o.is_correct === true || o.option_key === ans.correct_answer);
        ans.correct_option_text = correctOpt ? correctOpt.option_text : ans.correct_answer;

        if (!ans.selected_option && ans.selected_option_key) {
            ans.selected_option = ans.selected_option_key;
        }
        if (!ans.selected_option_text && ans.selected_option) {
            const foundSelected = options.find(o => o.option_key === ans.selected_option || o.option_text === ans.selected_option);
            if (foundSelected) ans.selected_option_text = foundSelected.option_text;
        }
    }

    return rows;
};

const getUserPracticeHistory = async (userId, limit = 20) => {
    const [rows] = await db.query(`
        SELECT p.*, s.name as subject_name,
               u.name as unit_name, u.unit_number 
        FROM practice_attempts p
        JOIN subjects s ON p.subject_id = s.id
        LEFT JOIN units u ON p.unit_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.completed_at DESC, p.created_at DESC
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
