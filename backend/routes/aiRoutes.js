const express = require("express");
const {
    getPersonalizedRecommendations,
    explainConcept,
    explainWrongAnswer,
    getExamIntelligence,
    askAIAssistant
} = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/ai/recommendations", authMiddleware, getPersonalizedRecommendations);
router.post("/ai/explain-concept", explainConcept);
router.post("/ai/explain-wrong-answer", explainWrongAnswer);
router.get("/ai/exam-intelligence/:subjectId", getExamIntelligence);
router.post("/ai/ask", askAIAssistant);
router.post("/ai/chat", askAIAssistant);

module.exports = router;
