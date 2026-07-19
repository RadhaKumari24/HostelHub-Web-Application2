require("dotenv").config();

const path = require("path");
const http = require("http");
const express = require("express");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const flash = require("connect-flash");

const connectDB = require("./config/db");
const User = require("./models/user");
const Hostel = require("./models/hostel");


const attachOwners = async (hostels) => {
  const ownerEmails = [...new Set(hostels.map((hostel) => hostel.ownerEmail).filter(Boolean))];
  const owners = await User.find({ email: { $in: ownerEmails } }, "firstName lastName email").lean();
  const ownersByEmail = new Map(owners.map((owner) => [owner.email, owner]));

  return hostels.map((hostel) => ({
    ...hostel,
    owner: ownersByEmail.get(hostel.ownerEmail) || { email: hostel.ownerEmail }
  }));
};

// Routes
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const hostRoutes = require("./routes/host");
const hostelsRoutes = require("./routes/hostels");
const bookingRoutes = require("./routes/bookings");
const adminRoutes = require("./routes/admin");

const app = express();

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error("Missing MONGO_URI in environment configuration.");
  process.exit(1);
}

// ================= VIEW ENGINE =================
app.set("view engine", "ejs");
app.set("views", "views");

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ================= SESSION STORE =================
const store = new MongoDBStore({
  uri: mongoUri,
  collection: "sessions"
});

store.on("error", (err) => {
  console.log("SESSION STORE ERROR:", err);
});

// ================= SESSION =================
app.use(session({
  secret: process.env.SESSION_SECRET || "secret123",
  resave: false,
  saveUninitialized: false,
  store: store
}));

// ================= FLASH =================
app.use(flash());

// ================= USER ATTACH MIDDLEWARE =================
app.use(async (req, res, next) => {
  // console.log("SESSION USER ID:", req.session.userId);

  if (!req.session.userId) {
    // console.log("NO USER ID");           // 🔥
    res.locals.isLoggedIn = false;
    return next();
  }

  try {
    const user = await User.findById(req.session.userId);
    // console.log("FOUND USER:", user);    // 🔥

    if (!user) {
      res.locals.isLoggedIn = false;
      return next();
    }

    req.user = user;
    res.locals.user = user;
    res.locals.isLoggedIn = true;

    next();
  } catch (err) {
    // console.log(err);
    next();
  }
});

// ================= ROUTES =================
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/host", hostRoutes);
app.use("/hostels", hostelsRoutes);
app.use("/bookings", bookingRoutes);
app.use("/booking", bookingRoutes);
app.use("/admin", adminRoutes);

// ================= HOME =================
app.get("/", async (req, res) => {
  try {
    const hostels = await Hostel.find()
      .sort({ createdAt: -1 })
      .lean();
    const decoratedHostels = await attachOwners(hostels);

    res.render("home", {
      hostels: decoratedHostels,
      errorMessage: ""
    });
  } catch (err) {
    console.log(err);
    res.status(500).render("home", {
      hostels: [],
      errorMessage: "Could not load hostel listings right now."
    });
  }
});

// ================= SERVER =================
const DEFAULT_PORT = Number(process.env.PORT) || 3001;
const MAX_PORT_ATTEMPTS = 10;

const startServer = (port, attemptsLeft = MAX_PORT_ATTEMPTS) => {
  const server = http.createServer(app);

  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
      const nextPort = port + 1;
      console.log(`Port ${port} is busy. Trying port ${nextPort}...`);
      return startServer(nextPort, attemptsLeft - 1);
    }

    console.log("SERVER START ERROR:", err);
    process.exit(1);
  });

  server.listen(port, () => {
    process.env.PORT = String(port);
    console.log(`Server running on port ${port}`);
  });
};

const bootstrap = async () => {
  await connectDB();
  startServer(DEFAULT_PORT);
};

bootstrap();
