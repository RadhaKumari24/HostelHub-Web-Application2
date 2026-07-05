const Hostel = require("../models/hostel");
const Booking = require("../models/booking");
const User = require("../models/user");

const attachOwners = async (hostels) => {
  const ownerEmails = [...new Set(hostels.map((hostel) => hostel.ownerEmail).filter(Boolean))];
  const owners = await User.find({ email: { $in: ownerEmails } }, "firstName lastName email").lean();
  const ownersByEmail = new Map(owners.map((owner) => [owner.email, owner]));

  return hostels.map((hostel) => ({
    ...hostel,
    owner: ownersByEmail.get(hostel.ownerEmail) || { email: hostel.ownerEmail }
  }));
};

const attachStudentBookingState = async (hostels, studentEmail) => {
  const normalizedStudentEmail = (studentEmail || "").trim().toLowerCase();

  if (!normalizedStudentEmail || hostels.length === 0) {
    return hostels.map((hostel) => ({
      ...hostel,
      isBookedByCurrentUser: false
    }));
  }

  const hostelIds = hostels.map((hostel) => hostel._id);
  const bookings = await Booking.find(
    {
      studentEmail: normalizedStudentEmail,
      hostelId: { $in: hostelIds },
      bookingStatus: "Confirmed",
      paymentStatus: "Paid"
    },
    "hostelId"
  ).lean();
  const bookedHostelIds = new Set(bookings.map((booking) => booking.hostelId.toString()));

  return hostels.map((hostel) => ({
    ...hostel,
    isBookedByCurrentUser: bookedHostelIds.has(hostel._id.toString())
  }));
};

exports.getHostelIndex = async (req, res) => {
  try {
    const city = (req.query.city || "").trim();
    const street = (req.query.street || "").trim();
    const hostelType = (req.query.hostelType || "").trim();
    const sharingType = (req.query.sharingType || "").trim();
    const maxPrice = req.query.maxPrice || "";
    const filter = {};

    if (city) {
      filter.city = { $regex: city, $options: "i" };
    }
    if (street) {
      filter.street = { $regex: street, $options: "i" };
    }
    if (hostelType) {
      filter.hostelType = hostelType;
    }
    if (sharingType) {
      filter.sharingType = sharingType;
    }

    if (maxPrice) {
      const parsedMaxPrice = Number(maxPrice);

      if (Number.isFinite(parsedMaxPrice) && parsedMaxPrice > 0) {
        filter.price = { $lte: parsedMaxPrice };
      }
    }

    const hostels = await Hostel.find(filter).sort({ createdAt: -1 }).lean();
    const hostelsWithOwners = await attachOwners(hostels);
    const decoratedHostels = await attachStudentBookingState(hostelsWithOwners, req.user.email);
    const hasFilters = Boolean( city || street || hostelType || sharingType || maxPrice );

    return res.render("hostels/index", {
      hostels: decoratedHostels,
      resultCount: hasFilters ? decoratedHostels.length : null,
      filters: {
        city,
        street,
        hostelType,
        sharingType,
        maxPrice
      },
      errorMessage: ""
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("hostels/index", {
      hostels: [],
      filters: { city: req.query.city || "", street: req.query.street || "", hostelType: req.query.hostelType || "", sharingType: req.query.sharingType || "", maxPrice: req.query.maxPrice || "" },
      errorMessage: "Could not load hostels. Please try again."
    });
  }
};

exports.getHostelDetails = async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id).lean();

    if (!hostel) {
      return res.status(404).render("hostels/details", {
        hostel: null,
        errorMessage: "Hostel listing not found."
      });
    }

    const [hostelWithOwner] = await attachOwners([hostel]);
    const [decoratedHostel] = await attachStudentBookingState([hostelWithOwner], req.user.email);

    return res.render("hostels/details", {
      hostel: decoratedHostel,
      errorMessage: ""
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("hostels/details", {
      hostel: null,
      errorMessage: "Could not load hostel details. Please try again."
    });
  }
};
