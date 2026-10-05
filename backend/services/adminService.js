const adminModel = require("../models/adminModel");
const userModel = require("../models/userModel");

const getAnalytics = async () => {
    return await adminModel.getSystemAnalytics();
};

const getAllUsers = async () => {
    return await userModel.getAllUsers();
};

const updateUserRole = async (userId, role) => {
    return await userModel.updateUserRole(userId, role);
};

module.exports = {
    getAnalytics,
    getAllUsers,
    updateUserRole
};
