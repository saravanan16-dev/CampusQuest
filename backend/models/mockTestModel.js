const db = require("../config/db");

const getAllMockTests = async (subjectId) => {
    let sql = `
        SELECT m.*, s.name as subject_name,
               COALESCE((SELECT COUNT(*) FROM mock_test_questions WHERE mock_test_id = m.id), 0) as question_count
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

    for (const r of rows) {
        if (!r.duration && r.duration_minutes) r.duration = r.duration_minutes;
        if (!r.total_questions) r.total_questions = r.question_count;
    }
    return rows;
};

const getMockTestById = async (id) => {
    const [rows] = await db.query(`
        SELECT m.*, s.name as subject_name,
               COALESCE((SELECT COUNT(*) FROM mock_test_questions WHERE mock_test_id = m.id), 0) as question_count
        FROM mock_tests m
        JOIN subjects s ON m.subject_id = s.id
        WHERE m.id = ?
    `, [id]);

    if (rows.length === 0) return null;
    const test = rows[0];
    if (!test.duration && test.duration_minutes) test.duration = test.duration_minutes;
    if (!test.total_questions) test.total_questions = test.question_count;
    return test;
};

const getMockTestQuestions = async (mockTestId, includeAnswers = false) => {
    const [questions] = await db.query(`
        SELECT q.id, q.subject_id, q.unit_id, q.unit, q.topic, q.question, q.question_text, q.difficulty, q.question_type,
               ${includeAnswers ? 'q.correct_answer, q.explanation,' : ''}
               COALESCE(mq.marks, 1) as marks
        FROM mock_test_questions mq
        JOIN questions q ON mq.question_id = q.id
        WHERE mq.mock_test_id = ?
        ORDER BY mq.id ASC
    `, [mockTestId]);

    for (const q of questions) {
        if (!q.question && q.question_text) q.question = q.question_text;
        const [options] = await db.query(
            "SELECT id, question_id, option_key, option_text FROM question_options WHERE question_id = ? ORDER BY option_key ASC, id ASC",
            [q.id]
        );
        q.options = options;
    }

    return questions;
};

const createMockTest = async ({ title, subject_id, duration = 30, duration_minutes = 30, total_questions = 0, total_marks = 20, passing_marks = 10, description = "" }) => {
    const dur = duration || duration_minutes || 30;
    const [result] = await db.query(
        `INSERT INTO mock_tests (title, subject_id, duration, duration_minutes, total_questions, total_marks, passing_marks, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, subject_id, dur, dur, total_questions || 0, total_marks, passing_marks, description]
    );
    return result.insertId;
};

const addQuestionToMockTest = async (mock_test_id, question_id, marks = 1) => {
    const [result] = await db.query(
        "INSERT INTO mock_test_questions (mock_test_id, question_id, marks) VALUES (?, ?, ?)",
        [mock_test_id, question_id, marks]
    );
    // Update total_questions on mock_test
    await db.query(
        "UPDATE mock_tests SET total_questions = (SELECT COUNT(*) FROM mock_test_questions WHERE mock_test_id = ?) WHERE id = ?",
        [mock_test_id, mock_test_id]
    );
    return result.insertId;
};

const removeQuestionFromMockTest = async (mock_test_id, question_id) => {
    await db.query("DELETE FROM mock_test_questions WHERE mock_test_id = ? AND question_id = ?", [mock_test_id, question_id]);
    await db.query(
        "UPDATE mock_tests SET total_questions = (SELECT COUNT(*) FROM mock_test_questions WHERE mock_test_id = ?) WHERE id = ?",
        [mock_test_id, mock_test_id]
    );
};

const deleteMockTest = async (id) => {
    const [result] = await db.query("DELETE FROM mock_tests WHERE id = ?", [id]);
    return result;
};

const updateMockTest = async (id, { title, subject_id, duration_minutes, total_marks, passing_marks, description }) => {
    const [result] = await db.query(
        `UPDATE mock_tests SET title = COALESCE(?, title), subject_id = COALESCE(?, subject_id),
         duration_minutes = COALESCE(?, duration_minutes), total_marks = COALESCE(?, total_marks),
         passing_marks = COALESCE(?, passing_marks), description = COALESCE(?, description) WHERE id = ?`,
        [title, subject_id, duration_minutes, total_marks, passing_marks, description, id]
    );
    return result;
};

const createTestAttempt = async ({ user_id, mock_test_id, total_marks, total_questions }) => {
    const [result] = await db.query(
        `INSERT INTO test_attempts (user_id, mock_test_id, total_marks, total_questions, score, started_at, start_time, status)
         VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'IN_PROGRESS')`,
        [user_id, mock_test_id, total_marks, total_questions || 0]
    );
    return result.insertId;
};

const getTestAttemptById = async (id) => {
    const [rows] = await db.query(`
        SELECT ta.*, m.title as test_title, m.duration, m.duration_minutes, m.total_marks as test_total_marks, m.passing_marks, s.name as subject_name
        FROM test_attempts ta
        JOIN mock_tests m ON ta.mock_test_id = m.id
        JOIN subjects s ON m.subject_id = s.id
        WHERE ta.id = ?
    `, [id]);
    return rows[0];
};

const saveTestAnswer = async ({ attempt_id, question_id, selected_option_id, selected_option, is_correct, marks_awarded }) => {
    const [result] = await db.query(
        `INSERT INTO test_answers (attempt_id, question_id, selected_option_id, selected_option, is_correct, marks_awarded)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [attempt_id, question_id, selected_option_id || null, selected_option ? String(selected_option) : null, is_correct ? 1 : 0, marks_awarded || 0]
    );
    return result.insertId;
};

const completeTestAttempt = async (id, { score, total_marks, total_questions, percentage, correct_answers, wrong_answers, unanswered, time_used_seconds, status = "COMPLETED" }) => {
    const [result] = await db.query(
        `UPDATE test_attempts
         SET score = ?,
             total_marks = COALESCE(?, total_marks),
             total_questions = COALESCE(?, total_questions),
             percentage = ?,
             correct_answers = ?,
             wrong_answers = ?,
             unanswered = ?,
             time_used_seconds = ?,
             completed_at = CURRENT_TIMESTAMP,
             end_time = CURRENT_TIMESTAMP,
             status = ?
         WHERE id = ?`,
        [score, total_marks, total_questions, percentage, correct_answers, wrong_answers, unanswered, time_used_seconds || 0, status, id]
    );
    return result;
};

const getTestAnswersByAttemptId = async (attemptId) => {
    const [rows] = await db.query(`
        SELECT ta.*, 
               q.question, q.question_text, q.correct_answer, q.explanation, q.topic,
               qo.option_text as selected_option_text, qo.option_key as selected_option_key
        FROM test_answers ta
        JOIN questions q ON ta.question_id = q.id
        LEFT JOIN question_options qo ON ta.selected_option_id = qo.id
        WHERE ta.attempt_id = ?
        ORDER BY ta.id ASC
    `, [attemptId]);

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

const getUserTestHistory = async (userId, limit = 20) => {
    const [rows] = await db.query(`
        SELECT ta.*, m.title as test_title, s.name as subject_name
        FROM test_attempts ta
        JOIN mock_tests m ON ta.mock_test_id = m.id
        JOIN subjects s ON m.subject_id = s.id
        WHERE ta.user_id = ?
        ORDER BY COALESCE(ta.completed_at, ta.end_time, ta.started_at, ta.start_time) DESC
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
    updateMockTest,
    createTestAttempt,
    getTestAttemptById,
    saveTestAnswer,
    completeTestAttempt,
    getTestAnswersByAttemptId,
    getUserTestHistory
};
