const express = require("express");
const router = express.Router();

const isAuth = require("../middleware/isAuth");
const hostelController = require("../controllers/hostelController");

router.get("/", isAuth, hostelController.getHostelIndex);
router.get("/details/:id", isAuth, hostelController.getHostelDetails);

module.exports = router;
