const Home = require("../models/home");
const Booking = require("../models/booking");
const fs = require("fs");
const {
  buildListingPayload,
  getUploadPaths,
  parseDateList,
  validateListing,
} = require("../services/listingService");

const renderData = (req, extra = {}) => ({
  isLoggedIn: req.isLoggedIn,
  user: req.session.user,
  errors: [],
  oldInput: {},
  ...extra,
});

const removeUploads = (paths) => {
  paths
    .filter((item) => item?.startsWith("/uploads/"))
    .forEach((item) => fs.unlink(item.replace("/uploads/", "uploads/"), () => {}));
};

exports.getAddHome = (req, res) => {
  res.render(
    "host/edit-home",
    renderData(req, {
      pageTitle: "Add Listing",
      currentPage: "addHome",
      editing: false,
    }),
  );
};

exports.getEditHome = async (req, res, next) => {
  try {
    const home = await Home.findOne({ _id: req.params.homeId, host: req.session.user._id }).lean();

    if (!home) {
      req.flash("error", "Listing not found.");
      return res.redirect("/host/host-home-list");
    }

    res.render(
      "host/edit-home",
      renderData(req, {
        home,
        pageTitle: "Edit Listing",
        currentPage: "host-homes",
        editing: true,
      }),
    );
  } catch (error) {
    next(error);
  }
};

exports.getHostHomes = async (req, res, next) => {
  try {
    const registeredHomes = await Home.find({ host: req.session.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const homeIds = registeredHomes.map((home) => home._id);
    const bookings = await Booking.find({
      home: { $in: homeIds },
      status: "confirmed",
      checkIn: { $exists: true },
      checkOut: { $gte: new Date() },
    })
      .populate("home")
      .populate("guest", "firstName lastName email")
      .sort({ checkIn: 1 })
      .lean();

    const stats = {
      activeListings: registeredHomes.filter((home) => home.status === "active").length,
      upcomingBookings: bookings.length,
      blockedDates: registeredHomes.reduce((total, home) => total + (home.blockedDates?.length || 0), 0),
    };

    res.render(
      "host/host-home-list",
      renderData(req, {
        registeredHomes,
        bookings,
        stats,
        pageTitle: "Host Dashboard",
        currentPage: "host-homes",
      }),
    );
  } catch (error) {
    next(error);
  }
};

exports.postAddHome = async (req, res, next) => {
  const uploadedImages = getUploadPaths(req);
  const payload = buildListingPayload(req.body, [], uploadedImages);
  const errors = validateListing(payload, true);

  if (errors.length > 0) {
    removeUploads(uploadedImages);
    return res.status(422).render(
      "host/edit-home",
      renderData(req, {
        pageTitle: "Add Listing",
        currentPage: "addHome",
        editing: false,
        errors,
        oldInput: req.body,
      }),
    );
  }

  try {
    await Home.create({
      ...payload,
      host: req.session.user._id,
    });

    req.flash("success", "Listing published successfully.");
    res.redirect("/host/host-home-list");
  } catch (error) {
    next(error);
  }
};

exports.postEditHome = async (req, res, next) => {
  try {
    const home = await Home.findOne({ _id: req.body.id, host: req.session.user._id });
    if (!home) {
      req.flash("error", "Listing not found.");
      return res.redirect("/host/host-home-list");
    }

    const uploadedImages = getUploadPaths(req);
    const existingImages = home.images?.length ? home.images : [home.photo].filter(Boolean);
    const payload = buildListingPayload(req.body, existingImages, uploadedImages);
    const errors = validateListing(payload, false);

    if (errors.length > 0) {
      removeUploads(uploadedImages);
      return res.status(422).render(
        "host/edit-home",
        renderData(req, {
          pageTitle: "Edit Listing",
          currentPage: "host-homes",
          editing: true,
          errors,
          oldInput: req.body,
          home: { ...home.toObject(), ...payload, _id: home._id },
        }),
      );
    }

    if (uploadedImages.length > 0) {
      removeUploads(existingImages);
    }

    Object.assign(home, payload);
    await home.save();
    req.flash("success", "Listing updated successfully.");
    res.redirect("/host/host-home-list");
  } catch (error) {
    next(error);
  }
};

exports.postUpdateCalendar = async (req, res, next) => {
  try {
    const home = await Home.findOne({ _id: req.params.homeId, host: req.session.user._id });
    if (!home) {
      req.flash("error", "Listing not found.");
      return res.redirect("/host/host-home-list");
    }

    home.blockedDates = parseDateList(req.body.blockedDates);
    await home.save();
    req.flash("success", "Availability calendar updated.");
    res.redirect("/host/host-home-list");
  } catch (error) {
    next(error);
  }
};

exports.postDeleteHome = async (req, res, next) => {
  try {
    const upcomingBookings = await Booking.countDocuments({
      home: req.params.homeId,
      status: "confirmed",
      checkIn: { $exists: true },
      checkOut: { $gte: new Date() },
    });

    if (upcomingBookings > 0) {
      req.flash("error", "This listing has upcoming bookings. Archive it or cancel bookings before deleting.");
      return res.redirect("/host/host-home-list");
    }

    const home = await Home.findOneAndDelete({
      _id: req.params.homeId,
      host: req.session.user._id,
    });

    if (home) {
      removeUploads(home.images?.length ? home.images : [home.photo]);
    }

    req.flash("success", "Listing deleted.");
    res.redirect("/host/host-home-list");
  } catch (error) {
    next(error);
  }
};
