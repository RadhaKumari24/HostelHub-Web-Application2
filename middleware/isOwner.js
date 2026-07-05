module.exports = (req, res, next) => {
  if (!req.user || req.user.userType !== "owner") {
    return res.redirect("/hostels");
  }
  next();
};
