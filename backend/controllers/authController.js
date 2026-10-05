const authService = require("../services/authService");

const register = async (req, res) => {
    try {
        const { username, name, email, password, role } = req.body;

        if (!username || !name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, name, email, and password are required"
            });
        }

        const data = await authService.register({ username, name, email, password, role });
        res.status(201).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Register error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to register user"
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const emailOrUsername = email || username;

        if (!emailOrUsername || !password) {
            return res.status(400).json({
                success: false,
                message: "Email/username and password are required"
            });
        }

        const data = await authService.login({ emailOrUsername, password });
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(error.statusCode || 401).json({
            success: false,
            message: error.message || "Invalid credentials"
        });
    }
};

const getProfile = async (req, res) => {
    try {
        const data = await authService.getProfile(req.user.id);
        res.json({
            success: true,
            data
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
        const { name, email } = req.body;
        const data = await authService.updateProfile(req.user.id, { name, email });
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Update profile error:", error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to update profile"
        });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile
};
