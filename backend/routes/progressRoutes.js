const express = require("express");
const {
    getOverallProgress,
    getSubjectProgress,
    getWeakAreas
} = require("../controllers/progressController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/progress", authMiddleware, getOverallProgress);
router.get("/progress/subjects", authMiddleware, getSubjectProgress);
router.get("/progress/weak-areas", authMiddleware, getWeakAreas);

module.exports = router;
