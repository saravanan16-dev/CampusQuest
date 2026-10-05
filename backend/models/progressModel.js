const db = require("../config/db");

const getUserSubjectProgress = async (userId) => {
    const [rows] = await db.query(`
        SELECT up.*, s.name as subject_name, s.semester
        FROM user_progress up
        JOIN subjects s ON up.subject_id = s.id
        WHERE up.user_id = ?
        ORDER BY up.accuracy DESC
    `, [userId]);
    return rows;
};

const upsertUserProgress = async ({ user_id, subject_id, additional_attempted, additional_correct }) => {
    const [existing] = await db.query(
        "SELECT * FROM user_progress WHERE user_id = ? AND subject_id = ?",
        [user_id, subject_id]
    );

    if (existing.length === 0) {
        const attempted = additional_attempted;
        const correct = additional_correct;
        const accuracy = attempted > 0 ? ((correct / attempted) * 100).toFixed(2) : 0;

        await db.query(
            `INSERT INTO user_progress (user_id, subject_id, questions_attempted, questions_correct, accuracy)
             VALUES (?, ?, ?, ?, ?)`,
            [user_id, subject_id, attempted, correct, accuracy]
        );
    } else {
        const attempted = existing[0].questions_attempted + additional_attempted;
        const correct = existing[0].questions_correct + additional_correct;
        const accuracy = attempted > 0 ? ((correct / attempted) * 100).toFixed(2) : 0;

        await db.query(
            `UPDATE user_progress 
             SET questions_attempted = ?,
                 questions_correct = ?,
                 accuracy = ?
             WHERE id = ?`,
            [attempted, correct, accuracy, existing[0].id]
        );
    }
};

const getUserTopicPerformance = async (userId) => {
    // Combine answers from practice_answers and test_answers linked to questions
    const [topicStats] = await db.query(`
        SELECT 
            q.subject_id,
            s.name as subject_name,
            q.unit,
            q.topic,
            COUNT(pa.id) as attempts,
            SUM(CASE WHEN pa.is_correct = 1 THEN 1 ELSE 0 END) as correct,
            ROUND((SUM(CASE WHEN pa.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(pa.id)) * 100, 2) as accuracy
        FROM practice_answers pa
        JOIN practice_attempts p ON pa.practice_attempt_id = p.id
        JOIN questions q ON pa.question_id = q.id
        JOIN subjects s ON q.subject_id = s.id
        WHERE p.user_id = ?
        GROUP BY q.subject_id, s.name, q.unit, q.topic
        ORDER BY accuracy ASC
    `, [userId]);

    const weakTopics = topicStats.filter(t => t.accuracy < 60);
    const strongTopics = topicStats.filter(t => t.accuracy >= 80);

    return {
        allTopics: topicStats,
        weakTopics,
        strongTopics
    };
};

const getUserOverallStats = async (userId) => {
    // Overall questions & accuracy from user_progress
    const [progressSummary] = await db.query(`
        SELECT 
            COALESCE(SUM(questions_attempted), 0) as total_attempted,
            COALESCE(SUM(questions_correct), 0) as total_correct
        FROM user_progress
        WHERE user_id = ?
    `, [userId]);

    const attempted = Number(progressSummary[0]?.total_attempted || 0);
    const correct = Number(progressSummary[0]?.total_correct || 0);
    const overallAccuracy = attempted > 0 ? Number(((correct / attempted) * 100).toFixed(2)) : 0;

    // Practice sessions completed
    const [practiceCount] = await db.query(
        "SELECT COUNT(*) as count FROM practice_attempts WHERE user_id = ?",
        [userId]
    );

    // Mock tests completed
    const [testStats] = await db.query(`
        SELECT 
            COUNT(*) as tests_completed,
            COALESCE(AVG(percentage), 0) as average_test_score
        FROM test_attempts
        WHERE user_id = ? AND status = 'COMPLETED'
    `, [userId]);

    return {
        questions_attempted: attempted,
        questions_correct: correct,
        overall_accuracy: overallAccuracy,
        practice_sessions: practiceCount[0].count,
        tests_completed: testStats[0].tests_completed,
        average_test_score: Number(Number(testStats[0]?.average_test_score || 0).toFixed(2))
    };
};

module.exports = {
    getUserSubjectProgress,
    upsertUserProgress,
    getUserTopicPerformance,
    getUserOverallStats
};
