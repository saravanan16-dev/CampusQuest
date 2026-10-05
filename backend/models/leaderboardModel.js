const db = require("../config/db");

const getOverallLeaderboard = async (limit = 20) => {
    const [rows] = await db.query(`
        SELECT 
            u.id as user_id,
            u.username,
            u.name,
            COALESCE(SUM(x.amount), 0) as total_xp,
            s.current_streak,
            (SELECT COUNT(*) FROM user_achievements WHERE user_id = u.id) as achievements_count
        FROM users u
        LEFT JOIN xp_transactions x ON u.id = x.user_id
        LEFT JOIN streaks s ON u.id = s.user_id
        WHERE u.role = 'STUDENT'
        GROUP BY u.id, u.username, u.name, s.current_streak
        ORDER BY total_xp DESC, achievements_count DESC
        LIMIT ?
    `, [Number(limit)]);

    return rows.map((row, index) => ({
        rank: index + 1,
        ...row
    }));
};

const getWeeklyLeaderboard = async (limit = 20) => {
    const [rows] = await db.query(`
        SELECT 
            u.id as user_id,
            u.username,
            u.name,
            COALESCE(SUM(x.amount), 0) as weekly_xp,
            s.current_streak
        FROM users u
        JOIN xp_transactions x ON u.id = x.user_id AND x.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        LEFT JOIN streaks s ON u.id = s.user_id
        WHERE u.role = 'STUDENT'
        GROUP BY u.id, u.username, u.name, s.current_streak
        ORDER BY weekly_xp DESC
        LIMIT ?
    `, [Number(limit)]);

    return rows.map((row, index) => ({
        rank: index + 1,
        ...row
    }));
};

const getMonthlyLeaderboard = async (limit = 20) => {
    const [rows] = await db.query(`
        SELECT 
            u.id as user_id,
            u.username,
            u.name,
            COALESCE(SUM(x.amount), 0) as monthly_xp,
            s.current_streak
        FROM users u
        JOIN xp_transactions x ON u.id = x.user_id AND x.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        LEFT JOIN streaks s ON u.id = s.user_id
        WHERE u.role = 'STUDENT'
        GROUP BY u.id, u.username, u.name, s.current_streak
        ORDER BY monthly_xp DESC
        LIMIT ?
    `, [Number(limit)]);

    return rows.map((row, index) => ({
        rank: index + 1,
        ...row
    }));
};

const getAccuracyLeaderboard = async (limit = 20) => {
    const [rows] = await db.query(`
        SELECT 
            u.id as user_id,
            u.username,
            u.name,
            SUM(up.questions_attempted) as total_attempted,
            SUM(up.questions_correct) as total_correct,
            ROUND((SUM(up.questions_correct) / SUM(up.questions_attempted)) * 100, 2) as overall_accuracy
        FROM users u
        JOIN user_progress up ON u.id = up.user_id
        WHERE u.role = 'STUDENT'
        GROUP BY u.id, u.username, u.name
        HAVING total_attempted >= 5
        ORDER BY overall_accuracy DESC, total_attempted DESC
        LIMIT ?
    `, [Number(limit)]);

    return rows.map((row, index) => ({
        rank: index + 1,
        ...row
    }));
};

module.exports = {
    getOverallLeaderboard,
    getWeeklyLeaderboard,
    getMonthlyLeaderboard,
    getAccuracyLeaderboard
};
