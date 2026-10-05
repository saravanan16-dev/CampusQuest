const db = require("../config/db");

const getUserStreak = async (userId) => {
    const [rows] = await db.query(
        "SELECT * FROM streaks WHERE user_id = ?",
        [userId]
    );

    if (rows.length === 0) {
        await db.query(
            "INSERT INTO streaks (user_id, current_streak, max_streak, last_active_date) VALUES (?, 0, 0, NULL)",
            [userId]
        );
        return { user_id: userId, current_streak: 0, max_streak: 0, last_active_date: null };
    }

    return rows[0];
};

const updateStreakActivity = async (userId) => {
    const streak = await getUserStreak(userId);
    const today = new Date().toISOString().slice(0, 10);

    let current = streak.current_streak;
    let max = streak.max_streak;

    if (!streak.last_active_date) {
        current = 1;
        max = Math.max(max, 1);
    } else {
        const lastDate = new Date(streak.last_active_date).toISOString().slice(0, 10);
        if (lastDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            if (lastDate === yesterday) {
                current += 1;
            } else {
                current = 1;
            }
            max = Math.max(max, current);
        }
    }

    await db.query(
        "UPDATE streaks SET current_streak = ?, max_streak = ?, last_active_date = CURDATE() WHERE user_id = ?",
        [current, max, userId]
    );

    return { current_streak: current, max_streak: max };
};

const addXPTransaction = async (userId, amount, reason) => {
    const [result] = await db.query(
        "INSERT INTO xp_transactions (user_id, amount, reason) VALUES (?, ?, ?)",
        [userId, amount, reason]
    );
    return result.insertId;
};

const getUserTotalXP = async (userId) => {
    const [rows] = await db.query(
        "SELECT COALESCE(SUM(amount), 0) as total_xp FROM xp_transactions WHERE user_id = ?",
        [userId]
    );
    return Number(rows[0].total_xp || 0);
};

const getXPTransactions = async (userId, limit = 10) => {
    const [rows] = await db.query(
        "SELECT * FROM xp_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
        [userId, Number(limit)]
    );
    return rows;
};

const getAllAchievements = async () => {
    const [rows] = await db.query("SELECT * FROM achievements ORDER BY id ASC");
    return rows;
};

const getUserAchievements = async (userId) => {
    const [rows] = await db.query(`
        SELECT a.*, ua.unlocked_at,
               CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END as is_unlocked
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
        ORDER BY a.id ASC
    `, [userId]);
    return rows;
};

const unlockAchievement = async (userId, achievementCode) => {
    const [ach] = await db.query("SELECT * FROM achievements WHERE code = ?", [achievementCode]);
    if (ach.length === 0) return null;

    const achievement = ach[0];

    // Check if already unlocked
    const [existing] = await db.query(
        "SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?",
        [userId, achievement.id]
    );

    if (existing.length > 0) return null; // Already unlocked

    await db.query(
        "INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)",
        [userId, achievement.id]
    );

    // Award bonus XP for achievement
    if (achievement.xp_reward > 0) {
        await addXPTransaction(userId, achievement.xp_reward, `Unlocked achievement: ${achievement.title}`);
    }

    return achievement;
};

module.exports = {
    getUserStreak,
    updateStreakActivity,
    addXPTransaction,
    getUserTotalXP,
    getXPTransactions,
    getAllAchievements,
    getUserAchievements,
    unlockAchievement
};
