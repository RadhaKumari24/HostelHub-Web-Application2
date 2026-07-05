const Razorpay = require("razorpay");

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

  if (!keyId || !keySecret || keyId.includes("your_") || keySecret.includes("your_")) {
    throw new Error("Razorpay keys are missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
};

module.exports = getRazorpayInstance;
