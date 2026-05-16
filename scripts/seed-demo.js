const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/user");
const Home = require("../models/home");
const Booking = require("../models/booking");

const DB_PATH = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/airbnb";

const addDays = (days) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const demoUsers = {
  host: {
    firstName: "Aarav",
    lastName: "Host",
    email: "host@staynest.test",
    password: "Host@12345",
    userType: "host",
  },
  guest: {
    firstName: "Mira",
    lastName: "Guest",
    email: "guest@staynest.test",
    password: "Guest@12345",
    userType: "guest",
  },
};

const amenities = {
  luxe: ["Wifi", "Pool", "Kitchen", "Air conditioning", "Dedicated workspace", "Free parking"],
  mountain: ["Wifi", "Mountain view", "Bonfire", "Heater", "Kitchen", "Balcony"],
  city: ["Wifi", "Elevator", "Workspace", "Air conditioning", "Washer", "Security"],
  beach: ["Wifi", "Beach access", "Pool", "Kitchen", "Patio", "Air conditioning"],
};

const rules = ["No smoking", "No parties", "Respect quiet hours", "Government ID required at check-in"];

const listings = [
  {
    houseName: "Glasshouse Villa With Private Pool",
    location: "Goa, India",
    price: 12999,
    rating: 4.95,
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 4,
    images: ["/images/house1.png", "/images/house2.png", "/images/house3.png"],
    amenities: amenities.luxe,
    blockedDates: [addDays(4), addDays(5), addDays(12)],
    description:
      "A premium glass-front villa built for slow mornings, poolside evenings, and group stays with generous indoor-outdoor living.",
  },
  {
    houseName: "Cliffside A-Frame Retreat",
    location: "Manali, India",
    price: 8499,
    rating: 4.88,
    maxGuests: 5,
    bedrooms: 2,
    bathrooms: 2,
    images: ["/images/house2.png", "/images/house4.png", "/images/house6.png"],
    amenities: amenities.mountain,
    blockedDates: [addDays(8), addDays(9)],
    description:
      "A warm timber A-frame with valley views, a private balcony, reliable wifi, and cozy spaces for mountain workations.",
  },
  {
    houseName: "Heritage Courtyard Haveli",
    location: "Jaipur, India",
    price: 6799,
    rating: 4.82,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 3,
    images: ["/images/house3.png", "/images/house5.png", "/images/house7.png"],
    amenities: ["Wifi", "Courtyard", "Breakfast", "Air conditioning", "Kitchen", "Heritage interiors"],
    blockedDates: [addDays(15), addDays(16)],
    description:
      "A restored haveli with a quiet courtyard, hand-finished details, and easy access to Jaipur's old city landmarks.",
  },
  {
    houseName: "Minimal City Studio Near Metro",
    location: "Bengaluru, India",
    price: 3299,
    rating: 4.7,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    images: ["/images/house4.png", "/images/house8.png"],
    amenities: amenities.city,
    blockedDates: [addDays(2)],
    description:
      "A sharp, compact studio for solo travelers and couples who want fast wifi, a workspace, and smooth city access.",
  },
  {
    houseName: "Beachfront Casa With Sunset Deck",
    location: "Alibaug, India",
    price: 9999,
    rating: 4.91,
    maxGuests: 7,
    bedrooms: 3,
    bathrooms: 3,
    images: ["/images/house5.png", "/images/house1.png", "/images/house8.png"],
    amenities: amenities.beach,
    blockedDates: [addDays(6), addDays(7), addDays(20)],
    description:
      "A breezy coastal home with a sunset deck, open kitchen, and direct access to quiet stretches of sand.",
  },
  {
    houseName: "Tea Estate Bungalow",
    location: "Munnar, India",
    price: 7499,
    rating: 4.86,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    images: ["/images/house6.png", "/images/house2.png", "/images/house7.png"],
    amenities: ["Wifi", "Tea garden view", "Breakfast", "Heater", "Kitchen", "Guided walk"],
    blockedDates: [addDays(10), addDays(11)],
    description:
      "A calm bungalow inside rolling tea gardens, designed for slow travel, family stays, and cool-weather mornings.",
  },
  {
    houseName: "Lakeview Penthouse With Workspace",
    location: "Udaipur, India",
    price: 8999,
    rating: 4.89,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    images: ["/images/house7.png", "/images/house3.png", "/images/house4.png"],
    amenities: ["Wifi", "Lake view", "Workspace", "Terrace", "Air conditioning", "Kitchen"],
    blockedDates: [addDays(13)],
    description:
      "A refined penthouse overlooking the lake with a terrace, work-ready setup, and walkable dining nearby.",
  },
  {
    houseName: "Forest Pool Cottage",
    location: "Coorg, India",
    price: 5999,
    rating: 4.78,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    images: ["/images/house8.png", "/images/house5.png", "/images/house6.png"],
    amenities: ["Wifi", "Private pool", "Forest view", "Kitchen", "Patio", "Breakfast"],
    blockedDates: [addDays(3), addDays(18)],
    description:
      "A private cottage tucked into dense greenery with a plunge pool, patio dining, and quiet mornings.",
  },
];

const upsertUser = async (user) => {
  const password = await bcrypt.hash(user.password, 12);
  return User.findOneAndUpdate(
    { email: user.email },
    { ...user, password },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
};

const seed = async () => {
  await mongoose.connect(DB_PATH, { serverSelectionTimeoutMS: 15000 });

  const host = await upsertUser(demoUsers.host);
  await upsertUser(demoUsers.guest);

  const seededNames = listings.map((listing) => listing.houseName);
  const existingSeededHomes = await Home.find({ houseName: { $in: seededNames } }).select("_id");
  await Booking.deleteMany({ home: { $in: existingSeededHomes.map((home) => home._id) } });

  for (const listing of listings) {
    await Home.findOneAndUpdate(
      { houseName: listing.houseName },
      {
        ...listing,
        photo: listing.images[0],
        houseRules: rules,
        status: "active",
        host: host._id,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  const totalHomes = await Home.countDocuments({ status: "active" });
  console.log(`Seed complete: ${listings.length} demo listings ready. Active listings in DB: ${totalHomes}`);
  console.log("Demo host: host@staynest.test / Host@12345");
  console.log("Demo guest: guest@staynest.test / Guest@12345");
};

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
