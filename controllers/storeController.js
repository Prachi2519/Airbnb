const Home = require("../models/home");
const User = require("../models/user");
const Booking = require("../models/booking");
const {
  calculatePrice,
  eachNightKey,
  getBookedDateKeys,
  toDateOnly,
  validateBookingRequest,
} = require("../services/bookingService");

const renderData = (req, extra = {}) => ({
  isLoggedIn: req.isLoggedIn,
  user: req.session.user,
  errors: [],
  oldInput: {},
  ...extra,
});

const normalizeFilters = (query) => ({
  location: String(query.location || "").trim(),
  checkIn: String(query.checkIn || "").trim(),
  checkOut: String(query.checkOut || "").trim(),
  guests: String(query.guests || "").trim(),
  minPrice: String(query.minPrice || "").trim(),
  maxPrice: String(query.maxPrice || "").trim(),
  sort: String(query.sort || "recommended").trim(),
});

const buildHomeQuery = (filters) => {
  const query = { status: "active" };
  const guests = Number.parseInt(filters.guests, 10);
  const minPrice = Number.parseFloat(filters.minPrice);
  const maxPrice = Number.parseFloat(filters.maxPrice);

  if (filters.location) {
    query.location = { $regex: filters.location, $options: "i" };
  }
  if (Number.isFinite(guests) && guests > 0) {
    query.maxGuests = { $gte: guests };
  }
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    query.price = {};
    if (Number.isFinite(minPrice)) query.price.$gte = minPrice;
    if (Number.isFinite(maxPrice)) query.price.$lte = maxPrice;
  }

  return query;
};

const sortFor = (sort) => {
  if (sort === "price-low") return { price: 1 };
  if (sort === "price-high") return { price: -1 };
  if (sort === "rating") return { rating: -1 };
  return { rating: -1, createdAt: -1 };
};

exports.getIndex = async (req, res, next) => {
  try {
    const registeredHomes = await Home.find({ status: "active" })
      .sort({ rating: -1, createdAt: -1 })
      .limit(6)
      .populate("host", "firstName lastName")
      .lean();

    res.render(
      "store/index",
      renderData(req, {
        registeredHomes,
        pageTitle: "StayNest | Curated homes",
        currentPage: "index",
        filters: normalizeFilters(req.query),
      }),
    );
  } catch (error) {
    next(error);
  }
};

exports.getHomes = async (req, res, next) => {
  try {
    const filters = normalizeFilters(req.query);
    let homes = await Home.find(buildHomeQuery(filters))
      .sort(sortFor(filters.sort))
      .populate("host", "firstName lastName")
      .lean();

    const checkIn = toDateOnly(filters.checkIn);
    const checkOut = toDateOnly(filters.checkOut);
    if (checkIn && checkOut && checkOut > checkIn) {
      const selectedKeys = eachNightKey(checkIn, checkOut);
      const availabilityPairs = await Promise.all(
        homes.map(async (home) => {
          const bookedDates = await getBookedDateKeys(home._id);
          const unavailable = new Set([...(home.blockedDates || []), ...bookedDates]);
          return [home, selectedKeys.every((key) => !unavailable.has(key))];
        }),
      );
      homes = availabilityPairs.filter(([, available]) => available).map(([home]) => home);
    }

    res.render(
      "store/home-list",
      renderData(req, {
        registeredHomes: homes,
        pageTitle: "Explore Homes",
        currentPage: "Home",
        filters,
      }),
    );
  } catch (error) {
    next(error);
  }
};

exports.getBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({
      guest: req.session.user._id,
      status: "confirmed",
      checkIn: { $exists: true },
      checkOut: { $exists: true },
    })
      .populate("home")
      .sort({ checkIn: 1 })
      .lean();

    res.render(
      "store/bookings",
      renderData(req, {
        bookings,
        pageTitle: "My Trips",
        currentPage: "bookings",
      }),
    );
  } catch (error) {
    next(error);
  }
};

exports.postBookHome = async (req, res, next) => {
  try {
    if (!req.isLoggedIn) {
      return res.redirect("/login");
    }

    const home = await Home.findOne({ _id: req.params.homeId, status: "active" }).lean();
    if (!home) {
      req.flash("error", "That stay is no longer available.");
      return res.redirect("/homes");
    }

    const validation = await validateBookingRequest({
      home,
      checkInValue: req.body.checkIn,
      checkOutValue: req.body.checkOut,
      guestCountValue: req.body.guestCount,
    });

    if (validation.errors.length > 0) {
      const bookedDates = await getBookedDateKeys(home._id);
      return res.status(422).render(
        "store/home-detail",
        renderData(req, {
          home,
          pageTitle: home.houseName,
          currentPage: "Home",
          bookedDates,
          unavailableDates: [...new Set([...(home.blockedDates || []), ...bookedDates])],
          errors: validation.errors,
          oldInput: req.body,
        }),
      );
    }

    const price = calculatePrice(home.price, validation.nights);
    await Booking.create({
      home: home._id,
      guest: req.session.user._id,
      checkIn: validation.checkIn,
      checkOut: validation.checkOut,
      nights: validation.nights,
      guestCount: validation.guestCount,
      pricePerNight: price.pricePerNight,
      fees: price.fees,
      totalPrice: price.totalPrice,
      status: "confirmed",
    });

    req.flash("success", "Your stay is booked. Trip details are ready below.");
    res.redirect("/bookings");
  } catch (error) {
    if (error.code === 11000) {
      req.flash("error", "You already have this booking.");
      return res.redirect("/bookings");
    }
    next(error);
  }
};

exports.getFavouriteList = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user._id).populate("favourites").lean();
    res.render(
      "store/favourite-list",
      renderData(req, {
        favouriteHomes: user?.favourites || [],
        pageTitle: "Saved Homes",
        currentPage: "favourites",
      }),
    );
  } catch (error) {
    next(error);
  }
};

exports.postAddToFavourite = async (req, res, next) => {
  try {
    if (!req.isLoggedIn) {
      return res.redirect("/login");
    }

    await User.findByIdAndUpdate(req.session.user._id, {
      $addToSet: { favourites: req.body.id },
    });

    req.flash("success", "Saved to your favourites.");
    res.redirect("/favourites");
  } catch (error) {
    next(error);
  }
};

exports.postRemoveFromFavourite = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.session.user._id, {
      $pull: { favourites: req.params.homeId },
    });

    req.flash("success", "Removed from saved homes.");
    res.redirect("/favourites");
  } catch (error) {
    next(error);
  }
};

exports.getHomeDetails = async (req, res, next) => {
  try {
    const home = await Home.findOne({ _id: req.params.homeId, status: "active" })
      .populate("host", "firstName lastName")
      .lean();

    if (!home) {
      return res.redirect("/homes");
    }

    const bookedDates = await getBookedDateKeys(home._id);
    const unavailableDates = [...new Set([...(home.blockedDates || []), ...bookedDates])];

    res.render(
      "store/home-detail",
      renderData(req, {
        home,
        bookedDates,
        unavailableDates,
        pageTitle: home.houseName,
        currentPage: "Home",
        oldInput: {
          checkIn: req.query.checkIn || "",
          checkOut: req.query.checkOut || "",
          guestCount: req.query.guests || "1",
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};
