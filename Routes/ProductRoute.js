const express = require("express");
const router = express.Router();
const productController = require("../Controllers/ProductController");
const { verifyAccessToken, isAdmin } = require("../Helpers/jwtHelper");

router.get("/all", [verifyAccessToken], productController.getProducts);
router.get("/explore/all", productController.exploreProducts);
router.get("/explore/:id", productController.exploreProductDetails);
router.get("/:id", productController.getProductDetails);
router.put(
  "/review",
  [verifyAccessToken],
  productController.createProductReview
);
router.post(
  "/admin",
  [verifyAccessToken, isAdmin],
  productController.insertProduct
);
router.post(
  "/admin/batch",
  [verifyAccessToken, isAdmin],
  productController.insertProductBatch
);
router.put(
  "/admin/:id",
  [verifyAccessToken, isAdmin],
  productController.updateProduct
);
module.exports = router;
