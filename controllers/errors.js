exports.pageNotFound = (req, res, next) => {
  res.status(404).render("404", {
    pageTitle: "Page Not Found",
    currentPage: "404",
    isLoggedIn: req.isLoggedIn,
    user: req.session.user,
  });
};

exports.serverError = (error, req, res, next) => {
  console.error(error);
  res.status(500).render("404", {
    pageTitle: "Something went wrong",
    currentPage: "500",
    isLoggedIn: req.isLoggedIn,
    user: req.session.user,
  });
};
