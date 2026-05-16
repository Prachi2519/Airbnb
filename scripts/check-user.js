const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("../models/user");

const DB_PATH = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/airbnb";
const [, , emailArg, passwordArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.log("Usage: node scripts/check-user.js email@example.com password");
  process.exit(1);
}

const email = String(emailArg).trim().toLowerCase();
const password = String(passwordArg).trim();

mongoose
  .connect(DB_PATH, { serverSelectionTimeoutMS: 10000 })
  .then(async () => {
    const users = await User.find({
      email: { $in: [emailArg, email, emailArg.trim()] },
    }).lean();

    if (users.length === 0) {
      console.log("No user found for that email.");
      return;
    }

    for (const user of users) {
      const passwordMatches = await bcrypt.compare(password, user.password);
      console.log({
        email: user.email,
        userType: user.userType,
        passwordMatches,
      });
    }
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
