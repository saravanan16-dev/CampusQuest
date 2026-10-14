const router = require("express").Router();
const c = require("../controllers/adminController");
router.get("/", c.getUsers); router.put("/:id/role", c.updateUserRole); router.put("/:id/status", c.updateUserStatus);
module.exports = router;
