const express = require("express");
const router = express.Router();
const emailSubscriberController = require("../Controllers/EmailSubscriprionController");
const { verifyAccessToken, isAdmin } = require("../Helpers/jwtHelper");

router.post("/", emailSubscriberController.subscribeToEmail);
router.get("/", [verifyAccessToken, isAdmin], emailSubscriberController.getAllEmailSubscribers);

module.exports = router;
