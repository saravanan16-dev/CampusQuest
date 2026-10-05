const express = require("express");
const {
    getAnalytics,
    getUsers,
    updateUserRole
} = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/admin/analytics", authMiddleware, adminMiddleware, getAnalytics);
router.get("/admin/users", authMiddleware, adminMiddleware, getUsers);
router.put("/admin/users/:id/role", authMiddleware, adminMiddleware, updateUserRole);

module.exports = router;
