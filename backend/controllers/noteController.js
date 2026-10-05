const noteService = require("../services/noteService");

const getNotesBySubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { unit } = req.query;
        const notes = await noteService.getNotesBySubject(id, unit);
        res.json({
            success: true,
            data: notes
        });
    } catch (error) {
        console.error("Get notes by subject error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching notes"
        });
    }
};

const getAllNotes = async (req, res) => {
    try {
        const notes = await noteService.getAllNotes();
        res.json({
            success: true,
            data: notes
        });
    } catch (error) {
        console.error("Get all notes error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching notes"
        });
    }
};

const getNote = async (req, res) => {
    try {
        const note = await noteService.getNoteById(req.params.id);
        if (!note) {
            return res.status(404).json({
                success: false,
                message: "Note not found"
            });
        }
        res.json({
            success: true,
            data: note
        });
    } catch (error) {
        console.error("Get note error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching note"
        });
    }
};

const createNote = async (req, res) => {
    try {
        const { subject_id, title, description, unit, file_url, content } = req.body;

        if (!subject_id || !title || !unit) {
            return res.status(400).json({
                success: false,
                message: "Subject ID, title, and unit are required"
            });
        }

        const uploaded_by = req.user ? req.user.id : null;
        const id = await noteService.createNote({
            subject_id,
            title,
            description,
            unit,
            file_url,
            content,
            uploaded_by
        });

        const created = await noteService.getNoteById(id);
        res.status(201).json({
            success: true,
            data: created
        });
    } catch (error) {
        console.error("Create note error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while creating note"
        });
    }
};

const updateNote = async (req, res) => {
    try {
        const { title, description, unit, file_url, content } = req.body;
        const result = await noteService.updateNote(req.params.id, {
            title,
            description,
            unit,
            file_url,
            content
        });

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Note not found"
            });
        }

        const updated = await noteService.getNoteById(req.params.id);
        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error("Update note error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while updating note"
        });
    }
};

const deleteNote = async (req, res) => {
    try {
        const result = await noteService.deleteNote(req.params.id);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Note not found"
            });
        }

        res.json({
            success: true,
            message: "Note deleted successfully"
        });
    } catch (error) {
        console.error("Delete note error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while deleting note"
        });
    }
};

module.exports = {
    getNotesBySubject,
    getAllNotes,
    getNote,
    createNote,
    updateNote,
    deleteNote
};
