const Hostel = require("../models/hostel");
const Booking = require("../models/booking");
const User = require("../models/user");

const facilitiesList = ["WiFi", "Food", "Laundry", "AC", "Parking", "CCTV"];
const hostelTypes = ["Boys", "Girls", "Co-ed"];
const sharingTypes = [
  "Single Sharing",
  "2 Sharing",
  "3 Sharing",
  "4 Sharing"
];

// GET form
exports.getAddHostel = (req, res) => {
res.render("host/add-hostel", {
  errors: [],
  oldInput: {},
  facilitiesList,
  hostelTypes,
  sharingTypes
});
};

exports.getAddHostelUploadError = (req, res, err) => {
  res.status(422).render("host/add-hostel", {
    errors: [err.message || "Please upload a valid hostel photo."],
    oldInput: req.body || {},
    facilitiesList,
    hostelTypes,
    sharingTypes
  });
};

const buildOldInput = (req) => {
  const selectedFacilities = Array.isArray(req.body.facilities)
    ? req.body.facilities
    : req.body.facilities
      ? [req.body.facilities]
      : [];

  return {
    name: (req.body.name || "").trim(),
    hostelType: req.body.hostelType || "",
    location: (req.body.location || "").trim(),
    city: (req.body.city || "").trim(),
    street: (req.body.street || "").trim(),
    price: req.body.price || "",
    description: (req.body.description || "").trim(),
    totalRooms: req.body.totalRooms || "",
    availableRooms: req.body.availableRooms || "",
    sharingType: (req.body.sharingType || "").trim(),
    facilities: selectedFacilities.filter((facility) => facilitiesList.includes(facility)),
    contactNumber: (req.body.contactNumber || "").trim()
  };
};

exports.postAddHostel = async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    const hostelType = req.body.hostelType || "";
    const location = (req.body.location || "").trim();
    const city = (req.body.city || "").trim();
    const street = (req.body.street || "").trim();
    const price = Number(req.body.price);
    const description = (req.body.description || "").trim();
    const totalRooms = Number(req.body.totalRooms);
    const availableRooms = Number(req.body.availableRooms);
    const sharingType = (req.body.sharingType || "").trim();
    let photoUrl = "";
    let videoUrl = "";

    if (req.files && req.files.photo) {
      photoUrl = "/uploads/hostels/" + req.files.photo[0].filename;
    }

    if (req.files && req.files.video) {
      videoUrl = "/uploads/hostels/" + req.files.video[0].filename;
    }

    const contactNumber = (req.body.contactNumber || "").trim();
    const selectedFacilities = Array.isArray(req.body.facilities)
      ? req.body.facilities
      : req.body.facilities
        ? [req.body.facilities]
        : [];
    const facilities = selectedFacilities.filter((facility) => facilitiesList.includes(facility));

    const oldInput = {
      name,
      hostelType,
      location,
      city,
      street,
      price: req.body.price || "",
      description,
      totalRooms: req.body.totalRooms || "",
      availableRooms: req.body.availableRooms || "",
      sharingType,
      facilities,
      contactNumber
    };

    if (
      !name ||
      !hostelTypes.includes(hostelType) ||
      !location ||
      !street ||
      !city ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !description ||
      !Number.isInteger(totalRooms) ||
      totalRooms <= 0 ||
      !Number.isInteger(availableRooms) ||
      availableRooms < 0 ||
      !sharingType ||
      !req.files ||
      !req.files.photo ||
      !contactNumber
    ) {
      return res.status(422).render("host/add-hostel", {
        errors: ["Please fill in all required fields with valid details."],
        oldInput,
        facilitiesList,
        hostelTypes,
        sharingTypes
      });
    }

    if (availableRooms > totalRooms) {
      return res.status(422).render("host/add-hostel", {
        errors: ["Available rooms cannot be greater than total rooms."],
        oldInput,
        facilitiesList,
        hostelTypes,
        sharingTypes
      });
    }

    await Hostel.create({
      name,
      hostelType,
      location,
      city,
      street,
      price,
      description,
      totalRooms,
      availableRooms,
      sharingType,
      facilities,
      photoUrl,
      videoUrl,
      contactNumber,
      ownerEmail: req.user.email
    });

    return res.redirect("/dashboard");
  } catch (err) {
    console.log(err);
    return res.status(500).render("host/add-hostel", {
      errors: ["Could not add hostel. Please try again."],
      oldInput: req.body,
      facilitiesList,
      hostelTypes,
      sharingTypes
    });
  }
};

exports.getEditHostel = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({
      _id: req.params.id,
      ownerEmail: req.user.email
    });

    if (!hostel) {
      return res.redirect("/host/list");
    }

    return res.render("host/edit-hostel", {
      errors: [],
      hostel,
      oldInput: hostel,
      facilitiesList,
      hostelTypes,
      sharingTypes
    });
  } catch (err) {
    console.log(err);
    return res.redirect("/host/list");
  }
};

exports.getEditHostelUploadError = async (req, res, err) => {
  try {
    const hostel = await Hostel.findOne({
      _id: req.params.id,
      ownerEmail: req.user.email
    });

    if (!hostel) {
      return res.redirect("/host/list");
    }

    return res.status(422).render("host/edit-hostel", {
      errors: [err.message || "Please upload a valid hostel photo."],
      hostel,
      oldInput: buildOldInput(req),
      facilitiesList,
      hostelTypes,
      sharingTypes
    });
  } catch (error) {
    console.log(error);
    return res.redirect("/host/list");
  }
};

exports.postEditHostel = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({
      _id: req.params.id,
      ownerEmail: req.user.email
    });

    if (!hostel) {
      return res.redirect("/host/list");
    }

    const oldInput = buildOldInput(req);
    const price = Number(req.body.price);
    const totalRooms = Number(req.body.totalRooms);
    const availableRooms = Number(req.body.availableRooms);

    if (
      !oldInput.name ||
      !hostelTypes.includes(oldInput.hostelType) ||
      !oldInput.location ||
      !oldInput.city ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !oldInput.description ||
      !Number.isInteger(totalRooms) ||
      totalRooms <= 0 ||
      !Number.isInteger(availableRooms) ||
      availableRooms < 0 ||
      !oldInput.sharingType ||
      !oldInput.contactNumber
    ) {
      return res.status(422).render("host/edit-hostel", {
        errors: ["Please fill in all required fields with valid details."],
        hostel,
        oldInput,
        facilitiesList,
        hostelTypes,
        sharingTypes
      });
    }

    if (availableRooms > totalRooms) {
      return res.status(422).render("host/edit-hostel", {
        errors: ["Available rooms cannot be greater than total rooms."],
        hostel,
        oldInput,
        facilitiesList,
        hostelTypes,
        sharingTypes 
      });
    }

    hostel.name = oldInput.name;
    hostel.hostelType = oldInput.hostelType;
    hostel.location = oldInput.location;
    hostel.city = oldInput.city;
    hostel.price = price;
    hostel.description = oldInput.description;
    hostel.totalRooms = totalRooms;
    hostel.availableRooms = availableRooms;
    hostel.sharingType = oldInput.sharingType;
    hostel.facilities = oldInput.facilities;
    hostel.contactNumber = oldInput.contactNumber;

    if (req.files && req.files.photo) {
      hostel.photoUrl = "/uploads/hostels/" + req.files.photo[0].filename;
    }

    if (req.files && req.files.video) {
      hostel.videoUrl = "/uploads/hostels/" + req.files.video[0].filename;
    }

    await hostel.save();

    return res.redirect(`/host/details/${hostel._id}`);
  } catch (err) {
    console.log(err);
    return res.redirect("/host/list");
  }
};

exports.getMyHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find({ ownerEmail: req.user.email }).sort({ createdAt: -1 });

    return res.render("host/my-hostels", {
      hostels
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("host/my-hostels", {
      hostels: [],
      errorMessage: "Could not load your hostels. Please try again."
    });
  }
};

exports.getOwnerBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ ownerEmail: req.user.email })
      .sort({ createdAt: -1 })
      .populate("hostelId")
      .lean();
    const studentEmails = [...new Set(bookings.map((booking) => booking.studentEmail).filter(Boolean))];
    const students = await User.find({ email: { $in: studentEmails } }, "firstName lastName email").lean();
    const studentsByEmail = new Map(students.map((student) => [student.email, student]));
    const decoratedBookings = bookings.map((booking) => ({
      ...booking,
      hostel: booking.hostelId,
      status: booking.bookingStatus,
      student: studentsByEmail.get(booking.studentEmail) || { email: booking.studentEmail }
    }));

    return res.render("host/owner-bookings", {
      bookings: decoratedBookings,
      errorMessage: ""
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("host/owner-bookings", {
      bookings: [],
      errorMessage: "Could not load your bookings. Please try again."
    });
  }
};

exports.getHostelDetails = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({
      _id: req.params.id,
      ownerEmail: req.user.email
    });

    if (!hostel) {
      return res.status(404).render("host/hostel-details", {
        hostel: null,
        errorMessage: "Hostel listing not found."
      });
    }

    return res.render("host/hostel-details", {
      hostel,
      errorMessage: ""
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("host/hostel-details", {
      hostel: null,
      errorMessage: "Could not load hostel details. Please try again."
    });
  }
};
