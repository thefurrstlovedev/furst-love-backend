const express = require("express");
const router = express.Router();
const couponController = require("../Controllers/CouponController");
const { verifyAccessToken, isAdmin } = require("../Helpers/jwtHelper");
router.post("/", [verifyAccessToken, isAdmin], couponController.insertCoupon);
router.delete(
  "/:id",
  [verifyAccessToken, isAdmin],
  couponController.deleteCoupon
);

router.get("/", [verifyAccessToken], couponController.getAllCoupons);

module.exports = router;
