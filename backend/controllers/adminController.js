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

const updateUserStatus = async (req, res) => {
    try {
        if (typeof req.body.is_active !== "boolean") {
            return res.status(400).json({ success: false, message: "is_active must be true or false" });
        }
        if (Number(req.params.id) === req.user.id && !req.body.is_active) {
            return res.status(400).json({ success: false, message: "You cannot disable your own account" });
        }
        const result = await adminService.updateUserStatus(req.params.id, req.body.is_active);
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, message: `User ${req.body.is_active ? "enabled" : "disabled"}` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Database error while updating account status" });
    }
};

module.exports = {
    getAnalytics,
    getUsers,
    updateUserRole,
    updateUserStatus
};
