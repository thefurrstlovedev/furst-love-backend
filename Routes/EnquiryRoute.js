const express = require("express");
const router = express.Router();
const enquiryController = require("../Controllers/EnquiryController");
const { verifyAccessToken, isAdmin } = require("../Helpers/jwtHelper");

router.post("/", enquiryController.equire);
router.get("/", [verifyAccessToken, isAdmin], enquiryController.getAllEnquiries);

module.exports = router;
