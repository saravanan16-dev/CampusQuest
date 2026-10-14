const express = require("express");
const {
    getAnalytics,
    getUsers,
    updateUserRole,
    updateUserStatus
} = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/admin/analytics", authMiddleware, adminMiddleware, getAnalytics);

module.exports = router;
