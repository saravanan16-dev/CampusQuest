const userService = require("../services/userService");

const register = async (req, res) => {
    try {
        const { username, name, email, password, role, college, department, year, semester } = req.body;

        if (!username || !name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, name, email, and password are required"
            });
        }

        const data = await userService.register({
            username,
            name,
            email,
            password,
            role,
            college,
            department,
            year,
            semester
        });

        res.status(201).json({
            success: true,
            message: data.message,
            token: data.token,
            data: data
        });
    } catch (error) {
        console.error("User registration error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Registration failed"
        });
    }
};

const login = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if ((!username && !email) || !password) {
            return res.status(400).json({
                success: false,
                message: "Username/email and password are required"
            });
        }

        const data = await userService.login({ username, email, password });

        res.json({
            success: true,
            message: "Login successful",
            token: data.token,
            data: data
        });
    } catch (error) {
        console.error("User login error:", error.message);
        res.status(error.statusCode || 401).json({
            success: false,
            message: error.message || "Invalid credentials"
        });
    }
};

const getProfile = async (req, res) => {
    try {
        const profile = await userService.getProfile(req.user.id);
        res.json({
            success: true,
            data: {
                ...profile,
                user: profile,
                gamification: profile.gamification
            }
        });
    } catch (error) {
        console.error("Get profile error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to retrieve profile"
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const updated = await userService.updateProfile(req.user.id, req.body);
        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error("Update profile error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to update profile"
        });
    }
};

const getDashboard = async (req, res) => {
    try {
        const dashboardData = await userService.getDashboardData(req.user.id);
        res.json({
            success: true,
            message: "Dashboard data retrieved successfully",
            name: dashboardData.name,
            subjects_count: dashboardData.subjects_count,
            notes_count: dashboardData.notes_count,
            data: dashboardData
        });
    } catch (error) {
        console.error("Get dashboard error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to load dashboard"
        });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    getDashboard
};
