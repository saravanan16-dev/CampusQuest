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

const router = express.Router();

router.get("/subjects/:id/notes", getNotesBySubject);
router.get("/units/:id/notes", (req, res, next) => {
    req.query.unit_id = req.params.id;
    return getAllNotes(req, res, next);
});
router.get("/notes", getAllNotes);
router.get("/notes/:id", getNote);
router.post("/notes", authMiddleware, createNote);
router.put("/notes/:id", authMiddleware, updateNote);
router.delete("/notes/:id", authMiddleware, deleteNote);

module.exports = router;
