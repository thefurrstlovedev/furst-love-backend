const express = require("express");
const router = express.Router();
const checkoutController = require("../Controllers/CheckoutController");
const { verifyAccessToken } = require("../Helpers/jwtHelper");

router.post(
  "/create-payment-intent",
  [verifyAccessToken],
  checkoutController.checkout
);

router.get("/config", [verifyAccessToken], checkoutController.config);

module.exports = router;
