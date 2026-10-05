const noteService = require("../services/noteService");

const getAllNotes = async (req, res) => {
    try {
        const { subject_id, subjectId, unit_id, unitId, unit } = req.query;
        const notes = await noteService.getAllNotes({
            subject_id: subject_id || subjectId,
            unit_id: unit_id || unitId,
            unit
        });
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

const getNotesBySubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { unit, unit_id } = req.query;
        const notes = await noteService.getAllNotes({
            subject_id: id,
            unit_id,
            unit
        });
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
        const { subject_id, subjectId, unit_id, unitId, title, description, unit, file_url, content } = req.body || {};

        const targetSubjectId = subject_id || subjectId;
        if (!targetSubjectId || !title) {
            return res.status(400).json({
                success: false,
                message: "subject_id and title are required"
            });
        }

        const uploaded_by = req.user ? req.user.id : null;
        const note = await noteService.createNote({
            subject_id: Number(targetSubjectId),
            unit_id: unit_id || unitId ? Number(unit_id || unitId) : null,
            title,
            description,
            unit: unit ? Number(unit) : 1,
            file_url,
            content,
            uploaded_by
        });

        res.status(201).json({
            success: true,
            data: note
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
        const { title, description, unit_id, unit, file_url, content } = req.body;
        const updated = await noteService.updateNote(req.params.id, {
            title,
            description,
            unit_id,
            unit,
            file_url,
            content
        });

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Note not found"
            });
        }

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
    getAllNotes,
    getNotesBySubject,
    getNote,
    createNote,
    updateNote,
    deleteNote
};
