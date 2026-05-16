const mongoose = require("mongoose");

const bookingSchema = mongoose.Schema(
  {
    home: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Home",
      required: true,
      index: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    checkIn: {
      type: Date,
      required: true,
      index: true,
    },
    checkOut: {
      type: Date,
      required: true,
      index: true,
    },
    nights: {
      type: Number,
      required: true,
      min: 1,
    },
    guestCount: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 1,
    },
    fees: {
      cleaning: { type: Number, default: 0 },
      service: { type: Number, default: 0 },
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
  },
  { timestamps: true },
);

bookingSchema.index({ home: 1, status: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ guest: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);
