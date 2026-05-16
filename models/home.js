const mongoose = require("mongoose");

const homeSchema = mongoose.Schema(
  {
    houseName: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 1,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 4.8,
    },
    photo: String,
    images: [String],
    description: {
      type: String,
      trim: true,
    },
    amenities: [String],
    houseRules: [String],
    maxGuests: {
      type: Number,
      min: 1,
      default: 2,
    },
    bedrooms: {
      type: Number,
      min: 0,
      default: 1,
    },
    bathrooms: {
      type: Number,
      min: 0,
      default: 1,
    },
    blockedDates: [
      {
        type: String,
        match: /^\d{4}-\d{2}-\d{2}$/,
      },
    ],
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "active",
      index: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  { timestamps: true },
);

homeSchema.index({ location: 1, price: 1, rating: -1, status: 1 });
homeSchema.index({ maxGuests: 1, status: 1 });

// homeSchema.pre('findOneAndDelete', async function(next) {
//   console.log('Came to pre hook while deleting a home');
//   const homeId = this.getQuery()._id;
//   await favourite.deleteMany({houseId: homeId});
//   next();
// });

module.exports = mongoose.model("Home", homeSchema);
