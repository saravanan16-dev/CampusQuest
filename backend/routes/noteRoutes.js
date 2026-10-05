const express = require("express");
const {
    getNotesBySubject,
    getAllNotes,
    getNote,
    createNote,
    updateNote,
    deleteNote
} = require("../controllers/noteController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/subjects/:id/notes", getNotesBySubject);
router.get("/notes", getAllNotes);
router.get("/notes/:id", getNote);
router.post("/notes", authMiddleware, adminMiddleware, createNote);
router.put("/notes/:id", authMiddleware, adminMiddleware, updateNote);
router.delete("/notes/:id", authMiddleware, adminMiddleware, deleteNote);

module.exports = router;
