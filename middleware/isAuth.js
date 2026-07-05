module.exports = (req, res, next) => {
  if (!req.session.userId || !req.user) {
    return res.redirect("/auth/login");
  }

  next();
};
