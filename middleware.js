function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();

  // ✅ Only store returnTo if it’s not already set
  if (!req.session.returnTo) {
    req.session.returnTo = req.originalUrl;
  }

  return res.redirect("/auth/login");
}


function isAdmin(req, res, next) {
  const user = req.session.user || req.user;
  if (user && user.isAdmin) return next();
  res.redirect("/listings");
}

module.exports = { isLoggedIn, isAdmin };
