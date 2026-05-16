// External Module
const express = require("express");
const storeRouter = express.Router();

// Local Module
const storeController = require("../controllers/storeController");

const requireAuth = (req, res, next) => {
  if (!req.isLoggedIn) {
    return res.redirect("/login");
  }
  next();
};

storeRouter.get("/", storeController.getIndex);
storeRouter.get("/homes", storeController.getHomes);
storeRouter.get("/bookings", requireAuth, storeController.getBookings);
storeRouter.post("/bookings/:homeId", requireAuth, storeController.postBookHome);
storeRouter.get("/favourites", requireAuth, storeController.getFavouriteList);

storeRouter.get("/homes/:homeId", storeController.getHomeDetails);
storeRouter.post("/favourites", requireAuth, storeController.postAddToFavourite);
storeRouter.post(
  "/favourites/delete/:homeId",
  requireAuth,
  storeController.postRemoveFromFavourite,
);

module.exports = storeRouter;
