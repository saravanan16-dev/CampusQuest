const express = require("express");
const {
    getOverallLeaderboard,
    getWeeklyLeaderboard,
    getMonthlyLeaderboard,
    getAccuracyLeaderboard
} = require("../controllers/leaderboardController");

const router = express.Router();

router.get("/leaderboard", getOverallLeaderboard);
router.get("/leaderboard/weekly", getWeeklyLeaderboard);
router.get("/leaderboard/monthly", getMonthlyLeaderboard);
router.get("/leaderboard/accuracy", getAccuracyLeaderboard);

module.exports = router;
