const subjectModel = require("../models/subjectModel");

const getAllSubjects = async (semester) => {
    return await subjectModel.getAllSubjects(semester);
};

const getSubjectById = async (id) => {
    return await subjectModel.getSubjectById(id);
};

const createSubject = async ({ name, description, semester }) => {
    return await subjectModel.createSubject({ name, description, semester });
};

const updateSubject = async (id, { name, description, semester }) => {
    return await subjectModel.updateSubject(id, { name, description, semester });
};

const deleteSubject = async (id) => {
    return await subjectModel.deleteSubject(id);
};

module.exports = {
    getAllSubjects,
    getSubjectById,
    createSubject,
    updateSubject,
    deleteSubject
};