const express = require("express");
const {
    getQuestions,
    getQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion
} = require("../controllers/questionController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/questions", getQuestions);
router.get("/questions/:id", getQuestion);
router.post("/questions", authMiddleware, createQuestion);
router.put("/questions/:id", authMiddleware, updateQuestion);
router.delete("/questions/:id", authMiddleware, deleteQuestion);

module.exports = router;
