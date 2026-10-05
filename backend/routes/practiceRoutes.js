const express = require("express");
const {
    startPractice,
    submitPractice,
    getPracticeResult,
    getUserPracticeHistory
} = require("../controllers/practiceController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/practice/start", authMiddleware, startPractice);
router.post("/practice/submit", authMiddleware, submitPractice);
router.post("/practice/:id/submit", authMiddleware, submitPractice);
router.get("/practice/history", authMiddleware, getUserPracticeHistory);
router.get("/practice/result/:id", authMiddleware, getPracticeResult);
router.get("/practice/:id/result", authMiddleware, getPracticeResult);
router.get("/practice/:id", authMiddleware, getPracticeResult);

module.exports = router;
