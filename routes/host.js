const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const isAuth = require("../middleware/isAuth");
const isOwner = require("../middleware/isOwner");
const hostController = require("../controllers/hostController");

const uploadDir = path.join(__dirname, "..", "public", "uploads", "hostels");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
fileFilter: (req, file, cb) => {

  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    return cb(null, true);
  }

  cb(new Error("Only image and video files are allowed."));
}
});

const uploadHostelPhoto = (req, res, next) => {
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "video", maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      return hostController.getAddHostelUploadError(req, res, err);
    }

    next();
  });
};

const uploadEditedHostelPhoto = (req, res, next) => {
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "video", maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      return hostController.getEditHostelUploadError(req, res, err);
    }

    next();
  });
};

router.get("/add", isAuth, isOwner, hostController.getAddHostel);
router.post("/add", isAuth, isOwner, uploadHostelPhoto, hostController.postAddHostel);

router.get("/list", isAuth, isOwner, hostController.getMyHostels);
router.get("/bookings", isAuth, isOwner, hostController.getOwnerBookings);
router.get("/edit/:id", isAuth, isOwner, hostController.getEditHostel);
router.post("/edit/:id", isAuth, isOwner, uploadEditedHostelPhoto, hostController.postEditHostel);
router.get("/details/:id", isAuth, isOwner, hostController.getHostelDetails);

module.exports = router;
