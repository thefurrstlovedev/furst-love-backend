const express = require("express");
const router = express.Router();

const orderController = require("../Controllers/OrderController");
const { isAdmin } = require("../Helpers/jwtHelper");

router.get("/", orderController.getUserOrders);
router.get("/:id", orderController.getOrderDetails);
router.put("/", isAdmin, orderController.updateOrderStatus);
router.get("/admin/all", isAdmin, orderController.getAllOrders);
module.exports = router;
