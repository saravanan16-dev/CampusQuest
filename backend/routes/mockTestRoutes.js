const express = require("express");
const {
    getMockTests,
    getMockTest,
    startMockTest,
    submitMockTest,
    getMockTestResult,
    getUserTestHistory,
    createMockTest,
    deleteMockTest
} = require("../controllers/mockTestController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/mock-tests", getMockTests);
router.get("/mock-tests/history", authMiddleware, getUserTestHistory);
router.get("/mock-tests/:id", getMockTest);
router.post("/mock-tests/:id/start", authMiddleware, startMockTest);
router.post("/mock-tests/:id/submit", authMiddleware, submitMockTest);
router.get("/mock-tests/:id/result", authMiddleware, getMockTestResult);
router.post("/mock-tests", authMiddleware, adminMiddleware, createMockTest);
router.delete("/mock-tests/:id", authMiddleware, adminMiddleware, deleteMockTest);

module.exports = router;
