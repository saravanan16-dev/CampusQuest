const unitModel = require("../models/unitModel");

const getAllUnits = async (subject_id) => {
    return await unitModel.getUnits(subject_id);
};

const getUnitById = async (id) => {
    return await unitModel.getUnitById(id);
};

const getUnitsBySubjectId = async (subject_id) => {
    return await unitModel.getUnitsBySubjectId(subject_id);
};

const createUnit = async ({ subject_id, unit_number, name }) => {
    const id = await unitModel.createUnit({ subject_id, unit_number, name });
    return await unitModel.getUnitById(id);
};

const updateUnit = async (id, { unit_number, name }) => {
    await unitModel.updateUnit(id, { unit_number, name });
    return await unitModel.getUnitById(id);
};

const deleteUnit = async (id) => {
    return await unitModel.deleteUnit(id);
};

module.exports = {
    getAllUnits,
    getUnitById,
    getUnitsBySubjectId,
    createUnit,
    updateUnit,
    deleteUnit
};
