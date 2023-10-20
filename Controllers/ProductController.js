const Product = require("../Models/ProductModel");
const Review = require("../Models/ReviewModel");
const {
  insertProductSchema,
} = require("../Validators/ProductSchemaValidation");
const { ReviewSchema } = require("../Validators/ReviewSchemaValidation");
const createError = require("http-errors");
const ObjectId = require("mongoose").Types.ObjectId;

module.exports = {
  //* Used to create new base product,this is Admin Only API
  insertProduct: async (req, res, next) => {
    try {
      const validated = await insertProductSchema.validateAsync(req.body);
      const product = new Product(validated);
      const savedProduct = await product.save();
      res.status(201).json({
        success: true,
        message: `${savedProduct.name} created`,
      });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },
  insertProductBatch: async (req, res, next) => {
    try {
      let data = [];
      req.body.forEach(async (e) => {
        data.push(e);
      });
      await Product.insertMany(data)
        .then(function () {
          console.log("Data inserted"); // Success
          res.send({
            status: true,
            message: "Data inserted",
          });
        })
        .catch(function (error) {
          console.log(error); // Failure
        });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  //* Used to update base product information, this is Admin only
  updateProduct: async (req, res, next) => {
    try {
      const updateProduct = await Product.findByIdAndUpdate(
        {
          _id: req.params.id,
        },
        {
          $set: req.body,
        },
        {
          new: true,
        }
      );

      if (!updateProduct)
        throw createError.NotFound(
          `Product not found with ID : ${req.params.id}`
        );

      res.status(201).json({
        success: true,
        message: updateProduct,
      });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  //* Used to get details of single Product by passing SKU ID (SKU ID is passed because we display product and SKU combination in all product so when user clicks on perticular product he should be getting product with that particular SKU) and related SKUs are added to display suggestions
  getProductDetails: async (req, res, next) => {
    try {
      const productId = req.params.id;
      const result = await Product.aggregate([
        {
          $match: { _id: ObjectId(productId) },
        },
        {
          $lookup: {
            from: "reviews", // The name of the reviews collection
            localField: "_id",
            foreignField: "productId",
            as: "reviews",
          },
        },
      ]);

      if (result.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      const productWithReviews = result[0];
      res.status(200).json(productWithReviews);
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  //* Used to submit review for a product SKU
  createProductReview: async (req, res, next) => {
    try {
      const validated = await ReviewSchema.validateAsync(req.body);

      validated.user = req.user._id;
      validated.name = req.user.name;
      const product = await Product.findById(validated.productId);

      const review = await Review.findOneAndUpdate(
        {
          productId: validated.productId,
          user: validated.user,
        },
        {
          $set: {
            rating: validated.rating,
            comment: validated.comment,
            name: validated.name,
          },
        },
        { upsert: true, new: true }
      ).lean();

      const reviews = await Review.find({
        productId: validated.productId,
      }).lean();

      delete review.__v;
      delete review._id;

      let avg = 0;

      reviews.forEach((rev) => {
        avg += rev.rating;
      });
      product.rating = avg / reviews.length;
      product.numOfReviews = reviews.length;
      await product.save();
      res.json({
        success: true,
        message: "Review submitted",
      });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  //* Get all products filtered by his city
  getProducts: async (req, res, next) => {
    try {
      const productsWithReviews = await Product.aggregate([
        {
          $lookup: {
            from: "reviews", // The name of the reviews collection
            localField: "_id",
            foreignField: "productId",
            as: "reviews",
          },
        },
      ]);

      res.status(200).json(productsWithReviews);
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  //* Used to explore Products without logging-in & all the prices shown are based on KOLHAPUR CITY
  exploreProducts: async (req, res, next) => {
    try {
      const productsWithReviews = await Product.aggregate([
        {
          $lookup: {
            from: "reviews", // The name of the reviews collection
            localField: "_id",
            foreignField: "productId",
            as: "reviews",
          },
        },
      ]);

      res.status(200).json(productsWithReviews);
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  //* Used to explore details of single product without logging-in &  price shown is based on KOLHAPUR CITY
  exploreProductDetails: async (req, res, next) => {
    try {
      const productId = req.params.id;
      const result = await Product.aggregate([
        {
          $match: { _id: mongoose.Types.ObjectId(productId) },
        },
        {
          $lookup: {
            from: "reviews", // The name of the reviews collection
            localField: "_id",
            foreignField: "productId",
            as: "reviews",
          },
        },
      ]);

      if (result.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      const productWithReviews = result[0];
      res.status(200).json(productWithReviews);
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },
};
