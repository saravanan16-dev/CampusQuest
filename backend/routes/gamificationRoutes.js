const express = require("express");
const {
    getGamificationSummary,
    getStreak,
    getAchievements
} = require("../controllers/gamificationController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/xp", authMiddleware, getGamificationSummary);
router.get("/streak", authMiddleware, getStreak);
router.get("/achievements", authMiddleware, getAchievements);

module.exports = router;
