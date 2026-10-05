const gamificationModel = require("../models/gamificationModel");
const progressModel = require("../models/progressModel");
const db = require("../config/db");

// Level calculator according to Blueprint Module 9
// Level 1 — Beginner (0 - 99 XP)
// Level 2 — Explorer (100 - 299 XP)
// Level 3 — Learner (300 - 599 XP)
// Level 4 — Achiever (600 - 999 XP)
// Level 5 — Master (1000+ XP)
const calculateLevel = (totalXp) => {
    if (totalXp >= 1000) {
        return {
            level: 5,
            title: "Master",
            nextThreshold: null,
            progressPercent: 100
        };
    } else if (totalXp >= 600) {
        const xpInLevel = totalXp - 600;
        const progress = Math.min(100, Math.round((xpInLevel / 400) * 100));
        return {
            level: 4,
            title: "Achiever",
            nextThreshold: 1000,
            progressPercent: progress
        };
    } else if (totalXp >= 300) {
        const xpInLevel = totalXp - 300;
        const progress = Math.min(100, Math.round((xpInLevel / 300) * 100));
        return {
            level: 3,
            title: "Learner",
            nextThreshold: 600,
            progressPercent: progress
        };
    } else if (totalXp >= 100) {
        const xpInLevel = totalXp - 100;
        const progress = Math.min(100, Math.round((xpInLevel / 200) * 100));
        return {
            level: 2,
            title: "Explorer",
            nextThreshold: 300,
            progressPercent: progress
        };
    } else {
        const progress = Math.min(100, Math.round((totalXp / 100) * 100));
        return {
            level: 1,
            title: "Beginner",
            nextThreshold: 100,
            progressPercent: progress
        };
    }
};

const awardXP = async (userId, amount, reason) => {
    await gamificationModel.addXPTransaction(userId, amount, reason);
    const totalXp = await gamificationModel.getUserTotalXP(userId);
    const levelInfo = calculateLevel(totalXp);
    return {
        awarded: amount,
        totalXp,
        levelInfo
    };
};

const updateStreak = async (userId) => {
    return await gamificationModel.updateStreakActivity(userId);
};

const checkAndUnlockAchievements = async (userId) => {
    const unlockedList = [];

    // Check practice count
    const [practiceStats] = await db.query("SELECT COUNT(*) as count FROM practice_attempts WHERE user_id = ?", [userId]);
    if (practiceStats[0].count >= 1) {
        const res = await gamificationModel.unlockAchievement(userId, "FIRST_PRACTICE");
        if (res) unlockedList.push(res);
    }

    // Check mock test count
    const [testStats] = await db.query("SELECT COUNT(*) as count FROM test_attempts WHERE user_id = ? AND status = 'COMPLETED'", [userId]);
    if (testStats[0].count >= 1) {
        const res = await gamificationModel.unlockAchievement(userId, "FIRST_MOCK_TEST");
        if (res) unlockedList.push(res);
    }

    // Check total questions attempted
    const [userProgressRows] = await db.query(
        "SELECT SUM(questions_attempted) as attempted, SUM(questions_correct) as correct FROM user_progress WHERE user_id = ?",
        [userId]
    );
    const totalAttempted = Number(userProgressRows[0]?.attempted || 0);

    if (totalAttempted >= 100) {
        const res = await gamificationModel.unlockAchievement(userId, "QUESTIONS_100");
        if (res) unlockedList.push(res);
    }
    if (totalAttempted >= 500) {
        const res = await gamificationModel.unlockAchievement(userId, "QUESTIONS_500");
        if (res) unlockedList.push(res);
    }

    // Check streak
    const streak = await gamificationModel.getUserStreak(userId);
    if (streak.current_streak >= 7) {
        const res = await gamificationModel.unlockAchievement(userId, "STREAK_7");
        if (res) unlockedList.push(res);
    }

    // Check Subject Masteries (DBMS, Java)
    const [subProgress] = await db.query(`
        SELECT s.name, up.accuracy, up.questions_attempted 
        FROM user_progress up 
        JOIN subjects s ON up.subject_id = s.id 
        WHERE up.user_id = ?
    `, [userId]);

    for (const sp of subProgress) {
        if (sp.name.includes("Database") && sp.accuracy >= 85 && sp.questions_attempted >= 5) {
            const res = await gamificationModel.unlockAchievement(userId, "DBMS_MASTER");
            if (res) unlockedList.push(res);
        }
        if (sp.name.includes("Java") && sp.accuracy >= 85 && sp.questions_attempted >= 5) {
            const res = await gamificationModel.unlockAchievement(userId, "JAVA_MASTER");
            if (res) unlockedList.push(res);
        }
    }

    return unlockedList;
};

const getUserGamificationSummary = async (userId) => {
    const totalXp = await gamificationModel.getUserTotalXP(userId);
    const levelInfo = calculateLevel(totalXp);
    const streak = await gamificationModel.getUserStreak(userId);
    const achievements = await gamificationModel.getUserAchievements(userId);
    const unlockedAchievementsCount = achievements.filter(a => a.is_unlocked === 1).length;
    const recentXpTransactions = await gamificationModel.getXPTransactions(userId, 5);

    return {
        total_xp: totalXp,
        level: levelInfo.level,
        level_title: levelInfo.title,
        next_threshold: levelInfo.nextThreshold,
        level_progress_percent: levelInfo.progressPercent,
        current_streak: streak.current_streak,
        max_streak: streak.max_streak,
        last_active_date: streak.last_active_date,
        total_achievements: achievements.length,
        unlocked_achievements: unlockedAchievementsCount,
        achievements,
        recent_xp_transactions: recentXpTransactions
    };
};

module.exports = {
    calculateLevel,
    awardXP,
    updateStreak,
    checkAndUnlockAchievements,
    getUserGamificationSummary
};
