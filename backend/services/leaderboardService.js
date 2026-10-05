const leaderboardModel = require("../models/leaderboardModel");

const getOverallLeaderboard = async (limit = 20) => {
    return await leaderboardModel.getOverallLeaderboard(limit);
};

const getWeeklyLeaderboard = async (limit = 20) => {
    return await leaderboardModel.getWeeklyLeaderboard(limit);
};

const getMonthlyLeaderboard = async (limit = 20) => {
    return await leaderboardModel.getMonthlyLeaderboard(limit);
};

const getAccuracyLeaderboard = async (limit = 20) => {
    return await leaderboardModel.getAccuracyLeaderboard(limit);
};

module.exports = {
    getOverallLeaderboard,
    getWeeklyLeaderboard,
    getMonthlyLeaderboard,
    getAccuracyLeaderboard
};
