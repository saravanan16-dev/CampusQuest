const router = require("express").Router();
const c = require("../controllers/noteController");
router.get("/", c.getAllNotes); router.get("/:id", c.getNote); router.post("/", c.createNote); router.put("/:id", c.updateNote); router.delete("/:id", c.deleteNote);
module.exports = router;
