const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/user");
const { sendMail } = require("../utils/mailer");

const createHashedToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  return { rawToken, hashedToken };
};

const createOtp = () => crypto.randomInt(100000, 1000000).toString();

const hashValue = (value) => crypto.createHash("sha256").update(value).digest("hex");

const getBaseUrl = (req) => {
  if (process.env.NODE_ENV === "production" && process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }

  return `${req.protocol}://${req.get("host")}`;
};

const sendVerificationOtpEmail = async (user, otp) => {
  await sendMail({
    to: user.email,
    subject: "Your HostelHub verification OTP",
    text: `Hi ${user.firstName},\n\nYour HostelHub verification OTP is ${otp}.\n\nThis OTP expires in 10 minutes.`,
    html: `
      <p>Hi ${user.firstName},</p>
      <p>Your HostelHub verification OTP is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>This OTP expires in 10 minutes.</p>
    `
  });
};

const issueEmailVerificationOtp = async (user) => {
  const otp = createOtp();
  user.emailVerificationToken = hashValue(otp);
  user.emailVerificationExpires = Date.now() + 10 * 60 * 1000;
  await user.save();
  await sendVerificationOtpEmail(user, otp);
};

const sendPasswordResetEmail = async (req, user, rawToken) => {
  const resetLink = `${getBaseUrl(req)}/auth/reset-password/${rawToken}`;

  await sendMail({
    to: user.email,
    subject: "Reset your HostelHub password",
    text: `Hi ${user.firstName},\n\nReset your HostelHub password using this link:\n${resetLink}\n\nThis link expires in 1 hour.`,
    html: `
      <p>Hi ${user.firstName},</p>
      <p>Reset your HostelHub password using this link:</p>
      <p><a href="${resetLink}">Reset password</a></p>
      <p>This link expires in 1 hour.</p>
    `
  });

  return resetLink;
};

exports.getSignup = (req, res) => {
  res.render("auth/signup", {
    errors: [],
    oldInput: {}
  });
};

exports.postSignup = async (req, res) => {
  try {
    const firstName = (req.body.firstName || "").trim();
    const lastName = (req.body.lastName || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";
    const userType = req.body.userType === "owner" ? "owner" : "student";

    if (!firstName || !lastName || !email || !password) {
      return res.status(422).render("auth/signup", {
        errors: ["Please fill in all required fields."],
        oldInput: { firstName, lastName, email, userType }
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isEmailVerified === false) {
        await issueEmailVerificationOtp(existingUser);

        return res.render("auth/verify-otp", {
          errors: [],
          successMessage: "This account is not verified yet. We sent a new OTP to your email.",
          email
        });
      }

      return res.status(422).render("auth/signup", {
        errors: ["An account with this email already exists."],
        oldInput: { firstName, lastName, email, userType }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      userType,
      isEmailVerified: false
    });

    await issueEmailVerificationOtp(user);

    return res.render("auth/verify-otp", {
      errors: [],
      successMessage: "Account created. We sent a 6-digit OTP to your email.",
      email
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("auth/signup", {
      errors: ["Signup failed. Please try again."],
      oldInput: {
        firstName: req.body.firstName || "",
        lastName: req.body.lastName || "",
        email: req.body.email || "",
        userType: req.body.userType || "student"
      }
    });
  }
};

exports.getVerifyOtp = (req, res) => {
  res.render("auth/verify-otp", {
    errors: [],
    successMessage: "",
    email: req.query.email || ""
  });
};

exports.postVerifyOtp = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const otp = (req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(422).render("auth/verify-otp", {
        errors: ["Please enter your email and OTP."],
        successMessage: "",
        email
      });
    }

    const user = await User.findOne({
      email,
      emailVerificationToken: hashValue(otp),
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).render("auth/verify-otp", {
        errors: ["Invalid or expired OTP. Please request a new OTP."],
        successMessage: "",
        email
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.render("auth/login", {
      errors: [],
      successMessage: "Your email has been verified. You can now log in.",
      oldInput: { email: user.email }
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("auth/verify-otp", {
      errors: ["Could not verify your OTP. Please try again."],
      successMessage: "",
      email: req.body.email || ""
    });
  }
};

exports.postResendOtp = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const user = await User.findOne({ email });

    if (!user || user.isEmailVerified) {
      return res.render("auth/verify-otp", {
        errors: [],
        successMessage: "If this email needs verification, a new OTP has been sent.",
        email
      });
    }

    await issueEmailVerificationOtp(user);

    return res.render("auth/verify-otp", {
      errors: [],
      successMessage: "A new OTP has been sent to your email.",
      email
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("auth/verify-otp", {
      errors: ["Could not send a new OTP. Please try again."],
      successMessage: "",
      email: req.body.email || ""
    });
  }
};

exports.getLogin = (req, res) => {
  if (req.session.userId) {
    if (req.user && req.user.userType === "student") {
      return res.redirect("/hostels");
    }

    return res.redirect("/dashboard");
  }

  return res.render("auth/login", {
    errors: [],
    successMessage: "",
    oldInput: {}
  });
};

exports.postLogin = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(422).render("auth/login", {
        errors: ["Please enter both email and password."],
        successMessage: "",
        oldInput: { email }
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(422).render("auth/login", {
        errors: ["Invalid email or password."],
        successMessage: "",
        oldInput: { email }
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(422).render("auth/login", {
        errors: ["Invalid email or password."],
        successMessage: "",
        oldInput: { email }
      });
    }

    if (user.isEmailVerified === false) {
      await issueEmailVerificationOtp(user);

      return res.status(403).render("auth/verify-otp", {
        errors: [],
        successMessage: "Please verify your email first. We sent a new OTP to your email.",
        email
      });
    }

    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) {
        console.log("SESSION REGENERATE ERROR:", regenerateErr);
        return res.status(500).render("auth/login", {
          errors: ["Login failed. Please try again."],
          successMessage: "",
          oldInput: { email }
        });
      }

      req.session.userId = user._id.toString();

      req.session.save((saveErr) => {
        if (saveErr) {
          console.log("SESSION SAVE ERROR:", saveErr);
          return res.status(500).render("auth/login", {
            errors: ["Login failed. Please try again."],
            successMessage: "",
            oldInput: { email }
          });
        }

        if (user.userType === "student") {
          return res.redirect("/hostels");
        }

        return res.redirect("/dashboard");
      });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("auth/login", {
      errors: ["Something went wrong. Please try again."],
      successMessage: "",
      oldInput: {
        email: req.body.email || ""
      }
    });
  }
};

exports.getForgotPassword = (req, res) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }

  return res.render("auth/forgot-password", {
    errors: [],
    successMessage: "",
    oldInput: {},
    resetLink: ""
  });
};

exports.postForgotPassword = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(422).render("auth/forgot-password", {
        errors: ["Please enter your email address."],
        successMessage: "",
        oldInput: { email },
        resetLink: ""
      });
    }

    const successMessage = "If an account exists for that email, a password reset link has been sent.";
    const user = await User.findOne({ email });

    if (!user) {
      return res.render("auth/forgot-password", {
        errors: [],
        successMessage,
        oldInput: {},
        resetLink: ""
      });
    }

    const resetToken = createHashedToken();
    user.resetPasswordToken = resetToken.hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    const resetLink = await sendPasswordResetEmail(req, user, resetToken.rawToken);

    return res.render("auth/forgot-password", {
      errors: [],
      successMessage,
      oldInput: {},
      resetLink: process.env.NODE_ENV === "production" ? "" : resetLink
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("auth/forgot-password", {
      errors: ["Could not create a reset link. Please try again."],
      successMessage: "",
      oldInput: { email: req.body.email || "" },
      resetLink: ""
    });
  }
};

exports.getResetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).render("auth/reset-password", {
        errors: ["This reset link is invalid or has expired."],
        token: "",
        email: "",
        successMessage: ""
      });
    }

    return res.render("auth/reset-password", {
      errors: [],
      token: req.params.token,
      email: user.email,
      successMessage: ""
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("auth/reset-password", {
      errors: ["Could not open this reset link. Please try again."],
      token: "",
      email: "",
      successMessage: ""
    });
  }
};

exports.postResetPassword = async (req, res) => {
  try {
    const password = req.body.password || "";
    const confirmPassword = req.body.confirmPassword || "";
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).render("auth/reset-password", {
        errors: ["This reset link is invalid or has expired."],
        token: "",
        email: "",
        successMessage: ""
      });
    }

    if (password.length < 6) {
      return res.status(422).render("auth/reset-password", {
        errors: ["Password must be at least 6 characters long."],
        token: req.params.token,
        email: user.email,
        successMessage: ""
      });
    }

    if (password !== confirmPassword) {
      return res.status(422).render("auth/reset-password", {
        errors: ["Passwords do not match."],
        token: req.params.token,
        email: user.email,
        successMessage: ""
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.render("auth/reset-password", {
      errors: [],
      token: "",
      email: user.email,
      successMessage: "Your password has been updated. You can now log in."
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render("auth/reset-password", {
      errors: ["Could not update your password. Please try again."],
      token: req.params.token,
      email: "",
      successMessage: ""
    });
  }
};

exports.postLogout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
};
