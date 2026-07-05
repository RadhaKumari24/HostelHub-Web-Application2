const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

router.get("/signup", authController.getSignup);
router.post("/signup", authController.postSignup);

router.get("/verify-otp", authController.getVerifyOtp);
router.post("/verify-otp", authController.postVerifyOtp);
router.post("/resend-otp", authController.postResendOtp);

router.get("/login", authController.getLogin);
router.post("/login", authController.postLogin);

router.get("/forgot-password", authController.getForgotPassword);
router.post("/forgot-password", authController.postForgotPassword);

router.get("/reset-password/:token", authController.getResetPassword);
router.post("/reset-password/:token", authController.postResetPassword);

router.post("/logout", authController.postLogout);

module.exports = router;
