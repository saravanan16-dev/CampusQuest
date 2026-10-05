const leaderboardService = require("../services/leaderboardService");

const getOverallLeaderboard = async (req, res) => {
    try {
        const { limit } = req.query;
        const leaderboard = await leaderboardService.getOverallLeaderboard(limit);
        res.json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error("Get overall leaderboard error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching leaderboard"
        });
    }
};

const getWeeklyLeaderboard = async (req, res) => {
    try {
        const { limit } = req.query;
        const leaderboard = await leaderboardService.getWeeklyLeaderboard(limit);
        res.json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error("Get weekly leaderboard error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching weekly leaderboard"
        });
    }
};

const getMonthlyLeaderboard = async (req, res) => {
    try {
        const { limit } = req.query;
        const leaderboard = await leaderboardService.getMonthlyLeaderboard(limit);
        res.json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error("Get monthly leaderboard error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching monthly leaderboard"
        });
    }
};

const getAccuracyLeaderboard = async (req, res) => {
    try {
        const { limit } = req.query;
        const leaderboard = await leaderboardService.getAccuracyLeaderboard(limit);
        res.json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error("Get accuracy leaderboard error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching accuracy leaderboard"
        });
    }
};

module.exports = {
    getOverallLeaderboard,
    getWeeklyLeaderboard,
    getMonthlyLeaderboard,
    getAccuracyLeaderboard
};
