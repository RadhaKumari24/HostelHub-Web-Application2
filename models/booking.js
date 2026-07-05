const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  studentEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  hostelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hostel",
    required: true
  },
  ownerEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  bookingStatus: {
    type: String,
    enum: ["Pending", "Confirmed", "Rejected"],
    default: "Pending"
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed"],
    default: "Pending"
  },
  contactNumber: {
    type: String,
    required: true
  },
  moveInDate: Date,
  note: String,
  razorpayOrderId: {
    type: String,
    index: true
  },
  razorpayPaymentId: String,
  paymentDate: Date
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);
