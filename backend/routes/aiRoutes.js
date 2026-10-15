const express = require("express");
const {
    getPersonalizedRecommendations,
    explainConcept,
    explainWrongAnswer,
    getExamIntelligence,
    askAIAssistant,
    getAiStatus,
    configureAiKey
} = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/ai/recommendations", authMiddleware, getPersonalizedRecommendations);
router.post("/ai/explain-concept", explainConcept);
router.post("/ai/explain-wrong-answer", explainWrongAnswer);
router.get("/ai/exam-intelligence/:subjectId", getExamIntelligence);
router.post("/ai/ask", askAIAssistant);
router.post("/ai/chat", askAIAssistant);
router.get("/ai/status", getAiStatus);
router.post("/ai/configure-key", configureAiKey);

module.exports = router;

