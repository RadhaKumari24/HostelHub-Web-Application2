const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/bookingController");
const isAuth = require("../middleware/isAuth");
const isStudent = require("../middleware/isStudent");

router.get("/", isAuth, isStudent, bookingController.getMyBookings);
router.get("/confirm/:hostelId", isAuth, isStudent, bookingController.getConfirmBooking);
router.post("/confirm/:hostelId", isAuth, isStudent, bookingController.postConfirmBooking);
router.post("/verify-payment", isAuth, isStudent, bookingController.postVerifyPayment);
router.post("/payment-failure", isAuth, isStudent, bookingController.postPaymentFailure);
router.get("/payment-failure", isAuth, isStudent, bookingController.getPaymentFailure);

module.exports = router;
