const Booking = require("../models/booking");

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toKey = (date) => date.toISOString().slice(0, 10);

const today = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const eachNightKey = (checkIn, checkOut) => {
  const keys = [];
  for (let time = checkIn.getTime(); time < checkOut.getTime(); time += MS_PER_DAY) {
    keys.push(toKey(new Date(time)));
  }
  return keys;
};

const nightsBetween = (checkIn, checkOut) => Math.round((checkOut - checkIn) / MS_PER_DAY);

const calculatePrice = (pricePerNight, nights) => {
  const subtotal = pricePerNight * nights;
  const cleaning = Math.max(499, Math.round(pricePerNight * 0.08));
  const service = Math.round(subtotal * 0.12);
  return {
    pricePerNight,
    nights,
    subtotal,
    fees: { cleaning, service },
    totalPrice: subtotal + cleaning + service,
  };
};

const getBookedDateKeys = async (homeId, excludeBookingId = null) => {
  const query = { home: homeId, status: "confirmed" };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };

  const bookings = await Booking.find(query).select("checkIn checkOut").lean();
  return bookings.flatMap((booking) => eachNightKey(booking.checkIn, booking.checkOut));
};

const validateBookingRequest = async ({ home, checkInValue, checkOutValue, guestCountValue }) => {
  const errors = [];
  const checkIn = toDateOnly(checkInValue);
  const checkOut = toDateOnly(checkOutValue);
  const guestCount = Number.parseInt(guestCountValue, 10);

  if (!checkIn) errors.push("Choose a valid check-in date.");
  if (!checkOut) errors.push("Choose a valid check-out date.");
  if (!Number.isFinite(guestCount) || guestCount < 1) errors.push("Guest count must be at least 1.");
  if (Number.isFinite(guestCount) && guestCount > home.maxGuests) {
    errors.push(`This stay allows up to ${home.maxGuests} guests.`);
  }

  if (checkIn && checkOut) {
    if (checkIn < today()) errors.push("Check-in cannot be in the past.");
    if (checkOut <= checkIn) errors.push("Check-out must be after check-in.");
  }

  if (errors.length > 0) {
    return { errors, checkIn, checkOut, guestCount };
  }

  const selectedKeys = eachNightKey(checkIn, checkOut);
  const bookedKeys = await getBookedDateKeys(home._id);
  const unavailable = new Set([...(home.blockedDates || []), ...bookedKeys]);
  const conflicts = selectedKeys.filter((key) => unavailable.has(key));

  if (conflicts.length > 0) {
    errors.push("Those dates are unavailable. Please choose another stay window.");
  }

  return {
    errors,
    checkIn,
    checkOut,
    guestCount,
    nights: nightsBetween(checkIn, checkOut),
    selectedKeys,
  };
};

module.exports = {
  calculatePrice,
  eachNightKey,
  getBookedDateKeys,
  nightsBetween,
  toDateOnly,
  toKey,
  today,
  validateBookingRequest,
};
