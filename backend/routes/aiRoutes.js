const express = require("express");
const {
    getPersonalizedRecommendations,
    explainConcept,
    explainWrongAnswer,
    getExamIntelligence
} = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/ai/recommendations", authMiddleware, getPersonalizedRecommendations);
router.post("/ai/explain-concept", explainConcept);
router.post("/ai/explain-wrong-answer", explainWrongAnswer);
router.get("/ai/exam-intelligence/:subjectId", getExamIntelligence);

module.exports = router;
