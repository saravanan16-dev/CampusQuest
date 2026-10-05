const noteModel = require("../models/noteModel");

const getAllNotes = async (filters = {}) => {
    return await noteModel.getAllNotes(filters);
};

const getNotesBySubject = async (subjectId, unit) => {
    return await noteModel.getNotesBySubject(subjectId, unit);
};

const getNoteById = async (id) => {
    return await noteModel.getNoteById(id);
};

const createNote = async (noteData) => {
    const id = await noteModel.createNote(noteData);
    return await noteModel.getNoteById(id);
};

const updateNote = async (id, noteData) => {
    await noteModel.updateNote(id, noteData);
    return await noteModel.getNoteById(id);
};

const deleteNote = async (id) => {
    return await noteModel.deleteNote(id);
};

module.exports = {
    getAllNotes,
    getNotesBySubject,
    getNoteById,
    createNote,
    updateNote,
    deleteNote
};
