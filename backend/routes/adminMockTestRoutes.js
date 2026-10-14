const router = require("express").Router();
const c = require("../controllers/mockTestController");
router.get("/", c.getMockTests); router.get("/:id", c.getMockTest); router.post("/", c.createMockTest); router.put("/:id", c.updateMockTest); router.delete("/:id", c.deleteMockTest);
module.exports = router;
