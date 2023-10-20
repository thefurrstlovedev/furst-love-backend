const express = require("express");
const router = express.Router();
const authController = require("../Controllers/AuthController");
const { verifyAccessToken, isAdmin } = require("../Helpers/jwtHelper");

router.post("/register", authController.register); // Implemented

router.post("/login", authController.login); // Implemented

router.put("/add-address", [verifyAccessToken], authController.createAddress);

router.post("/refreshToken", authController.refreshToken);

router.post("/forgot", authController.forgotPassword);

router.post("/reset", authController.resetPassword);

router.post("/verify-otp", authController.verifyOTP);

router.post(
  "/register/admin",
  [verifyAccessToken, isAdmin],
  authController.registerAdmin
);

router.get("/admin", [verifyAccessToken, isAdmin], authController.getAllUsers);

router.delete(
  "/admin/:id",
  [verifyAccessToken, isAdmin],
  authController.deleteUser
);

router.get("/current-user", [verifyAccessToken], authController.getCurrentUser); // Implemented

module.exports = router;
