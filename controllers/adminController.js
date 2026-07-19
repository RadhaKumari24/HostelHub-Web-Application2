const User = require("../models/user");
const Hostel = require("../models/hostel");
const Booking = require("../models/booking");

// =======================
// Admin Login Page
// =======================
exports.getLogin = (req, res) => {
  res.render("admin/login", {
    pageTitle: "Admin Login",
    errorMessage: null,
    oldInput: {
      email: ""
    }
  });
};

// =======================
// Admin Login
// =======================
exports.postLogin = (req, res) => {
  const { email, password } = req.body;

  console.log("=== ADMIN LOGIN ===");
  console.log("Entered Email:", email);
  console.log("ENV Email:", process.env.ADMIN_EMAIL);
  console.log("Entered Password:", password);
  console.log("ENV Password:", process.env.ADMIN_PASSWORD);

  if (
    email.trim() === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    console.log("✅ Login Success");

    req.session.isAdmin = true;

    return req.session.save(() => {
      res.redirect("/admin/dashboard");
    });
  }

  console.log("❌ Login Failed");

  return res.status(401).render("admin/login", {
    pageTitle: "Admin Login",
    errorMessage: "Invalid email or password.",
    oldInput: {
      email
    }
  });
};

// =======================
// Admin Dashboard
// =======================
exports.getDashboard = async (req, res) => {
  try {

    const totalStudents = await User.countDocuments({
      userType: "student"
    });

    const totalOwners = await User.countDocuments({
      userType: "owner"
    });

    const totalHostels = await Hostel.countDocuments();

    const totalBookings = await Booking.countDocuments();

    const recentBookings = await Booking.find()
      .populate("studentId", "firstName lastName")
      .populate("hostelId", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    res.render("admin/dashboard", {
      pageTitle: "Admin Dashboard",
      totalStudents,
      totalOwners,
      totalHostels,
      totalBookings,
      recentBookings
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Something went wrong.");
  }
};

// =======================
// Admin Logout
// =======================
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
};

exports.getStudents = async (req, res) => {
  try {

    const search = req.query.search || "";

    const students = await User.find({
      userType: "student",
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } }
      ]
    });

    res.render("admin/students", {
      pageTitle: "Students",
      students,
      search
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Something went wrong");
  }
};

// Owners List
exports.getOwners = async (req, res) => {
  try {
    const owners = await User.find({ userType: "owner" });

    res.render("admin/owners", {
      pageTitle: "Owners",
      owners
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Something went wrong");
  }
};

// =======================
// Hostels List
// =======================
exports.getHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find().sort({ createdAt: -1 });

    res.render("admin/hostels", {
      pageTitle: "Hostels",
      hostels
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Something went wrong");
  }
};

// =======================
// Bookings List
// =======================
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("studentId", "firstName lastName email")
      .populate("hostelId", "name city")
      .sort({ createdAt: -1 });

    res.render("admin/bookings", {
      pageTitle: "Bookings",
      bookings
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Something went wrong");
  }
};