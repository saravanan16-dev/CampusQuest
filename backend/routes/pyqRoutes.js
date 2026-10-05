const express = require("express");
const {
    getPYQs,
    getPYQ,
    createPYQ,
    updatePYQ,
    deletePYQ
} = require("../controllers/pyqController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/pyqs", getPYQs);
router.get("/pyqs/:id", getPYQ);
router.post("/pyqs", authMiddleware, adminMiddleware, createPYQ);
router.put("/pyqs/:id", authMiddleware, adminMiddleware, updatePYQ);
router.delete("/pyqs/:id", authMiddleware, adminMiddleware, deletePYQ);

module.exports = router;
