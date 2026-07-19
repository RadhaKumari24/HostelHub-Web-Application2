const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const isAdmin = require("../middleware/isAdmin");

router.get("/login", adminController.getLogin);
router.post("/login", adminController.postLogin);

router.get("/dashboard", isAdmin, adminController.getDashboard);
router.get("/students", isAdmin, adminController.getStudents);
router.get("/owners", isAdmin, adminController.getOwners);
router.get("/hostels", isAdmin, adminController.getHostels);
router.get("/bookings", isAdmin, adminController.getBookings);

router.post("/logout", isAdmin, adminController.logout);

module.exports = router;