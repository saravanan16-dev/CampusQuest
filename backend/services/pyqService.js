const pyqModel = require("../models/pyqModel");

const getPYQs = async (filters) => {
    return await pyqModel.getPYQs(filters);
};

const getPYQById = async (id) => {
    return await pyqModel.getPYQById(id);
};

const createPYQ = async (data) => {
    return await pyqModel.createPYQ(data);
};

const updatePYQ = async (id, data) => {
    return await pyqModel.updatePYQ(id, data);
};

const deletePYQ = async (id) => {
    return await pyqModel.deletePYQ(id);
};

module.exports = {
    getPYQs,
    getPYQById,
    createPYQ,
    updatePYQ,
    deletePYQ
};
