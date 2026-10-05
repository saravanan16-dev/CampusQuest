const adminService = require("../services/adminService");

const getAnalytics = async (req, res) => {
    try {
        const analytics = await adminService.getAnalytics();
        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error("Get admin analytics error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching admin analytics"
        });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await adminService.getAllUsers();
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error("Get admin users error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while fetching users"
        });
    }
};

const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!role || !["STUDENT", "ADMIN"].includes(role.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: "Valid role is required (STUDENT or ADMIN)"
            });
        }

        await adminService.updateUserRole(req.params.id, role.toUpperCase());
        res.json({
            success: true,
            message: `User role updated to ${role.toUpperCase()}`
        });
    } catch (error) {
        console.error("Update user role error:", error.message);
        res.status(500).json({
            success: false,
            message: "Database error while updating user role"
        });
    }
};

module.exports = {
    getAnalytics,
    getUsers,
    updateUserRole
};
