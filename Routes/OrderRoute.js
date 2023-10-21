const express = require("express");
const router = express.Router();

const orderController = require("../Controllers/OrderController");
const { verifyAccessToken, isAdmin } = require("../Helpers/jwtHelper");

router.get("/", orderController.getUserOrders);
router.get("/:id", orderController.getOrderDetails);
router.put("/", orderController.updateOrderStatus);
router.get(
  "/admin/all",
  [verifyAccessToken, isAdmin],
  orderController.getAllOrders
);
module.exports = router;
