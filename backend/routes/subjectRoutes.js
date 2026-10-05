const express = require("express");
const {
    getSubjects,
    getSubject,
    addSubject,
    updateSubject,
    deleteSubject
} = require("../controllers/subjectController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/subjects", getSubjects);
router.get("/subjects/:id", getSubject);
router.post("/subjects", authMiddleware, adminMiddleware, addSubject);
router.put("/subjects/:id", authMiddleware, adminMiddleware, updateSubject);
router.delete("/subjects/:id", authMiddleware, adminMiddleware, deleteSubject);

module.exports = router;