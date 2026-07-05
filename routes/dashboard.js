const express = require("express");
const router = express.Router();

const isAuth = require("../middleware/isAuth");
const Hostel = require("../models/hostel");
const Booking = require("../models/booking");

router.get("/", isAuth, async (req, res) => {
  try {
    if (req.user.userType === "student") {
      return res.redirect("/hostels");
    }

    // Owner: gather hostels and bookings for this owner
    const ownerEmail = req.user.email;
    const hostels = await Hostel.find({ ownerEmail }).lean();

    // Aggregate room counts
    const stats = hostels.reduce(
      (acc, h) => {
        acc.totalHostels += 1;
        acc.totalRooms += Number(h.totalRooms || 0);
        acc.availableRooms += Number(h.availableRooms || 0);
        const type = h.hostelType || "Co-ed";
        if (!acc.byType[type]) acc.byType[type] = { total: 0, available: 0 };
        acc.byType[type].total += Number(h.totalRooms || 0);
        acc.byType[type].available += Number(h.availableRooms || 0);
        return acc;
      },
      { totalHostels: 0, totalRooms: 0, availableRooms: 0, byType: {} }
    );

    // Get bookings for this owner's hostels
    const bookings = await Booking.find({ ownerEmail })
      .sort({ createdAt: -1 })
      .populate("hostelId", "name")
      .lean();

    return res.render("dashboard", {
      pageTitle: "Dashboard",
      user: req.user,
      stats,
      hostels,
      bookings
    });
  } catch (err) {
    console.error(err);
    return res.render("dashboard", {
      pageTitle: "Dashboard",
      user: req.user,
      stats: { totalHostels: 0, totalRooms: 0, availableRooms: 0, byType: {} },
      hostels: [],
      bookings: []
    });
  }
});

module.exports = router;
