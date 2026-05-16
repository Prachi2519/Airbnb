const path = require("path");
const fs = require("fs");
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const { default: mongoose } = require("mongoose");
const multer = require("multer");
const crypto = require("crypto");
const DB_PATH = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/airbnb";
const SESSION_SECRET =
  process.env.SESSION_SECRET || "dev-only-change-this-secret";
const PORT = process.env.PORT || 3004;

const storeRouter = require("./routes/storeRouter");
const hostRouter = require("./routes/hostRouter");
const authRouter = require("./routes/authRouter");
const rootDir = require("./utils/pathUtil");
const errorsController = require("./controllers/errors");

const app = express();
const uploadDir = path.join(rootDir, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

app.set("view engine", "ejs");
app.set("views", "views");
app.set("trust proxy", 1);

const store = new MongoDBStore({
  uri: DB_PATH,
  collection: "sessions",
});

store.on("error", (error) => {
  console.error("Session store error:", error);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9.-]/g, "-");
    cb(
      null,
      `${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${safeName}`,
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const multerOptions = {
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
};

app.use(express.urlencoded({ extended: false }));
app.use(
  multer(multerOptions).fields([
    { name: "photos", maxCount: 8 },
    { name: "photo", maxCount: 1 },
  ]),
);
app.use(express.static(path.join(rootDir, "public")));
app.use(
  "/uploads",
  express.static(uploadDir, { maxAge: "7d", immutable: true }),
);

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.use((req, res, next) => {
  req.isLoggedIn = Boolean(req.session.isLoggedIn);
  res.locals.isLoggedIn = req.isLoggedIn;
  res.locals.user = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  req.flash = (type, message) => {
    req.session.flash = { type, message };
  };
  res.locals.assetPath = (asset) => {
    if (!asset) return "";
    return asset.startsWith("/") ? asset : `/${asset.replace(/\\/g, "/")}`;
  };
  res.locals.formatDate = (date) =>
    new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
  res.locals.formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);
  next();
});

const requireAuth = (req, res, next) => {
  if (!req.isLoggedIn) {
    return res.redirect("/login");
  }
  next();
};

const requireHost = (req, res, next) => {
  if (!req.isLoggedIn) {
    return res.redirect("/login");
  }
  if (req.session.user?.userType !== "host") {
    return res.redirect("/homes");
  }
  next();
};

app.use(authRouter);
app.use(storeRouter);
app.use("/bookings", requireAuth);
app.use("/favourites", requireAuth);
app.use("/host", requireHost);
app.use("/host", hostRouter);

app.use(errorsController.pageNotFound);
app.use(errorsController.serverError);

mongoose
  .connect(DB_PATH, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log("Connected to Mongo");
    app.listen(PORT, () => {
      console.log(`Server running on address http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Error while connecting to Mongo: ", err);
    process.exit(1);
  });
