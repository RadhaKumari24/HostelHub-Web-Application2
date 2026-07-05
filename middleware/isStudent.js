module.exports = (req, res, next) => {
  if (!req.user || req.user.userType !== "student") {
    return res.redirect("/dashboard");
  }

  next();
};
