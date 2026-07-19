const crypto = require("crypto");
const Booking = require("../models/booking");
const Hostel = require("../models/hostel");
const User = require("../models/user");
const getRazorpayInstance = require("../config/razorpay");
const { sendBookingConfirmationEmail } = require("../utils/bookingMail");
const { sendOwnerBookingNotification } = require("../utils/ownerMail");

const toDisplayBooking = (booking) => ({
  ...booking,
  hostel: booking.hostelId,
  status: booking.bookingStatus
});

const renderConfirm = async (res, hostel, statusCode, errors, oldInput = {}) => {
  const owner = await User.findOne({ email: hostel.ownerEmail }, "firstName lastName email").lean();

  return res.status(statusCode).render("bookings/confirm", {
    hostel: {
      ...hostel.toObject(),
      owner: owner || { email: hostel.ownerEmail }
    },
    errors,
    successMessage: "",
    oldInput
  });
};

const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  if (!process.env.RAZORPAY_KEY_SECRET || !signature || !/^[a-f0-9]+$/i.test(signature)) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expected = Buffer.from(expectedSignature, "hex");
  const received = Buffer.from(signature || "", "hex");

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ studentEmail: req.user.email })
      .sort({ createdAt: -1 })
      .populate("hostelId")
      .lean();
    const ownerEmails = [...new Set(bookings.map((booking) => booking.ownerEmail).filter(Boolean))];
    const owners = await User.find({ email: { $in: ownerEmails } }, "firstName lastName email").lean();
    const ownersByEmail = new Map(owners.map((owner) => [owner.email, owner]));
    const decoratedBookings = bookings.map((booking) => ({
      ...toDisplayBooking(booking),
      owner: ownersByEmail.get(booking.ownerEmail) || { email: booking.ownerEmail }
    }));

    return res.render("bookings/index", {
      bookings: decoratedBookings,
      errorMessage: ""
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("bookings/index", {
      bookings: [],
      errorMessage: "Could not load your bookings. Please try again."
    });
  }
};

exports.getConfirmBooking = async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.hostelId).lean();

    if (!hostel) {
      return res.redirect("/hostels");
    }

    const owner = await User.findOne({ email: hostel.ownerEmail }, "firstName lastName email").lean();
    hostel.owner = owner || { email: hostel.ownerEmail };

    return res.render("bookings/confirm", {
      hostel,
      errors: [],
      successMessage: "",
      oldInput: {}
    });
  } catch (err) {
    console.log(err);
    return res.redirect("/hostels");
  }
};

exports.postConfirmBooking = async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.hostelId);

    if (!hostel) {
      return res.redirect("/hostels");
    }

    const contactNumber = (req.body.contactNumber || "").trim();
    if (!/^[6-9]\d{9}$/.test(contactNumber)) {
      return renderConfirm(
      res,
      hostel,
      422,
      ["Please enter a valid 10-digit mobile number."],
      oldInput
     );
  }

    const moveInDate = req.body.moveInDate || "";
    const note = (req.body.note || "").trim();
    const oldInput = { contactNumber, moveInDate, note };

    if (!contactNumber) {
      return renderConfirm(res, hostel, 422, ["Please enter your contact number."], oldInput);
    }

    if (hostel.availableRooms <= 0) {
      return renderConfirm(res, hostel, 422, ["No rooms are available for this hostel right now."], oldInput);
    }

    const existingBooking = await Booking.findOne({
      studentId: req.user._id,
      hostelId: hostel._id,
      bookingStatus: "Confirmed",
      paymentStatus: "Paid"
    });

    if (existingBooking) {
      return renderConfirm(res, hostel, 422, ["You already have an active booking for this hostel."], oldInput);
    }

    const booking = await Booking.create({
      studentId: req.user._id,
      studentEmail: req.user.email,
      hostelId: hostel._id,
      ownerEmail: hostel.ownerEmail,
      amount: hostel.price,
      bookingStatus: "Pending",
      paymentStatus: "Pending",
      contactNumber,
      moveInDate: moveInDate ? new Date(moveInDate) : undefined,
      note
    });

    try {
      const razorpay = getRazorpayInstance();
      const order = await razorpay.orders.create({
        amount: Math.round(hostel.price * 100),
        currency: "INR",
        receipt: `booking_${booking._id}`,
        notes: {
          bookingId: booking._id.toString(),
          studentId: req.user._id.toString(),
          hostelId: hostel._id.toString()
        }
      });

      booking.razorpayOrderId = order.id;
      await booking.save();

      return res.render("bookings/payment", {
        booking,
        hostel: hostel.toObject(),
        razorpayOrderId: order.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        amountInPaise: order.amount,
        student: req.user,
        errors: []
      });
    } catch (err) {
      console.log("RAZORPAY ORDER ERROR:", err);
      booking.bookingStatus = "Rejected";
      booking.paymentStatus = "Failed";
      await booking.save();

      return renderConfirm(res, hostel, 500, ["Could not start payment. Please try again."], oldInput);
    }
  } catch (err) {
    console.log(err);
    return res.redirect("/hostels");
  }
};

exports.postVerifyPayment = async (req, res) => {
  const {
    bookingId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature
  } = req.body;

  try {
    if (!bookingId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(422).render("bookings/failure", {
        message: "Payment verification data is incomplete."
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      studentId: req.user._id,
      razorpayOrderId
    });

    if (!booking) {
      return res.status(404).render("bookings/failure", {
        message: "Booking not found for this payment."
      });
    }

    booking.razorpayPaymentId = razorpayPaymentId;
    booking.paymentDate = new Date();

    const isValidSignature = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature
    });

    if (!isValidSignature) {
      booking.bookingStatus = "Rejected";
      booking.paymentStatus = "Failed";
      await booking.save();

      return res.status(400).render("bookings/failure", {
        message: "Payment signature verification failed. Booking was not confirmed."
      });
    }

    const hostel = await Hostel.findOneAndUpdate(
      { _id: booking.hostelId, availableRooms: { $gt: 0 } },
      { $inc: { availableRooms: -1 } },
      { new: true }
    );

    if (!hostel) {
      booking.bookingStatus = "Rejected";
      booking.paymentStatus = "Failed";
      await booking.save();

      return res.status(409).render("bookings/failure", {
        message: "No rooms are available now. Please contact support if payment was deducted."
      });
    }

    booking.bookingStatus = "Confirmed";
    booking.paymentStatus = "Paid";
    await booking.save();

    await sendBookingConfirmationEmail({
      studentEmail: req.user.email,
      studentName: `${req.user.firstName} ${req.user.lastName}`,
      hostel,
      booking
    });

    const owner = await User.findOne({ email: hostel.ownerEmail });

    await sendOwnerBookingNotification({
      ownerEmail: owner.email,
      ownerName: `${owner.firstName} ${owner.lastName}`,
      studentName: `${req.user.firstName} ${req.user.lastName}`,
      studentEmail: req.user.email,
      contactNumber: booking.contactNumber,
      hostel,
      booking
    });

    return res.render("bookings/success", {
      booking,
      hostel
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("bookings/failure", {
      message: "Could not verify payment. Please contact support if money was deducted."
    });
  }
};

exports.postPaymentFailure = async (req, res) => {
  try {
    if (req.body.bookingId) {
      await Booking.findOneAndUpdate(
        {
          _id: req.body.bookingId,
          studentId: req.user._id,
          bookingStatus: "Pending",
          paymentStatus: "Pending"
        },
        {
          bookingStatus: "Rejected",
          paymentStatus: "Failed"
        }
      );
    }

    return res.render("bookings/failure", {
      message: "Payment was cancelled or failed. Your booking is not confirmed."
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("bookings/failure", {
      message: "Could not update the failed booking. Please try again."
    });
  }
};

exports.getPaymentFailure = (req, res) => {
  return res.render("bookings/failure", {
    message: "Payment was cancelled or failed. Your booking is not confirmed."
  });
};
