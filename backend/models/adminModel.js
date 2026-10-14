const db = require("../config/db");

const getSystemAnalytics = async () => {
    const [[users]] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'STUDENT'");
    const [[subjects]] = await db.query("SELECT COUNT(*) as count FROM subjects");
    const [[units]] = await db.query("SELECT COUNT(*) as count FROM units");
    const [[notes]] = await db.query("SELECT COUNT(*) as count FROM notes");
    const [[questions]] = await db.query("SELECT COUNT(*) as count FROM questions");
    const [[pyqs]] = await db.query("SELECT COUNT(*) as count FROM pyqs");
    const [[mockTests]] = await db.query("SELECT COUNT(*) as count FROM mock_tests");
    const [[practiceAttempts]] = await db.query("SELECT COUNT(*) as count FROM practice_attempts");
    const [[testAttempts]] = await db.query("SELECT COUNT(*) as count FROM test_attempts WHERE status = 'COMPLETED'");
    const [[activeToday]] = await db.query("SELECT COUNT(DISTINCT user_id) AS count FROM practice_attempts WHERE DATE(completed_at) = CURDATE()");
    const [[answered]] = await db.query("SELECT COUNT(*) AS count FROM practice_answers");
    const [[accuracyData]] = await db.query(`
        SELECT 
            COALESCE(SUM(questions_attempted), 0) as total_attempted,
            COALESCE(SUM(questions_correct), 0) as total_correct
        FROM user_progress
    `);

    const totalAttempted = Number(accuracyData.total_attempted);
    const totalCorrect = Number(accuracyData.total_correct);
    const systemAccuracy = totalAttempted > 0 ? Number(((totalCorrect / totalAttempted) * 100).toFixed(2)) : 0;

    // Recent user signups
    const [recentUsers] = await db.query(`
        SELECT id, username, name, email, role, created_at 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
    `);

    // Popular subjects
    const [popularSubjects] = await db.query(`
        SELECT s.name, COUNT(p.id) as practice_count
        FROM subjects s
        LEFT JOIN practice_attempts p ON s.id = p.subject_id
        GROUP BY s.id, s.name
        ORDER BY practice_count DESC
        LIMIT 5
    `);

    return {
        total_students: users.count,
        total_subjects: subjects.count,
        total_units: units.count,
        total_notes: notes.count,
        total_questions: questions.count,
        total_pyqs: pyqs.count,
        total_mock_tests: mockTests.count,
        total_practice_sessions: practiceAttempts.count,
        total_mock_tests_taken: testAttempts.count,
        active_today: activeToday.count,
        questions_answered: answered.count,
        system_overall_accuracy: systemAccuracy,
        recent_users: recentUsers,
        popular_subjects: popularSubjects
    };
};

module.exports = {
    getSystemAnalytics
};
