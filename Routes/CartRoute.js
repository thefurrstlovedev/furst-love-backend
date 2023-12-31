const express = require("express");
const router = express.Router();
const cartController = require("../Controllers/CartController");
const { verifyAccessToken } = require("../Helpers/jwtHelper");

router.get("/", [verifyAccessToken], cartController.getCartItemCount);
router.post("/", [verifyAccessToken], cartController.createCart);
router.post("/session/", cartController.createSesssionCart);
router.get("/session/:sid", cartController.getSessionCartItemCount);
router.post("/session/my-cart/", cartController.getSessionCart);
router.delete("/session/:sid/:id", cartController.removeFromSessionCart);
router.post("/my-cart/", [verifyAccessToken], cartController.getCart);
router.delete("/:id", [verifyAccessToken], cartController.removeFromCart);
router.put(
  "/:id/:quantity",
  [verifyAccessToken],
  cartController.updateCartItemCount
);

module.exports = router;
