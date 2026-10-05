const gamificationService = require("../services/gamificationService");
const gamificationModel = require("../models/gamificationModel");

const getGamificationSummary = async (req, res) => {
    try {
        const summary = await gamificationService.getUserGamificationSummary(req.user.id);
        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error("Get gamification summary error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching gamification data"
        });
    }
};

const getStreak = async (req, res) => {
    try {
        const streak = await gamificationModel.getUserStreak(req.user.id);
        res.json({
            success: true,
            data: streak
        });
    } catch (error) {
        console.error("Get streak error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching streak data"
        });
    }
};

const getAchievements = async (req, res) => {
    try {
        const achievements = await gamificationModel.getUserAchievements(req.user.id);
        res.json({
            success: true,
            data: achievements
        });
    } catch (error) {
        console.error("Get achievements error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching achievements"
        });
    }
};

module.exports = {
    getGamificationSummary,
    getStreak,
    getAchievements
};
