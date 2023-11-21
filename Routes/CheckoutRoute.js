const express = require("express");
const router = express.Router();
const checkoutController = require("../Controllers/CheckoutController");
const { verifyAccessToken } = require("../Helpers/jwtHelper");

router.post(
  "/create-payment-intent",
  [verifyAccessToken],
  checkoutController.checkout
);

router.post(
  "/create-payment-intent/session",
  [verifyAccessToken],
  checkoutController.sessionCheckout
);

router.get("/config", [verifyAccessToken], checkoutController.config);
router.get("/config/session", [verifyAccessToken], checkoutController.config);

module.exports = router;
