const mongoose = require("mongoose");

const hostelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  hostelType: {
    type: String,
    enum: ["Boys", "Girls", "Co-ed"],
    required: true
  },
  location: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  street: {
    type: String,
    required: true,
    trim: true
  },
  // location: {
  //   type: String,
  //   required: true,
  //   trim: true
  // },
  price: {
    type: Number,
    required: true
  },
  description: String,
  totalRooms: {
    type: Number,
    required: true
  },
  availableRooms: {
    type: Number,
    required: true
  },
  sharingType: {
    type: String,
    enum: [
      "Single Sharing",
      "2 Sharing",
      "3 Sharing",
      "4 Sharing"
    ],
    required: true
  },
  facilities: [{
    type: String,
    enum: ["WiFi", "Food", "Laundry", "AC", "Parking", "CCTV"]
  }],
  photoUrl: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    default: ""
  },
  contactNumber: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: 4.8
  },
  ownerEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Hostel", hostelSchema);
