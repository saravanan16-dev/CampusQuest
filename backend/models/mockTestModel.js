const db = require("../config/db");

const getAllMockTests = async (subjectId) => {
    let sql = `
        SELECT m.*, s.name as subject_name,
               (SELECT COUNT(*) FROM mock_test_questions WHERE mock_test_id = m.id) as question_count
        FROM mock_tests m
        JOIN subjects s ON m.subject_id = s.id
    `;
    const params = [];
    if (subjectId) {
        sql += " WHERE m.subject_id = ?";
        params.push(subjectId);
    }
    sql += " ORDER BY m.created_at DESC";
    const [rows] = await db.query(sql, params);
    return rows;
};

const getMockTestById = async (id) => {
    const [rows] = await db.query(`
        SELECT m.*, s.name as subject_name,
               (SELECT COUNT(*) FROM mock_test_questions WHERE mock_test_id = m.id) as question_count
        FROM mock_tests m
        JOIN subjects s ON m.subject_id = s.id
        WHERE m.id = ?
    `, [id]);
    return rows[0];
};

const getMockTestQuestions = async (mockTestId, includeAnswers = false) => {
    const [questions] = await db.query(`
        SELECT q.id, q.subject_id, q.unit, q.topic, q.question_text, q.difficulty, q.question_type,
               ${includeAnswers ? 'q.correct_answer, q.explanation,' : ''}
               mq.marks
        FROM mock_test_questions mq
        JOIN questions q ON mq.question_id = q.id
        WHERE mq.mock_test_id = ?
        ORDER BY mq.id ASC
    `, [mockTestId]);

    for (const q of questions) {
        const [options] = await db.query(
            "SELECT option_key, option_text FROM question_options WHERE question_id = ? ORDER BY option_key ASC",
            [q.id]
        );
        q.options = options;
    }

    return questions;
};

const createMockTest = async ({ title, subject_id, duration_minutes = 30, total_marks = 50, passing_marks = 25, description = "" }) => {
    const [result] = await db.query(
        `INSERT INTO mock_tests (title, subject_id, duration_minutes, total_marks, passing_marks, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, subject_id, duration_minutes, total_marks, passing_marks, description]
    );
    return result.insertId;
};

const addQuestionToMockTest = async (mock_test_id, question_id, marks = 1) => {
    const [result] = await db.query(
        "INSERT INTO mock_test_questions (mock_test_id, question_id, marks) VALUES (?, ?, ?)",
        [mock_test_id, question_id, marks]
    );
    return result.insertId;
};

const removeQuestionFromMockTest = async (mock_test_id, question_id) => {
    await db.query("DELETE FROM mock_test_questions WHERE mock_test_id = ? AND question_id = ?", [mock_test_id, question_id]);
};

const deleteMockTest = async (id) => {
    const [result] = await db.query("DELETE FROM mock_tests WHERE id = ?", [id]);
    return result;
};

const createTestAttempt = async ({ user_id, mock_test_id, total_marks }) => {
    const [result] = await db.query(
        `INSERT INTO test_attempts (user_id, mock_test_id, total_marks, status)
         VALUES (?, ?, ?, 'IN_PROGRESS')`,
        [user_id, mock_test_id, total_marks]
    );
    return result.insertId;
};

const getTestAttemptById = async (id) => {
    const [rows] = await db.query(`
        SELECT ta.*, m.title as test_title, m.duration_minutes, m.passing_marks, s.name as subject_name
        FROM test_attempts ta
        JOIN mock_tests m ON ta.mock_test_id = m.id
        JOIN subjects s ON m.subject_id = s.id
        WHERE ta.id = ?
    `, [id]);
    return rows[0];
};

const saveTestAnswer = async ({ attempt_id, question_id, selected_option, is_correct, marks_awarded }) => {
    const [result] = await db.query(
        `INSERT INTO test_answers (attempt_id, question_id, selected_option, is_correct, marks_awarded)
         VALUES (?, ?, ?, ?, ?)`,
        [attempt_id, question_id, selected_option, is_correct, marks_awarded]
    );
    return result.insertId;
};

const completeTestAttempt = async (id, { score, percentage, status = "COMPLETED" }) => {
    const [result] = await db.query(
        `UPDATE test_attempts
         SET end_time = CURRENT_TIMESTAMP,
             score = ?,
             percentage = ?,
             status = ?
         WHERE id = ?`,
        [score, percentage, status, id]
    );
    return result;
};

const getTestAnswersByAttemptId = async (attemptId) => {
    const [rows] = await db.query(`
        SELECT ta.*, q.question_text, q.correct_answer, q.explanation, q.topic
        FROM test_answers ta
        JOIN questions q ON ta.question_id = q.id
        WHERE ta.attempt_id = ?
        ORDER BY ta.id ASC
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

const getUserTestHistory = async (userId, limit = 10) => {
    const [rows] = await db.query(`
        SELECT ta.*, m.title as test_title, s.name as subject_name
        FROM test_attempts ta
        JOIN mock_tests m ON ta.mock_test_id = m.id
        JOIN subjects s ON m.subject_id = s.id
        WHERE ta.user_id = ?
        ORDER BY ta.start_time DESC
        LIMIT ?
    `, [userId, Number(limit)]);
    return rows;
};

module.exports = {
    getAllMockTests,
    getMockTestById,
    getMockTestQuestions,
    createMockTest,
    addQuestionToMockTest,
    removeQuestionFromMockTest,
    deleteMockTest,
    createTestAttempt,
    getTestAttemptById,
    saveTestAnswer,
    completeTestAttempt,
    getTestAnswersByAttemptId,
    getUserTestHistory
};
