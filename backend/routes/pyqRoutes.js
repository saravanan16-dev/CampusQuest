const express = require("express");
const {
    getPYQs,
    getPYQ,
    createPYQ,
    updatePYQ,
    deletePYQ
} = require("../controllers/pyqController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/pyqs", getPYQs);
router.get("/pyqs/:id", getPYQ);
router.post("/pyqs", authMiddleware, createPYQ);
router.put("/pyqs/:id", authMiddleware, updatePYQ);
router.delete("/pyqs/:id", authMiddleware, deletePYQ);

module.exports = router;
