const noteModel = require("../models/noteModel");

const getNotesBySubject = async (subjectId, unit) => {
    return await noteModel.getNotesBySubject(subjectId, unit);
};

const getAllNotes = async () => {
    return await noteModel.getAllNotes();
};

const getNoteById = async (id) => {
    return await noteModel.getNoteById(id);
};

const createNote = async (noteData) => {
    return await noteModel.createNote(noteData);
};

const updateNote = async (id, noteData) => {
    return await noteModel.updateNote(id, noteData);
};

const deleteNote = async (id) => {
    return await noteModel.deleteNote(id);
};

module.exports = {
    getNotesBySubject,
    getAllNotes,
    getNoteById,
    createNote,
    updateNote,
    deleteNote
};
